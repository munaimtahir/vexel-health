import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class CatalogImportExportService {
  constructor(private readonly cls: ClsService) {}

  private get tenantId(): string {
    const tenantId = this.cls.get<string>('TENANT_ID');
    if (!tenantId) throw new UnauthorizedException('Tenant context missing');
    return tenantId;
  }

  importCatalog(
    _file: { buffer?: Buffer; originalname?: string } | undefined,
    _dryRun: boolean,
  ) {
    return {
      dryRun: _dryRun,
      diffReport: _dryRun ? { planned: 'stub' } : null,
      appliedVersionId: _dryRun ? null : null,
      errors: [
        { sheet: 'CatalogMeta', row: 0, message: 'Import not implemented yet' },
      ],
    };
  }

  exportCatalog(_options: { versionId?: string; versionTag?: string }) {
    void _options;
    return Buffer.from('XLSX stub - export not implemented yet', 'utf-8');
  }
}
