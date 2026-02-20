import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class PanelAddTestDto {
  @IsUUID()
  testId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
