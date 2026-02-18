import { CreateEncounterDto } from './dto/create-encounter.dto';
import { EncountersService } from './encounters.service';
export declare class EncountersController {
    private readonly service;
    constructor(service: EncountersService);
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
    findAll(page?: number, patientId?: string, type?: string, status?: string): Promise<{
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
    createDocument(id: string): void;
}
