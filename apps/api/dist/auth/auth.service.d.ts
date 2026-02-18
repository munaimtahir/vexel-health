import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
export declare class AuthService {
    private prisma;
    private cls;
    constructor(prisma: PrismaService, cls: ClsService);
    login(email: string, pass: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            tenantId: string;
            email: string;
            name: string | null;
            status: string;
            createdAt: Date;
        };
    }>;
}
