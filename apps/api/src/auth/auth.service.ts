import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService, private cls: ClsService) { }

    async login(email: string, pass: string) {
        const tenantId = this.cls.get('TENANT_ID');
        // Middleware guarantees tenantId is set, or throws.

        const user = await this.prisma.user.findUnique({
            where: {
                tenantId_email: {
                    tenantId,
                    email,
                },
            },
        });

        if (!user || user.passwordHash !== pass) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const { passwordHash, ...result } = user;

        // Generate Mock Token with encoded tenant for debugging
        const accessToken = `mock.${tenantId}.${user.id}`;

        return {
            accessToken,
            user: result,
        };
    }
}
