import { IsUUID } from 'class-validator';

export class PanelRemoveTestDto {
  @IsUUID()
  testId: string;
}
