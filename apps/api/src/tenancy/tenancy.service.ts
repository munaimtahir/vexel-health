import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenancyService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }
}
