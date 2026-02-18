import { PrismaService } from '../prisma/prisma.service';
export declare class TenancyService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<{
        id: string;
        name: string;
        status: string;
        createdAt: Date;
    } | null>;
}
