import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBrandingConfigDto } from './dto/update-branding-config.dto';
import { UpdateReceiptDesignConfigDto } from './dto/update-receipt-design-config.dto';
import { UpdateReportDesignConfigDto } from './dto/update-report-design-config.dto';

@Injectable()
export class BusinessConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const tenantId = this.cls.get<string>('TENANT_ID');
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context missing');
    }
    return tenantId;
  }

  private get actorIdentity(): string | null {
    return (
      this.cls.get<string>('USER_EMAIL') ??
      this.cls.get<string>('USER_ID') ??
      this.cls.get<string>('USER_SUB') ??
      null
    );
  }

  async getBranding() {
    return this.prisma.tenantBrandingConfig.upsert({
      where: {
        tenantId: this.tenantId,
      },
      create: {
        tenantId: this.tenantId,
        updatedBy: this.actorIdentity,
      },
      update: {},
    });
  }

  async updateBranding(dto: UpdateBrandingConfigDto) {
    const updated = await this.prisma.tenantBrandingConfig.upsert({
      where: {
        tenantId: this.tenantId,
      },
      create: {
        tenantId: this.tenantId,
        ...dto,
        logoAssetName: dto.logoAssetName ?? null,
        headerAssetName: dto.headerAssetName ?? null,
        footerAssetName: dto.footerAssetName ?? null,
        updatedBy: this.actorIdentity,
      },
      update: {
        ...dto,
        logoAssetName: dto.logoAssetName ?? null,
        headerAssetName: dto.headerAssetName ?? null,
        footerAssetName: dto.footerAssetName ?? null,
        updatedBy: this.actorIdentity,
      },
    });

    await this.writeAuditEvent({
      eventType: 'admin.business.branding.updated',
      entityType: 'tenant_branding_config',
      entityId: this.tenantId,
      payload: {
        updated_by: this.actorIdentity,
      },
    });

    return updated;
  }

  async getReportDesign() {
    return this.prisma.tenantReportDesignConfig.upsert({
      where: {
        tenantId: this.tenantId,
      },
      create: {
        tenantId: this.tenantId,
        updatedBy: this.actorIdentity,
      },
      update: {},
    });
  }

  async updateReportDesign(dto: UpdateReportDesignConfigDto) {
    const updated = await this.prisma.tenantReportDesignConfig.upsert({
      where: {
        tenantId: this.tenantId,
      },
      create: {
        tenantId: this.tenantId,
        ...dto,
        updatedBy: this.actorIdentity,
      },
      update: {
        ...dto,
        updatedBy: this.actorIdentity,
      },
    });

    await this.writeAuditEvent({
      eventType: 'admin.business.report_design.updated',
      entityType: 'tenant_report_design_config',
      entityId: this.tenantId,
      payload: {
        updated_by: this.actorIdentity,
      },
    });

    return updated;
  }

  async getReceiptDesign() {
    return this.prisma.tenantReceiptDesignConfig.upsert({
      where: {
        tenantId: this.tenantId,
      },
      create: {
        tenantId: this.tenantId,
        updatedBy: this.actorIdentity,
      },
      update: {},
    });
  }

  async updateReceiptDesign(dto: UpdateReceiptDesignConfigDto) {
    const updated = await this.prisma.tenantReceiptDesignConfig.upsert({
      where: {
        tenantId: this.tenantId,
      },
      create: {
        tenantId: this.tenantId,
        ...dto,
        updatedBy: this.actorIdentity,
      },
      update: {
        ...dto,
        updatedBy: this.actorIdentity,
      },
    });

    await this.writeAuditEvent({
      eventType: 'admin.business.receipt_design.updated',
      entityType: 'tenant_receipt_design_config',
      entityId: this.tenantId,
      payload: {
        updated_by: this.actorIdentity,
      },
    });

    return updated;
  }

  private async writeAuditEvent(input: {
    eventType: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }) {
    await this.prisma.auditEvent.create({
      data: {
        tenantId: this.tenantId,
        actorUserId: this.actorIdentity,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        payloadJson: JSON.stringify(input.payload),
        correlationId: this.cls.get<string>('REQUEST_ID') ?? null,
      },
    });
  }
}
