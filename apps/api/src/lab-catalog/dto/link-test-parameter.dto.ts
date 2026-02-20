import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class LinkTestParameterDto {
  @IsUUID()
  testId: string;

  @IsUUID()
  parameterId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
