import { DocumentsService } from '../documents/documents.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { EncountersService } from './encounters.service';
export declare class EncountersController {
    private readonly service;
    private readonly documentsService;
    constructor(service: EncountersService, documentsService: DocumentsService);
    create(dto: CreateEncounterDto): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        type: string;
        patientId: string;
        encounterCode: string;
        startedAt: Date;
        endedAt: Date | null;
    }>;
    findAll(page?: number, patientId?: string, type?: string, status?: string): Promise<{
        data: {
            id: string;
            status: string;
            createdAt: Date;
            tenantId: string;
            type: string;
            patientId: string;
            encounterCode: string;
            startedAt: Date;
            endedAt: Date | null;
        }[];
        total: number;
    }>;
    findById(id: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        type: string;
        patientId: string;
        encounterCode: string;
        startedAt: Date;
        endedAt: Date | null;
    }>;
    startPrep(id: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        type: string;
        patientId: string;
        encounterCode: string;
        startedAt: Date;
        endedAt: Date | null;
    }>;
    startMain(id: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        type: string;
        patientId: string;
        encounterCode: string;
        startedAt: Date;
        endedAt: Date | null;
    }>;
    finalize(id: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        type: string;
        patientId: string;
        encounterCode: string;
        startedAt: Date;
        endedAt: Date | null;
    }>;
    createDocument(id: string): Promise<import("../documents/documents.types").DocumentResponse>;
}
