"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
const nestjs_cls_1 = require("nestjs-cls");
const domain_exception_1 = require("../common/errors/domain.exception");
const prisma_service_1 = require("../prisma/prisma.service");
const document_render_queue_1 = require("./document-render.queue");
const document_storage_adapter_1 = require("./document-storage.adapter");
const document_hash_util_1 = require("./document-hash.util");
const documents_types_1 = require("./documents.types");
const DEFAULT_PAYLOAD_VERSION = 1;
const DEFAULT_TEMPLATE_VERSION = 1;
let DocumentsService = class DocumentsService {
    prisma;
    cls;
    queue;
    storage;
    constructor(prisma, cls, queue, storage) {
        this.prisma = prisma;
        this.cls = cls;
        this.queue = queue;
        this.storage = storage;
    }
    get tenantId() {
        const tenantId = this.cls.get('TENANT_ID');
        if (!tenantId) {
            throw new common_1.UnauthorizedException('Tenant context missing');
        }
        return tenantId;
    }
    async queueEncounterDocument(encounterId) {
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
            throw new common_1.NotFoundException('Encounter not found');
        }
        if (encounter.status !== 'FINALIZED' && encounter.status !== 'DOCUMENTED') {
            throw new domain_exception_1.DomainException('ENCOUNTER_STATE_INVALID', 'Encounter must be FINALIZED before document generation');
        }
        const payload = this.buildEncounterSummaryPayload(encounter);
        const payloadCanonicalJson = (0, document_hash_util_1.canonicalizeJson)(payload);
        const payloadHash = (0, document_hash_util_1.sha256HexFromText)(payloadCanonicalJson);
        let enqueueJob = false;
        const document = await this.prisma.$transaction(async (tx) => {
            const existing = await tx.document.findFirst({
                where: {
                    tenantId,
                    encounterId,
                    documentType: client_1.DocumentType.ENCOUNTER_SUMMARY,
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
                            documentType: client_1.DocumentType.ENCOUNTER_SUMMARY,
                            status: client_1.DocumentStatus.QUEUED,
                            payloadVersion: DEFAULT_PAYLOAD_VERSION,
                            templateVersion: DEFAULT_TEMPLATE_VERSION,
                            payloadJson: payload,
                            payloadHash,
                            storageBackend: client_1.StorageBackend.LOCAL,
                        },
                    });
                }
                catch (error) {
                    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                        error.code === 'P2002') {
                        const raced = await tx.document.findFirst({
                            where: {
                                tenantId,
                                encounterId,
                                documentType: client_1.DocumentType.ENCOUNTER_SUMMARY,
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
            if (existing.status === client_1.DocumentStatus.FAILED) {
                enqueueJob = true;
                return tx.document.update({
                    where: {
                        id: existing.id,
                    },
                    data: {
                        status: client_1.DocumentStatus.QUEUED,
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
        if (enqueueJob && document.status === client_1.DocumentStatus.QUEUED) {
            await this.queue.enqueueDocumentRender({
                tenantId,
                documentId: document.id,
            });
        }
        return (0, documents_types_1.toDocumentResponse)(document);
    }
    async getDocumentById(documentId) {
        const document = await this.findDocumentByIdForTenant(this.tenantId, documentId);
        return (0, documents_types_1.toDocumentResponse)(document);
    }
    async getDocumentFile(documentId) {
        const tenantId = this.tenantId;
        const document = await this.findDocumentByIdForTenant(tenantId, documentId);
        if (document.status !== client_1.DocumentStatus.RENDERED || !document.storageKey) {
            throw new domain_exception_1.DomainException('DOCUMENT_NOT_RENDERED', 'Document is not rendered yet');
        }
        return this.storage.getPdf({
            tenantId,
            storageKey: document.storageKey,
        });
    }
    async findDocumentByIdForTenant(tenantId, documentId) {
        const document = await this.prisma.document.findFirst({
            where: {
                id: documentId,
                tenantId,
            },
        });
        if (!document) {
            throw new common_1.NotFoundException('Document not found');
        }
        return document;
    }
    buildEncounterSummaryPayload(encounter) {
        return {
            encounterId: encounter.id,
            encounterCode: encounter.encounterCode,
            encounterType: encounter.type,
            encounterStatus: 'FINALIZED',
            patientId: encounter.patient.id,
            patientRegNo: encounter.patient.regNo,
            patientName: encounter.patient.name,
        };
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(document_render_queue_1.DOCUMENT_RENDER_QUEUE)),
    __param(3, (0, common_1.Inject)(document_storage_adapter_1.DOCUMENT_STORAGE_ADAPTER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        nestjs_cls_1.ClsService, Object, Object])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map