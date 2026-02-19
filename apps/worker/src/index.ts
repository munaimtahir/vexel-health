import { createHash } from 'node:crypto';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { Worker } from 'bullmq';
import { DocumentStatus, DocumentType, PrismaClient, StorageBackend } from '@prisma/client';
import { traceSpan, writeWorkflowTrace } from './workflow-trace';

type DocumentRenderJobPayload = {
  tenantId: string;
  documentId: string;
};

type RenderRequest = {
  templateKey: string;
  templateVersion: number;
  payloadVersion: number;
  payload: unknown;
};

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pdfServiceUrl = process.env.PDF_SERVICE_URL || 'http://127.0.0.1:5000';
const documentsLocalDir = process.env.DOCUMENTS_LOCAL_DIR || '/data/documents';
const workerConcurrency = Number(process.env.DOCUMENT_RENDER_CONCURRENCY || '2');

function sha256HexFromBytes(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function sanitizeErrorMessage(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value);
  return message.slice(0, 500);
}

function toTemplateKey(documentType: DocumentType, payloadJson: unknown): string {
  if (
    typeof payloadJson === 'object' &&
    payloadJson !== null &&
    typeof (payloadJson as Record<string, unknown>).meta === 'object' &&
    (payloadJson as Record<string, unknown>).meta !== null
  ) {
    const meta = (payloadJson as Record<string, unknown>).meta as Record<
      string,
      unknown
    >;
    const templateKey = meta.templateKey;
    if (typeof templateKey === 'string' && templateKey.length > 0) {
      return templateKey;
    }
  }

  if (documentType === DocumentType.ENCOUNTER_SUMMARY) {
    return 'ENCOUNTER_SUMMARY_V1';
  }

  return 'ENCOUNTER_SUMMARY_V1';
}

function buildStorageKey(tenantId: string, documentId: string): string {
  return `${tenantId}/${documentId}.pdf`;
}

function resolveStoragePath(storageKey: string, tenantId: string): string {
  const normalizedKey = normalize(storageKey).replace(/^([/\\])+/, '');
  const tenantPrefix = `${tenantId}${sep}`;

  if (!normalizedKey.startsWith(tenantPrefix)) {
    throw new Error('storage key does not belong to tenant');
  }

  const rootPath = resolve(documentsLocalDir);
  const absolutePath = resolve(join(rootPath, normalizedKey));

  if (!absolutePath.startsWith(`${rootPath}${sep}`) && absolutePath !== rootPath) {
    throw new Error('invalid storage path');
  }

  return absolutePath;
}

async function renderPdf(request: RenderRequest): Promise<Buffer> {
  const response = await fetch(`${pdfServiceUrl}/render`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`pdf render failed (${response.status}): ${bodyText}`);
  }

  const bytes = await response.arrayBuffer();
  return Buffer.from(bytes);
}

async function writePdfLocally(input: {
  tenantId: string;
  documentId: string;
  bytes: Buffer;
}): Promise<{ storageKey: string }> {
  const storageKey = buildStorageKey(input.tenantId, input.documentId);
  const targetPath = resolveStoragePath(storageKey, input.tenantId);

  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, input.bytes);

  return { storageKey };
}

async function markFailed(input: DocumentRenderJobPayload, error: unknown): Promise<void> {
  await prisma.document.updateMany({
    where: {
      id: input.documentId,
      tenantId: input.tenantId,
      status: DocumentStatus.QUEUED,
    },
    data: {
      status: DocumentStatus.FAILED,
      errorCode: 'DOCUMENT_RENDER_FAILED',
      errorMessage: sanitizeErrorMessage(error),
    },
  });
  writeWorkflowTrace({
    event: 'publish_report.render_failed',
    requestId: null,
    tenantId: input.tenantId,
    userId: null,
    documentId: input.documentId,
    errorMessage: sanitizeErrorMessage(error),
  });
}

