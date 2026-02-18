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
exports.PatientsService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_cls_1 = require("nestjs-cls");
const prisma_service_1 = require("../prisma/prisma.service");
let PatientsService = class PatientsService {
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
        return this.prisma.$transaction(async (tx) => {
            const sequence = await tx.patientSequence.upsert({
                where: { tenantId },
                create: {
                    tenantId,
                    lastValue: 1,
                },
                update: {
                    lastValue: {
                        increment: 1,
                    },
                },
            });
            const regNo = `REG-${String(sequence.lastValue).padStart(8, '0')}`;
            return tx.patient.create({
                data: {
                    tenantId,
                    regNo,
                    name: dto.name,
                    dob: dto.dob ? new Date(dto.dob) : undefined,
                    gender: dto.gender,
                    phone: dto.phone,
                },
            });
        });
    }
    async findById(id) {
        const patient = await this.prisma.patient.findFirst({
            where: {
                id,
                tenantId: this.tenantId,
            },
        });
        if (!patient) {
            throw new common_1.NotFoundException('Patient not found');
        }
        return patient;
    }
    async findAll(page, query) {
        const take = 20;
        const skip = (page - 1) * take;
        const where = {
            tenantId: this.tenantId,
        };
        if (query) {
            where.OR = [
                {
                    name: {
                        contains: query,
                        mode: 'insensitive',
                    },
                },
                {
                    regNo: {
                        contains: query,
                        mode: 'insensitive',
                    },
                },
            ];
        }
        const [data, total] = await Promise.all([
            this.prisma.patient.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.patient.count({ where }),
        ]);
        return { data, total };
    }
};
exports.PatientsService = PatientsService;
exports.PatientsService = PatientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        nestjs_cls_1.ClsService])
], PatientsService);
//# sourceMappingURL=patients.service.js.map