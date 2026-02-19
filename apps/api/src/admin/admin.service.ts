import { DocumentStatus } from '@prisma/client';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { deriveLabEncounterStatus } from '../common/lab/lab-derived-status.util';
import { PrismaService } from '../prisma/prisma.service';
import type { LabEncounterStatus } from '../common/lab/lab-derived-status.util';

const PDF_SERVICE_URL =
  process.env.PDF_SERVICE_URL ?? 'http://localhost:5000';
const PDF_HEALTH_CACHE_MS = 60_000;

type CachedPdfHealth = {
  status: 'ok' | 'degraded';
  last_checked_at: string;
};

@Injectable()
export class AdminService {
  private pdfHealthCache: CachedPdfHealth | null = null;
  private pdfHealthCacheTime = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const tenantId = this.cls.get<string>('TENANT_ID');
    if (typeof tenantId !== 'string' || tenantId.length === 0) {
      throw new UnauthorizedException('Tenant context missing');
    }
    return tenantId;
  }

  async getOverview(): Promise<{
    counts: {
      encounters_by_status: Record<LabEncounterStatus, number>;
      verification_queue_count: number;
      published_last_24h_count: number;
    };
    system: {
      pdf_service_health: CachedPdfHealth;
    };
    catalog: {
      tests_count: number;
      parameters_count: number;
    };
    features: Record<string, boolean>;
  }> {
    const tenantId = this.tenantId;

    const [
      labEncounters,
      verificationQueueCount,
      publishedLast24hCount,
      testsCount,
      parametersCount,
    ] = await Promise.all([
      this.prisma.encounter.findMany({
        where: { tenantId, type: 'LAB' },
        select: { id: true },
      }),
      this.prisma.labOrderItem.count({
        where: { tenantId, status: 'RESULTS_ENTERED' },
      }),
      this.prisma.document.count({
        where: {
          tenantId,
          status: DocumentStatus.RENDERED,
          renderedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.labTestDefinition.count({ where: { tenantId } }),
      this.prisma.labTestParameter.count({ where: { tenantId } }),
    ]);

    const encounterIds = labEncounters.map((e) => e.id);
    const statusCounts: Record<LabEncounterStatus, number> = {
      DRAFT: 0,
      ORDERED: 0,
      RESULTS_ENTERED: 0,
      VERIFIED: 0,
      PUBLISHED: 0,
    };

    if (encounterIds.length > 0) {
      const [itemsByEncounter, publishedIds] = await Promise.all([
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
          .then((d) => new Set(d.map((x) => x.encounterId))),
      ]);
      const itemsMap = new Map<string, { status: string }[]>();
      for (const item of itemsByEncounter) {
        const list = itemsMap.get(item.encounterId) ?? [];
        list.push({ status: item.status });
        itemsMap.set(item.encounterId, list);
      }
      for (const eid of encounterIds) {
        const items = itemsMap.get(eid) ?? [];
        const hasPublished = publishedIds.has(eid);
        const status = deriveLabEncounterStatus(items, hasPublished);
        statusCounts[status]++;
      }
    }

    const pdf_service_health = await this.getPdfServiceHealthCached();

    return {
      counts: {
        encounters_by_status: statusCounts,
        verification_queue_count: verificationQueueCount,
        published_last_24h_count: publishedLast24hCount,
      },
      system: { pdf_service_health },
      catalog: { tests_count: testsCount, parameters_count: parametersCount },
      features: {
        lims: true,
        billing: false,
        documents: true,
      },
    };
  }

  private async getPdfServiceHealthCached(): Promise<CachedPdfHealth> {
    const now = Date.now();
    if (
      this.pdfHealthCache &&
      now - this.pdfHealthCacheTime < PDF_HEALTH_CACHE_MS
    ) {
      return this.pdfHealthCache;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${PDF_SERVICE_URL}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const ok = res.ok;
      this.pdfHealthCache = {
        status: ok ? 'ok' : 'degraded',
        last_checked_at: new Date().toISOString(),
      };
    } catch {
      this.pdfHealthCache = {
        status: 'degraded',
        last_checked_at: new Date().toISOString(),
      };
    }
    this.pdfHealthCacheTime = now;
    return this.pdfHealthCache;
  }
}