async function processDocumentRender(input: DocumentRenderJobPayload): Promise<void> {
  await traceSpan(
    {
      span: 'publish_report.render_worker',
      requestId: null,
      tenantId: input.tenantId,
      metadata: {
        documentId: input.documentId,
      },
    },
    async () => {
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          tenantId: input.tenantId,
        },
      });

      if (!document || document.status !== DocumentStatus.QUEUED) {
        return;
      }

      try {
        const pdfBytes = await renderPdf({
          templateKey: toTemplateKey(document.documentType, document.payloadJson),
          templateVersion: document.templateVersion,
          payloadVersion: document.payloadVersion,
          payload: document.payloadJson,
        });

        const pdfHash = sha256HexFromBytes(pdfBytes);
        const { storageKey } = await writePdfLocally({
          tenantId: input.tenantId,
          documentId: input.documentId,
          bytes: pdfBytes,
        });

        await prisma.$transaction(async (tx) => {
          const current = await tx.document.findFirst({
            where: {
              id: input.documentId,
              tenantId: input.tenantId,
            },
          });

          if (!current || current.status !== DocumentStatus.QUEUED) {
            return;
          }

          await tx.document.update({
            where: {
              id: current.id,
            },
            data: {
              status: DocumentStatus.RENDERED,
              storageBackend: StorageBackend.LOCAL,
              storageKey,
              pdfHash,
              renderedAt: new Date(),
              errorCode: null,
              errorMessage: null,
            },
          });

          writeWorkflowTrace({
            event: 'publish_report.document_rendered',
            requestId: null,
            tenantId: input.tenantId,
            userId: null,
            documentId: current.id,
            encounterId: current.encounterId,
            status: DocumentStatus.RENDERED,
            pdfHash,
            storageKey,
          });

          const encounter = await tx.encounter.findFirst({
            where: {
              id: current.encounterId,
              tenantId: input.tenantId,
            },
          });

          if (!encounter) {
            throw new Error('encounter not found for rendered document');
          }

          if (encounter.status === 'FINALIZED') {
            await tx.encounter.update({
              where: {
                id: encounter.id,
              },
              data: {
                status: 'DOCUMENTED',
              },
            });

            writeWorkflowTrace({
              event: 'publish_report.encounter_status_transition',
              requestId: null,
              tenantId: input.tenantId,
              userId: null,
              encounterId: encounter.id,
              fromStatus: 'FINALIZED',
              toStatus: 'DOCUMENTED',
            });
          } else if (encounter.status !== 'DOCUMENTED') {
            throw new Error(
              `encounter is in invalid state for documentation: ${encounter.status}`,
            );
          }
        });
      } catch (error) {
        await markFailed(input, error);
        throw error;
      }
    },
  );
}

const worker = new Worker<DocumentRenderJobPayload>(
  'document-render-queue',
  async (job) => {
    if (job.name !== 'DOCUMENT_RENDER') {
      return;
    }

    writeWorkflowTrace({
      event: 'publish_report.job_received',
      requestId: null,
      tenantId: job.data.tenantId,
      userId: null,
      documentId: job.data.documentId,
      jobId: job.id ?? null,
    });

    await processDocumentRender(job.data);
  },
  {
    connection: {
      url: redisUrl,
    },
    concurrency: workerConcurrency,
  },
);

worker.on('ready', () => {
  console.log(`[worker] started queue=document-render-queue redis=${redisUrl}`);
});

worker.on('completed', (job) => {
  console.log(`[worker] completed job=${job.id}`);
});

worker.on('failed', (job, error) => {
  console.error(`[worker] failed job=${job?.id ?? 'unknown'} error=${sanitizeErrorMessage(error)}`);
});

worker.on('error', (error) => {
  console.error(`[worker] runtime error=${sanitizeErrorMessage(error)}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] shutting down signal=${signal}`);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

void prisma.$connect();

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
