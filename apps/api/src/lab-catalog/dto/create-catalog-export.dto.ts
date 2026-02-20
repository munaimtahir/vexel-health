import { IsIn } from 'class-validator';

export class CreateCatalogExportDto {
  @IsIn(['TESTS', 'PARAMETERS', 'PANELS'])
  entity: 'TESTS' | 'PARAMETERS' | 'PANELS';
}
