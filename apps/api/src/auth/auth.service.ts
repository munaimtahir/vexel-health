import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private cls: ClsService,
  ) {}

  async login(email: string, pass: string) {
    const tenantId = this.cls.get<string>('TENANT_ID');
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context missing');
    }

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

    // Generate Mock Token with encoded tenant for debugging
    const accessToken = `mock.${tenantId}.${user.id}`;

    return {
      accessToken,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        name: user.name,
        status: user.status,
        createdAt: user.createdAt,
      },
    };
  }
}
