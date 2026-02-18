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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncountersService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_cls_1 = require("nestjs-cls");
const domain_exception_1 = require("../common/errors/domain.exception");
const prisma_service_1 = require("../prisma/prisma.service");
const encounterStates = {
    CREATED: 'CREATED',
    PREP: 'PREP',
    IN_PROGRESS: 'IN_PROGRESS',
    FINALIZED: 'FINALIZED',
    DOCUMENTED: 'DOCUMENTED',
};
let EncountersService = class EncountersService {
    prisma;
    cls;
    constructor(prisma, cls) {
        this.prisma = prisma;
        this.cls = cls;
    }
    get tenantId() {
        const tenantId = this.cls.get('TENANT_ID');
        if (typeof tenantId !== 'string' || tenantId.length === 0) {
            throw new common_1.UnauthorizedException('Tenant context missing');
        }
        return tenantId;
    }
    async create(dto) {
        const tenantId = this.tenantId;
        const encounterType = dto.type.trim().toUpperCase();
        const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
        const year = startedAt.getUTCFullYear();
        return this.prisma.$transaction(async (tx) => {
            const patient = await tx.patient.findFirst({
                where: {
                    id: dto.patientId,
                    tenantId,
                },
            });
            if (!patient) {
                throw new domain_exception_1.DomainException('PATIENT_NOT_FOUND', 'Patient is not available in this tenant');
            }
            const sequence = await tx.encounterSequence.upsert({
                where: {
                    tenantId_type_year: {
                        tenantId,
                        type: encounterType,
                        year,
                    },
                },
                create: {
                    tenantId,
                    type: encounterType,
                    year,
                    lastValue: 1,
                },
                update: {
                    lastValue: {
                        increment: 1,
                    },
                },
            });
            const encounterCode = `${encounterType}-${year}-${String(sequence.lastValue).padStart(6, '0')}`;
            return tx.encounter.create({
                data: {
                    tenantId,
                    patientId: dto.patientId,
                    type: encounterType,
                    encounterCode,
                    status: encounterStates.CREATED,
                    startedAt,
                },
            });
        });
    }
    async findAll(page, query) {
        const take = 20;
        const skip = (page - 1) * take;
        const where = {
            tenantId: this.tenantId,
        };
        if (query?.patientId) {
            where.patientId = query.patientId;
        }
        if (query?.type) {
            where.type = query.type.trim().toUpperCase();
        }
        if (query?.status) {
            where.status = query.status.trim().toUpperCase();
        }
        const [data, total] = await Promise.all([
            this.prisma.encounter.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.encounter.count({ where }),
        ]);
        return { data, total };
    }
    async findById(id) {
        const encounter = await this.prisma.encounter.findFirst({
            where: {
                id,
                tenantId: this.tenantId,
            },
        });
        if (!encounter) {
            throw new common_1.NotFoundException('Encounter not found');
        }
        return encounter;
    }
    async startPrep(id) {
        return this.transitionState(id, encounterStates.CREATED, encounterStates.PREP, 'Cannot start preparation before encounter registration');
    }
    async startMain(id) {
        return this.transitionState(id, encounterStates.PREP, encounterStates.IN_PROGRESS, 'Cannot start main phase before preparation');
    }
    async finalize(id) {
        return this.transitionState(id, encounterStates.IN_PROGRESS, encounterStates.FINALIZED, 'Cannot finalize before main phase starts', true);
    }
    async transitionState(encounterId, expectedCurrentState, nextState, errorMessage, markEndedAt = false) {
        const tenantId = this.tenantId;
        return this.prisma.$transaction(async (tx) => {
            const encounter = await tx.encounter.findFirst({
                where: {
                    id: encounterId,
                    tenantId,
                },
            });
            if (!encounter) {
                throw new common_1.NotFoundException('Encounter not found');
            }
            if (encounter.status !== expectedCurrentState) {
                throw new domain_exception_1.DomainException('ENCOUNTER_STATE_INVALID', errorMessage);
            }
            return tx.encounter.update({
                where: { id: encounter.id },
                data: {
                    status: nextState,
                    endedAt: markEndedAt ? new Date() : undefined,
                },
            });
        });
    }
};
exports.EncountersService = EncountersService;
exports.EncountersService = EncountersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        nestjs_cls_1.ClsService])
], EncountersService);
//# sourceMappingURL=encounters.service.js.map