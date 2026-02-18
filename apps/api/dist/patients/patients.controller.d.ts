import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
export declare class PatientsController {
    private readonly service;
    constructor(service: PatientsService);
    create(dto: CreatePatientDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        dob: Date | null;
        gender: string | null;
        phone: string | null;
        regNo: string;
        mrn: string | null;
    }>;
    findAll(page?: number, query?: string): Promise<{
        data: {
            id: string;
            name: string;
            createdAt: Date;
            tenantId: string;
            dob: Date | null;
            gender: string | null;
            phone: string | null;
            regNo: string;
            mrn: string | null;
        }[];
        total: number;
    }>;
    findById(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        dob: Date | null;
        gender: string | null;
        phone: string | null;
        regNo: string;
        mrn: string | null;
    }>;
}
