import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
export declare class PatientsService {
    private readonly prisma;
    private readonly cls;
    constructor(prisma: PrismaService, cls: ClsService);
    private get tenantId();
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
    findAll(page: number, query?: string): Promise<{
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
}
