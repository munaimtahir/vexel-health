import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';
export declare class EncountersService {
    private readonly prisma;
    private readonly cls;
    constructor(prisma: PrismaService, cls: ClsService);
    private get tenantId();
    create(dto: CreateEncounterDto): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        patientId: string;
        type: string;
        startedAt: Date;
        encounterCode: string;
        endedAt: Date | null;
    }>;
    findAll(page: number, query?: {
        patientId?: string;
        type?: string;
        status?: string;
    }): Promise<{
        data: {
            id: string;
            status: string;
            createdAt: Date;
            tenantId: string;
            patientId: string;
            type: string;
            startedAt: Date;
            encounterCode: string;
            endedAt: Date | null;
        }[];
        total: number;
    }>;
    findById(id: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        patientId: string;
        type: string;
        startedAt: Date;
        encounterCode: string;
        endedAt: Date | null;
    }>;
    startPrep(id: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        patientId: string;
        type: string;
        startedAt: Date;
        encounterCode: string;
        endedAt: Date | null;
    }>;
    startMain(id: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        patientId: string;
        type: string;
        startedAt: Date;
        encounterCode: string;
        endedAt: Date | null;
    }>;
    finalize(id: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        patientId: string;
        type: string;
        startedAt: Date;
        encounterCode: string;
        endedAt: Date | null;
    }>;
    private transitionState;
}
