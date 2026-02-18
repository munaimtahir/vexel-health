import {
  DocumentStatus,
  DocumentType,
  Prisma,
  StorageBackend,
} from '@prisma/client';
import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DomainException } from '../common/errors/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import {
  DOCUMENT_RENDER_QUEUE,
  type DocumentRenderQueue,
} from './document-render.queue';
import {
  DOCUMENT_STORAGE_ADAPTER,
  type DocumentStorageAdapter,
} from './document-storage.adapter';
import { canonicalizeJson, sha256HexFromText } from './document-hash.util';
import { type DocumentResponse, toDocumentResponse } from './documents.types';

const DEFAULT_PAYLOAD_VERSION = 1;
const DEFAULT_TEMPLATE_VERSION = 1;

type EncounterSummaryPayload = {
  encounterId: string;
  encounterCode: string;
  encounterType: string;
  encounterStatus: 'FINALIZED';
  patientId: string;
  patientRegNo: string;
  patientName: string;
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
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

    const encounter = await this.prisma.encounter.findFirst({
      where: {
        id: encounterId,
        tenantId,
      },
      include: {
        patient: true,
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

    const payload = this.buildEncounterSummaryPayload(encounter);
    const payloadCanonicalJson = canonicalizeJson(payload);
    const payloadHash = sha256HexFromText(payloadCanonicalJson);

    let enqueueJob = false;

    const document = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.document.findFirst({
        where: {
          tenantId,
          encounterId,
          documentType: DocumentType.ENCOUNTER_SUMMARY,
          templateVersion: DEFAULT_TEMPLATE_VERSION,
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
              documentType: DocumentType.ENCOUNTER_SUMMARY,
              status: DocumentStatus.QUEUED,
              payloadVersion: DEFAULT_PAYLOAD_VERSION,
              templateVersion: DEFAULT_TEMPLATE_VERSION,
              payloadJson: payload,
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
                documentType: DocumentType.ENCOUNTER_SUMMARY,
                templateVersion: DEFAULT_TEMPLATE_VERSION,
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
            payloadJson: payload,
            payloadHash,
            payloadVersion: DEFAULT_PAYLOAD_VERSION,
            templateVersion: DEFAULT_TEMPLATE_VERSION,
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

  private buildEncounterSummaryPayload(encounter: {
    id: string;
    encounterCode: string;
    type: string;
    patient: { id: string; regNo: string; name: string };
  }): EncounterSummaryPayload {
    return {
      encounterId: encounter.id,
      encounterCode: encounter.encounterCode,
      encounterType: encounter.type,
      // Normalized to keep payload stable after encounter transitions to DOCUMENTED.
      encounterStatus: 'FINALIZED',
      patientId: encounter.patient.id,
      patientRegNo: encounter.patient.regNo,
      patientName: encounter.patient.name,
    };
  }
}
