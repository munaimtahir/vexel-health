"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const node_path_1 = require("node:path");
const promises_1 = require("node:fs/promises");
const bullmq_1 = require("bullmq");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pdfServiceUrl = process.env.PDF_SERVICE_URL || 'http://127.0.0.1:5000';
const documentsLocalDir = process.env.DOCUMENTS_LOCAL_DIR || '/data/documents';
const workerConcurrency = Number(process.env.DOCUMENT_RENDER_CONCURRENCY || '2');
function sha256HexFromBytes(value) {
    return (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
}
function sanitizeErrorMessage(value) {
    const message = value instanceof Error ? value.message : String(value);
    return message.slice(0, 500);
}
function toTemplateKey(documentType) {
    if (documentType === client_1.DocumentType.ENCOUNTER_SUMMARY) {
        return 'ENCOUNTER_SUMMARY';
    }
    return 'ENCOUNTER_SUMMARY';
}
function buildStorageKey(tenantId, documentId) {
    return `${tenantId}/${documentId}.pdf`;
}
function resolveStoragePath(storageKey, tenantId) {
    const normalizedKey = (0, node_path_1.normalize)(storageKey).replace(/^([/\\])+/, '');
    const tenantPrefix = `${tenantId}${node_path_1.sep}`;
    if (!normalizedKey.startsWith(tenantPrefix)) {
        throw new Error('storage key does not belong to tenant');
    }
    const rootPath = (0, node_path_1.resolve)(documentsLocalDir);
    const absolutePath = (0, node_path_1.resolve)((0, node_path_1.join)(rootPath, normalizedKey));
    if (!absolutePath.startsWith(`${rootPath}${node_path_1.sep}`) && absolutePath !== rootPath) {
        throw new Error('invalid storage path');
    }
    return absolutePath;
}
async function renderPdf(request) {
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
async function writePdfLocally(input) {
    const storageKey = buildStorageKey(input.tenantId, input.documentId);
    const targetPath = resolveStoragePath(storageKey, input.tenantId);
    await (0, promises_1.mkdir)((0, node_path_1.dirname)(targetPath), { recursive: true });
    await (0, promises_1.writeFile)(targetPath, input.bytes);
    return { storageKey };
}
async function markFailed(input, error) {
    await prisma.document.updateMany({
        where: {
            id: input.documentId,
            tenantId: input.tenantId,
            status: client_1.DocumentStatus.QUEUED,
        },
        data: {
            status: client_1.DocumentStatus.FAILED,
            errorCode: 'DOCUMENT_RENDER_FAILED',
            errorMessage: sanitizeErrorMessage(error),
        },
    });
}
async function processDocumentRender(input) {
    const document = await prisma.document.findFirst({
        where: {
            id: input.documentId,
            tenantId: input.tenantId,
        },
    });
    if (!document || document.status !== client_1.DocumentStatus.QUEUED) {
        return;
    }
    try {
        const pdfBytes = await renderPdf({
            templateKey: toTemplateKey(document.documentType),
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
            if (!current || current.status !== client_1.DocumentStatus.QUEUED) {
                return;
            }
            await tx.document.update({
                where: {
                    id: current.id,
                },
                data: {
                    status: client_1.DocumentStatus.RENDERED,
                    storageBackend: client_1.StorageBackend.LOCAL,
                    storageKey,
                    pdfHash,
                    renderedAt: new Date(),
                    errorCode: null,
                    errorMessage: null,
                },
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
            }
            else if (encounter.status !== 'DOCUMENTED') {
                throw new Error(`encounter is in invalid state for documentation: ${encounter.status}`);
            }
        });
    }
    catch (error) {
        await markFailed(input, error);
        throw error;
    }
}
const worker = new bullmq_1.Worker('document-render-queue', async (job) => {
    if (job.name !== 'DOCUMENT_RENDER') {
        return;
    }
    await processDocumentRender(job.data);
}, {
    connection: {
        url: redisUrl,
    },
    concurrency: workerConcurrency,
});
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
async function shutdown(signal) {
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
//# sourceMappingURL=index.js.map