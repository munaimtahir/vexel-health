import { DocumentStatus, Prisma, StorageBackend } from '@prisma/client';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import { DomainException } from '../common/errors/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { buildPayloadForDocumentType } from './document-payload.builder';
import {
  DOCUMENT_RENDER_QUEUE,
  type DocumentRenderQueue,
} from './document-render.queue';
import {
  DOCUMENT_STORAGE_ADAPTER,
  type DocumentStorageAdapter,
} from './document-storage.adapter';
import { canonicalizeJson, sha256HexFromText } from './document-hash.util';
import {
  DEFAULT_REQUESTED_DOCUMENT_TYPE,
  isRequestedDocumentType,
  type RequestedDocumentType,
} from './document-types';
import { type DocumentResponse, toDocumentResponse } from './documents.types';

@Injectable({ scope: Scope.REQUEST })
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    @Inject(REQUEST) private readonly request: Request,
    @Inject(DOCUMENT_RENDER_QUEUE)
    private readonly queue: DocumentRenderQueue,
    @Inject(DOCUMENT_STORAGE_ADAPTER)
    private readonly storage: DocumentStorageAdapter,
  ) {}

  private get tenantId(): string {
    const tenantId = this.cls.get<string>('TENANT_ID');
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context missing');
    }

    return tenantId;
  }

  async queueEncounterDocument(encounterId: string): Promise<DocumentResponse> {
    const tenantId = this.tenantId;
    const requestedDocumentType = this.getRequestedDocumentTypeFromBody();

    const encounter = await this.prisma.encounter.findFirst({
      where: {
        id: encounterId,
        tenantId,
      },
      include: {
        patient: true,
        labPrep: true,
        radPrep: true,
        opdPrep: true,
        bbPrep: true,
        ipdPrep: true,
        labMain: true,
        radMain: true,
        opdMain: true,
        bbMain: true,
        ipdMain: true,
      },
    });

    if (!encounter) {
      throw new NotFoundException('Encounter not found');
    }

    if (encounter.status !== 'FINALIZED' && encounter.status !== 'DOCUMENTED') {
      throw new DomainException(
        'ENCOUNTER_STATE_INVALID',
        'Encounter must be FINALIZED before document generation',
      );
    }

    const builtPayload = buildPayloadForDocumentType({
      encounter,
      requestedDocumentType,
    });
    const payload = builtPayload.payload;
    const payloadCanonicalJson = canonicalizeJson(payload);
    const payloadHash = sha256HexFromText(payloadCanonicalJson);

    let enqueueJob = false;

    const document = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.document.findFirst({
        where: {
          tenantId,
          encounterId,
          documentType: builtPayload.storedDocumentType,
          templateVersion: builtPayload.templateVersion,
          payloadHash,
        },
      });

      if (!existing) {
        enqueueJob = true;
        try {
          return await tx.document.create({
            data: {
              tenantId,
              encounterId,
              documentType: builtPayload.storedDocumentType,
              status: DocumentStatus.QUEUED,
              payloadVersion: builtPayload.payloadVersion,
              templateVersion: builtPayload.templateVersion,
              payloadJson: payload as Prisma.InputJsonValue,
              payloadHash,
              storageBackend: StorageBackend.LOCAL,
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            const raced = await tx.document.findFirst({
              where: {
                tenantId,
                encounterId,
                documentType: builtPayload.storedDocumentType,
                templateVersion: builtPayload.templateVersion,
                payloadHash,
              },
            });
            if (raced) {
              enqueueJob = false;
              return raced;
            }
          }

          throw error;
        }
      }

      if (existing.status === DocumentStatus.FAILED) {
        enqueueJob = true;
        return tx.document.update({
          where: {
            id: existing.id,
          },
          data: {
            status: DocumentStatus.QUEUED,
            payloadJson: payload as Prisma.InputJsonValue,
            payloadHash,
            payloadVersion: builtPayload.payloadVersion,
            templateVersion: builtPayload.templateVersion,
            errorCode: null,
            errorMessage: null,
            renderedAt: null,
            pdfHash: null,
            storageKey: null,
          },
        });
      }

      return existing;
    });

    if (enqueueJob && document.status === DocumentStatus.QUEUED) {
      await this.queue.enqueueDocumentRender({
        tenantId,
        documentId: document.id,
      });
    }

    return toDocumentResponse(document);
  }

  async getDocumentById(documentId: string): Promise<DocumentResponse> {
    const document = await this.findDocumentByIdForTenant(this.tenantId, documentId);
    return toDocumentResponse(document);
  }

  async getDocumentFile(documentId: string): Promise<Buffer> {
    const tenantId = this.tenantId;
    const document = await this.findDocumentByIdForTenant(tenantId, documentId);

    if (document.status !== DocumentStatus.RENDERED || !document.storageKey) {
      throw new DomainException(
        'DOCUMENT_NOT_RENDERED',
        'Document is not rendered yet',
      );
    }

    return this.storage.getPdf({
      tenantId,
      storageKey: document.storageKey,
    });
  }

  private async findDocumentByIdForTenant(tenantId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  private getRequestedDocumentTypeFromBody(): RequestedDocumentType {
    const bodyValue = this.request.body as unknown;

    if (typeof bodyValue !== 'object' || bodyValue === null) {
      return DEFAULT_REQUESTED_DOCUMENT_TYPE;
    }

    const body = bodyValue as Record<string, unknown>;
    const rawDocumentType = body.documentType;

    if (rawDocumentType === undefined || rawDocumentType === null) {
      return DEFAULT_REQUESTED_DOCUMENT_TYPE;
    }

    if (!isRequestedDocumentType(rawDocumentType)) {
      throw new BadRequestException(
        'documentType must be a supported document type',
      );
    }

    return rawDocumentType;
  }
}
