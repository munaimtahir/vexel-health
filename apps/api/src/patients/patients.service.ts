import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cls: ClsService,
    ) { }

    private get tenantId() {
        return this.cls.get('TENANT_ID');
    }

    async create(dto: CreatePatientDto) {
        return this.prisma.patient.create({
            data: {
                ...dto,
                tenantId: this.tenantId,
            },
        });
    }

    async findAll(page: number, query?: string) {
        const take = 20;
        const skip = (page - 1) * take;

        const where: any = {
            tenantId: this.tenantId,
        };

        if (query) {
            where.name = {
                contains: query,
                mode: 'insensitive',
            };
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
}
