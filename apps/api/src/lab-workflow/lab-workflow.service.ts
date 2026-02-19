import {
  DocumentStatus,
  LabOrderItemStatus,
  LabResultFlag,
  Prisma,
  type LabOrderItem,
  type LabResultItem,
  type LabTestDefinition,
  type LabTestParameter,
} from '@prisma/client';
import {
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
import { parseMockBearerTokenHeader } from '../common/auth/mock-token.util';
import { deriveLabEncounterStatus } from '../common/lab/lab-derived-status.util';
import { ensureSingleReferenceRangeMatch } from '../common/lab/lab-catalog-integrity.util';
import { DocumentsService } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddTestToEncounterDto } from './dto/add-test-to-encounter.dto';
import { EnterLabResultsDto } from './dto/enter-lab-results.dto';
import { VerifyLabResultsDto } from './dto/verify-lab-results.dto';

type LabOrderedTestResponse = {
  orderItem: LabOrderItem;
  test: LabTestDefinition;
  parameters: LabTestParameter[];
  results: LabResultItem[];
};

@Injectable({ scope: Scope.REQUEST })
export class LabWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly documentsService: DocumentsService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  private get tenantId(): string {
    const tenantId = this.cls.get<string>('TENANT_ID');
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context missing');
    }
    return tenantId;
  }

  async addTestToEncounter(encounterId: string, dto: AddTestToEncounterDto) {
    const tenantId = this.tenantId;
    const actor = this.getActorIdentity();
    const idempotencyKey = this.getIdempotencyKey();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const encounter = await this.assertLabEncounter(tx, encounterId);
        await this.assertLabPrepComplete(tx, encounter.id);

        if (encounter.status === 'FINALIZED' || encounter.status === 'DOCUMENTED') {
          throw new DomainException(
            'ENCOUNTER_STATE_INVALID',
            'Cannot add LAB tests after encounter finalization',
          );
        }

        const test = await tx.labTestDefinition.findFirst({
          where: {
            id: dto.testId,
            tenantId,
            active: true,
          },
        });

        if (!test) {
          throw new DomainException(
            'LAB_TEST_NOT_FOUND',
            'LAB test is not available for this tenant',
          );
        }

        try {
          const orderItem = await tx.labOrderItem.create({
            data: {
              tenantId,
              encounterId: encounter.id,
              testId: test.id,
              status: LabOrderItemStatus.ORDERED,
            },
          });

          const activeParameters = await tx.labTestParameter.findMany({
            where: {
              tenantId,
              testId: test.id,
              active: true,
            },
            orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
          });

          if (activeParameters.length > 0) {
            await tx.labResultItem.createMany({
              data: activeParameters.map((parameter) => ({
                tenantId,
                orderItemId: orderItem.id,
                parameterId: parameter.id,
                value: '',
                flag: LabResultFlag.UNKNOWN,
              })),
            });
          }

          await this.writeAuditEvent(tx, {
            actorUserId: actor,
            eventType: 'lims.order.created',
            entityType: 'lab_order_item',
            entityId: orderItem.id,
            payload: {
              tenant_id: tenantId,
              user_id: actor,
              encounter_id: encounter.id,
              order_id: orderItem.id,
              idempotency_key: idempotencyKey,
              correlation_id: this.getCorrelationId(),
              prev_status: null,
              next_status: LabOrderItemStatus.ORDERED,
              failure_reason_code: null,
              failure_reason_details: null,
            },
          });

          return this.buildOrderedTest(tx, orderItem.id);
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            throw new DomainException(
              'LAB_TEST_ALREADY_ORDERED',
              'This LAB test is already ordered for the encounter',
            );
          }

          throw error;
        }
      });
    } catch (error) {
      await this.writeAuditFailure({
        actorUserId: actor,
        eventType: 'lims.order.create_blocked',
        entityType: 'encounter',
        entityId: encounterId,
        encounterId,
        orderId: null,
        idempotencyKey,
        prevStatus: null,
        nextStatus: null,
        error,
      });
      throw error;
    }
  }

  async listEncounterLabTests(encounterId: string) {
    const tenantId = this.tenantId;

    return this.prisma.$transaction(async (tx) => {
      await this.assertLabEncounter(tx, encounterId);

      const orderItems = await tx.labOrderItem.findMany({
        where: {
          tenantId,
          encounterId,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
        },
      });

      const data = await Promise.all(
        orderItems.map((orderItem) => this.buildOrderedTest(tx, orderItem.id)),
      );

      return {
        data,
        total: data.length,
      };
    });
  }

  async enterResults(encounterId: string, dto: EnterLabResultsDto) {
    const tenantId = this.tenantId;
    const actor = this.getActorIdentity();
    const idempotencyKey = this.getIdempotencyKey();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const encounter = await this.assertLabEncounter(tx, encounterId);

        if (encounter.status !== 'IN_PROGRESS') {
          throw new DomainException(
            'INVALID_STATE',
            'LAB results can only be entered while encounter is IN_PROGRESS',
          );
        }

        const orderItem = await tx.labOrderItem.findFirst({
          where: {
            id: dto.orderItemId,
            tenantId,
            encounterId: encounter.id,
          },
        });

        if (!orderItem) {
          throw new NotFoundException('LAB order item not found');
        }

        if (orderItem.status === LabOrderItemStatus.VERIFIED) {
          throw new DomainException(
            'LAB_RESULTS_LOCKED',
            'Cannot edit results after verification',
          );
        }

        const activeParameters = await tx.labTestParameter.findMany({
          where: {
            tenantId,
            testId: orderItem.testId,
            active: true,
          },
        });
        const parameterById = new Map(activeParameters.map((item) => [item.id, item]));

        for (const result of dto.results) {
          const parameter = parameterById.get(result.parameterId);
          if (!parameter) {
            throw new DomainException(
              'LAB_PARAMETER_NOT_FOUND',
              'One or more parameters do not belong to the ordered test',
            );
          }

          const normalizedValue = result.value.trim();
          const valueNumeric = this.parseNumericValue(normalizedValue);
          const flag = this.computeFlag(parameter, valueNumeric);

          // Deterministic result upsert ensures idempotent retries do not duplicate values.
          await tx.labResultItem.upsert({
            where: {
              tenantId_orderItemId_parameterId: {
                tenantId,
                orderItemId: orderItem.id,
                parameterId: parameter.id,
              },
            },
            create: {
              tenantId,
              orderItemId: orderItem.id,
              parameterId: parameter.id,
              value: normalizedValue,
              valueNumeric,
              flag,
              enteredBy: actor,
              enteredAt: new Date(),
            },
            update: {
              value: normalizedValue,
              valueNumeric,
              flag,
              enteredBy: actor,
              enteredAt: new Date(),
              verifiedBy: null,
              verifiedAt: null,
            },
          });
        }

        const allValues = await tx.labResultItem.findMany({
          where: {
            tenantId,
            orderItemId: orderItem.id,
            parameterId: {
              in: activeParameters.map((parameter) => parameter.id),
            },
          },
        });

        const allRequiredValuesPresent = activeParameters.every((parameter) => {
          const value = allValues.find((item) => item.parameterId === parameter.id);
          return Boolean(value && value.value.trim().length > 0);
        });

        const nextStatus = allRequiredValuesPresent
          ? LabOrderItemStatus.RESULTS_ENTERED
          : LabOrderItemStatus.ORDERED;

        const updateResult = await tx.labOrderItem.updateMany({
          where: {
            id: orderItem.id,
            tenantId,
            status: {
              not: LabOrderItemStatus.VERIFIED,
            },
          },
          data: {
            status: nextStatus,
          },
        });

        if (updateResult.count === 0) {
          throw new DomainException(
            'LAB_RESULTS_LOCKED',
            'Cannot edit results after verification',
          );
        }

        await this.writeAuditEvent(tx, {
          actorUserId: actor,
          eventType: 'lims.results.entered',
          entityType: 'lab_order_item',
          entityId: orderItem.id,
          payload: {
            tenant_id: tenantId,
            user_id: actor,
            encounter_id: encounter.id,
            order_id: orderItem.id,
            idempotency_key: idempotencyKey,
            correlation_id: this.getCorrelationId(),
            prev_status: orderItem.status,
            next_status: nextStatus,
            failure_reason_code: null,
            failure_reason_details: null,
          },
        });

        return this.buildOrderedTest(tx, orderItem.id);
      });
    } catch (error) {
      await this.writeAuditFailure({
        actorUserId: actor,
        eventType: 'lims.results.enter_blocked',
        entityType: 'lab_order_item',
        entityId: dto.orderItemId,
        encounterId,
        orderId: dto.orderItemId,
        idempotencyKey,
        prevStatus: null,
        nextStatus: null,
        error,
      });
      throw error;
    }
  }

  async verifyResults(encounterId: string, dto: VerifyLabResultsDto) {
    const tenantId = this.tenantId;
    const actor = this.getActorIdentity() ?? 'system';
    const idempotencyKey = this.getIdempotencyKey();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const encounter = await this.assertLabEncounter(tx, encounterId);

        if (encounter.status !== 'IN_PROGRESS') {
          throw new DomainException(
            'INVALID_STATE',
            'LAB results can only be verified while encounter is IN_PROGRESS',
          );
        }

        const orderItem = await tx.labOrderItem.findFirst({
          where: {
            id: dto.orderItemId,
            tenantId,
            encounterId: encounter.id,
          },
        });

        if (!orderItem) {
          throw new NotFoundException('LAB order item not found');
        }

        const activeParameters = await tx.labTestParameter.findMany({
          where: {
            tenantId,
            testId: orderItem.testId,
            active: true,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (orderItem.status === LabOrderItemStatus.VERIFIED) {
          return this.handleAlreadyVerified(tx, {
            tenantId,
            orderItemId: orderItem.id,
            actor,
            activeParameters,
          });
        }

        if (orderItem.status !== LabOrderItemStatus.RESULTS_ENTERED) {
          throw new DomainException(
            'LAB_RESULTS_NOT_READY',
            'LAB order item must be in RESULTS_ENTERED status before verification',
          );
        }

        const activeParameterIds = activeParameters.map((parameter) => parameter.id);
        const values = await tx.labResultItem.findMany({
          where: {
            tenantId,
            orderItemId: orderItem.id,
            parameterId: {
              in: activeParameterIds,
            },
          },
        });

        const missing = activeParameters
          .filter((parameter) => {
            const value = values.find((item) => item.parameterId === parameter.id);
            return !value || value.value.trim().length === 0;
          })
          .map((parameter) => ({
            parameter_id: parameter.id,
            parameter_name: parameter.name,
          }));

        if (missing.length > 0) {
          throw new DomainException(
            'LAB_RESULTS_INCOMPLETE',
            'All active parameters must have values before verification',
            { missing },
          );
        }

        const verifiedAt = new Date();
        await tx.labResultItem.updateMany({
          where: {
            tenantId,
            orderItemId: orderItem.id,
            parameterId: {
              in: activeParameterIds,
            },
          },
          data: {
            verifiedBy: actor,
            verifiedAt,
          },
        });

        const transition = await tx.labOrderItem.updateMany({
          where: {
            id: orderItem.id,
            tenantId,
            status: LabOrderItemStatus.RESULTS_ENTERED,
          },
          data: {
            status: LabOrderItemStatus.VERIFIED,
          },
        });

        if (transition.count === 0) {
          return this.handleAlreadyVerified(tx, {
            tenantId,
            orderItemId: orderItem.id,
            actor,
            activeParameters,
          });
        }

        await this.writeAuditEvent(tx, {
          actorUserId: actor,
          eventType: 'lims.results.verified',
          entityType: 'lab_order_item',
          entityId: orderItem.id,
          payload: {
            tenant_id: tenantId,
            user_id: actor,
            encounter_id: encounter.id,
            order_id: orderItem.id,
            idempotency_key: idempotencyKey,
            correlation_id: this.getCorrelationId(),
            prev_status: LabOrderItemStatus.RESULTS_ENTERED,
            next_status: LabOrderItemStatus.VERIFIED,
            failure_reason_code: null,
            failure_reason_details: null,
          },
        });

        return this.buildOrderedTest(tx, orderItem.id);
      });
    } catch (error) {
      await this.writeAuditFailure({
        actorUserId: actor,
        eventType: 'lims.results.verify_blocked',
        entityType: 'lab_order_item',
        entityId: dto.orderItemId,
        encounterId,
        orderId: dto.orderItemId,
        idempotencyKey,
        prevStatus: null,
        nextStatus: null,
        error,
      });
      throw error;
    }
  }

  async publishLabReport(encounterId: string) {
    const tenantId = this.tenantId;
    const actor = this.getActorIdentity();
    const idempotencyKey = this.getIdempotencyKey();

    try {
      const encounter = await this.prisma.encounter.findFirst({
        where: {
          id: encounterId,
          tenantId,
        },
        select: {
          id: true,
          type: true,
          status: true,
        },
      });

      if (!encounter) {
        throw new NotFoundException('Encounter not found');
      }

      if (encounter.type !== 'LAB') {
        throw new DomainException(
          'INVALID_ENCOUNTER_TYPE',
          'LAB workflow commands are only valid for LAB encounters',
        );
      }

      if (encounter.status !== 'FINALIZED' && encounter.status !== 'DOCUMENTED') {
        throw new DomainException(
          'LAB_PUBLISH_BLOCKED_NOT_FINALIZED',
          'Encounter must be FINALIZED before LAB report publishing',
          {
            current_status: encounter.status,
          },
        );
      }

      const document = await this.documentsService.queueEncounterDocument(
        encounter.id,
        'LAB_REPORT_V1',
      );

      await this.writeAuditEvent(this.prisma, {
        actorUserId: actor,
        eventType: 'lims.report.publish.requested',
        entityType: 'encounter',
        entityId: encounter.id,
        payload: {
          tenant_id: tenantId,
          user_id: actor,
          encounter_id: encounter.id,
          order_id: null,
          idempotency_key: idempotencyKey,
          correlation_id: this.getCorrelationId(),
          prev_status: encounter.status,
          next_status: document.status,
          failure_reason_code: null,
          failure_reason_details: null,
          document_id: document.id,
          payload_hash: document.payloadHash,
          pdf_hash: document.pdfHash,
        },
      });

      return document;
    } catch (error) {
      await this.writeAuditFailure({
        actorUserId: actor,
        eventType: 'lims.report.publish_blocked',
        entityType: 'encounter',
        entityId: encounterId,
        encounterId,
        orderId: null,
        idempotencyKey,
        prevStatus: null,
        nextStatus: null,
        error,
      });
      throw error;
    }
  }

  private async assertLabEncounter(
    tx: Prisma.TransactionClient,
    encounterId: string,
  ) {
    const encounter = await tx.encounter.findFirst({
      where: {
        id: encounterId,
        tenantId: this.tenantId,
      },
    });

    if (!encounter) {
      throw new NotFoundException('Encounter not found');
    }

    if (encounter.type !== 'LAB') {
      throw new DomainException(
        'INVALID_ENCOUNTER_TYPE',
        'LAB workflow commands are only valid for LAB encounters',
      );
    }

    return encounter;
  }

  private async assertLabPrepComplete(
    tx: Prisma.TransactionClient,
    encounterId: string,
  ): Promise<void> {
    const prep = await tx.labEncounterPrep.findFirst({
      where: {
        tenantId: this.tenantId,
        encounterId,
      },
      select: {
        collectedAt: true,
      },
    });

    const missingFields: string[] = [];
    if (!prep?.collectedAt) {
      missingFields.push('sample_collected_at');
    }

    if (missingFields.length > 0) {
      throw new DomainException(
        'PREP_INCOMPLETE',
        'Preparation data is incomplete. Save preparation before ordering tests.',
        { missing_fields: missingFields },
      );
    }
  }

  private async buildOrderedTest(
    tx: Prisma.TransactionClient,
    orderItemId: string,
  ): Promise<LabOrderedTestResponse> {
    const tenantId = this.tenantId;

    const orderItem = await tx.labOrderItem.findFirst({
      where: {
        id: orderItemId,
        tenantId,
      },
      include: {
        test: true,
      },
    });

    if (!orderItem) {
      throw new NotFoundException('LAB order item not found');
    }

    const parameters = await tx.labTestParameter.findMany({
      where: {
        tenantId,
        testId: orderItem.testId,
        active: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    const orderMap = new Map(parameters.map((parameter, index) => [parameter.id, index]));

    const results = await tx.labResultItem.findMany({
      where: {
        tenantId,
        orderItemId: orderItem.id,
      },
    });

    results.sort((left, right) => {
      const leftOrder = orderMap.get(left.parameterId) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = orderMap.get(right.parameterId) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.parameterId.localeCompare(right.parameterId);
    });

    const { test, ...orderItemWithoutTest } = orderItem;

    return {
      orderItem: orderItemWithoutTest,
      test,
      parameters,
      results,
    };
  }

  private parseNumericValue(value: string): number | null {
    if (value.length === 0) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private computeFlag(
    parameter: LabTestParameter,
    valueNumeric: number | null,
  ): LabResultFlag {
    const matchedRange = ensureSingleReferenceRangeMatch([
      {
        id: parameter.id,
        refLow: parameter.refLow,
        refHigh: parameter.refHigh,
        refText: parameter.refText,
      },
    ]);

    if (valueNumeric === null) {
      return LabResultFlag.UNKNOWN;
    }

    if (matchedRange?.refLow !== null && matchedRange?.refLow !== undefined && valueNumeric < matchedRange.refLow) {
      return LabResultFlag.LOW;
    }

    if (matchedRange?.refHigh !== null && matchedRange?.refHigh !== undefined && valueNumeric > matchedRange.refHigh) {
      return LabResultFlag.HIGH;
    }

    if (
      matchedRange?.refLow !== null ||
      matchedRange?.refHigh !== null
    ) {
      return LabResultFlag.NORMAL;
    }

    return LabResultFlag.UNKNOWN;
  }

  private getActorIdentity(): string | null {
    const fromCls =
      this.cls.get<string>('USER_EMAIL') ??
      this.cls.get<string>('USER_ID') ??
      this.cls.get<string>('USER_SUB') ??
      null;
    if (fromCls) {
      return fromCls;
    }

    const claims = parseMockBearerTokenHeader(this.request.headers.authorization);
    return claims?.userId ?? null;
  }

  private getIdempotencyKey(): string | null {
    const header = this.request.headers['x-idempotency-key'];
    if (typeof header === 'string' && header.trim().length > 0) {
      return header.trim();
    }
    if (Array.isArray(header) && header[0]?.trim().length) {
      return header[0].trim();
    }
    return null;
  }

  private getCorrelationId(): string | null {
    return this.cls.get<string>('REQUEST_ID') ?? null;
  }

  private async handleAlreadyVerified(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      orderItemId: string;
      actor: string;
      activeParameters: Array<{ id: string; name: string }>;
    },
  ): Promise<LabOrderedTestResponse> {
    const values = await tx.labResultItem.findMany({
      where: {
        tenantId: input.tenantId,
        orderItemId: input.orderItemId,
        parameterId: {
          in: input.activeParameters.map((parameter) => parameter.id),
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const verified = values.find(
      (item) => item.verifiedBy !== null && item.verifiedAt !== null,
    );
    if (!verified) {
      throw new DomainException(
        'LAB_RESULTS_NOT_READY',
        'LAB order item must be in RESULTS_ENTERED status before verification',
      );
    }

    if (verified.verifiedBy === input.actor) {
      return this.buildOrderedTest(tx, input.orderItemId);
    }

    throw new DomainException(
      'LAB_ALREADY_VERIFIED',
      'LAB results already verified by another user',
      {
        verified_by: verified.verifiedBy,
        verified_at: verified.verifiedAt?.toISOString() ?? null,
      },
    );
  }

  private async writeAuditEvent(
    source: Prisma.TransactionClient | PrismaService,
    input: {
      actorUserId: string | null;
      eventType: string;
      entityType: string;
      entityId: string;
      payload: Record<string, unknown>;
    },
  ): Promise<void> {
    const auditModel = (source as unknown as {
      auditEvent?: {
        create?: (args: unknown) => Promise<unknown>;
      };
    }).auditEvent;

    if (!auditModel?.create) {
      return;
    }

    await auditModel.create({
      data: {
        tenantId: this.tenantId,
        actorUserId: input.actorUserId,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        payloadJson: JSON.stringify(input.payload),
        correlationId: this.getCorrelationId(),
      },
    });
  }

  private async writeAuditFailure(input: {
    actorUserId: string | null;
    eventType: string;
    entityType: string;
    entityId: string;
    encounterId: string;
    orderId: string | null;
    idempotencyKey: string | null;
    prevStatus: string | null;
    nextStatus: string | null;
    error: unknown;
  }): Promise<void> {
    if (!(input.error instanceof DomainException)) {
      return;
    }

    await this.writeAuditEvent(this.prisma, {
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: {
        tenant_id: this.tenantId,
        user_id: input.actorUserId,
        encounter_id: input.encounterId,
        order_id: input.orderId,
        idempotency_key: input.idempotencyKey,
        correlation_id: this.getCorrelationId(),
        prev_status: input.prevStatus,
        next_status: input.nextStatus,
        failure_reason_code: input.error.code,
        failure_reason_details: input.error.details ?? null,
      },
    });
  }

  async getVerificationQueue(params: {
    limit?: number;
    cursor?: string;
  }): Promise<{
    items: Array<{
      encounter_id: string;
      lab_order_item_id: string;
      derived_encounter_status: string;
      patient: {
        patient_id: string;
        mrn: string | null;
        name: string;
        age: number | null;
        sex: string | null;
      };
      test: { test_code: string; test_name: string };
      created_at: string;
      results_entered_at: string | null;
    }>;
  }> {
    const tenantId = this.tenantId;
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);

    const items = await this.prisma.labOrderItem.findMany({
      where: {
        tenantId,
        status: LabOrderItemStatus.RESULTS_ENTERED,
      },
      take: limit + 1,
      ...(params.cursor
        ? { cursor: { id: params.cursor }, skip: 1 }
        : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        encounter: { include: { patient: true } },
        test: { select: { code: true, name: true } },
      },
    });

    const encounterIds = [...new Set(items.map((i) => i.encounterId))];
    const [allItemsByEncounter, publishedEncounterIds] = await Promise.all([
      this.prisma.labOrderItem.findMany({
        where: { tenantId, encounterId: { in: encounterIds } },
        select: { encounterId: true, status: true },
      }),
      this.prisma.document
        .findMany({
          where: {
            tenantId,
            encounterId: { in: encounterIds },
            status: DocumentStatus.RENDERED,
          },
          select: { encounterId: true },
          distinct: ['encounterId'],
        })
        .then((docs) => new Set(docs.map((d) => d.encounterId))),
    ]);
    const itemsByEncounterId = new Map<string, { status: LabOrderItemStatus }[]>();
    for (const item of allItemsByEncounter) {
      const list = itemsByEncounterId.get(item.encounterId) ?? [];
      list.push({ status: item.status });
      itemsByEncounterId.set(item.encounterId, list);
    }

    const toAge = (dob: Date | null): number | null => {
      if (!dob) return null;
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) return age - 1;
      return age;
    };

    const result = items.slice(0, limit).map((row) => {
      const labItems = itemsByEncounterId.get(row.encounterId) ?? [];
      const hasPublishedReport = publishedEncounterIds.has(row.encounterId);
      const derived_encounter_status = deriveLabEncounterStatus(
        labItems,
        hasPublishedReport,
      );
      const patient = row.encounter.patient;
      return {
        encounter_id: row.encounterId,
        lab_order_item_id: row.id,
        derived_encounter_status,
        patient: {
          patient_id: patient.id,
          mrn: patient.mrn ?? patient.regNo,
          name: patient.name,
          age: toAge(patient.dob),
          sex: patient.gender ?? null,
        },
        test: {
          test_code: row.test.code,
          test_name: row.test.name,
        },
        created_at: row.createdAt.toISOString(),
        results_entered_at: row.updatedAt.toISOString(),
      };
    });

    return { items: result };
  }
}
