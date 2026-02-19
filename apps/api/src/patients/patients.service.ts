import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const tenantId = this.cls.get<string>('TENANT_ID');
    if (typeof tenantId !== 'string' || tenantId.length === 0) {
      throw new UnauthorizedException('Tenant context missing');
    }
    return tenantId;
  }

  async create(dto: CreatePatientDto) {
    const tenantId = this.tenantId;
    return this.prisma.$transaction(async (tx) => {
      const sequence = await tx.patientSequence.upsert({
        where: { tenantId },
        create: {
          tenantId,
          lastValue: 1,
        },
        update: {
          lastValue: {
            increment: 1,
          },
        },
      });

      const regNo = `REG-${String(sequence.lastValue).padStart(8, '0')}`;

      return tx.patient.create({
        data: {
          tenantId,
          regNo,
          name: dto.name,
          dob: dto.dob ? new Date(dto.dob) : undefined,
          gender: dto.gender,
          phone: dto.phone,
          fatherOrHusbandName: dto.fatherOrHusbandName,
          cnic: dto.cnic,
          address: dto.address,
        },
      });
    });
  }

  async findById(id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        tenantId: this.tenantId,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  async findAll(page: number, query?: string) {
    const take = 20;
    const skip = (page - 1) * take;

    const where: Prisma.PatientWhereInput = {
      tenantId: this.tenantId,
    };

    if (query) {
      where.OR = [
        {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          regNo: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return { data, total };
  }
}
