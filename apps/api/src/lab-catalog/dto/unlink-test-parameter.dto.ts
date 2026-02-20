import { IsUUID } from 'class-validator';

export class UnlinkTestParameterDto {
  @IsUUID()
  testId: string;

  @IsUUID()
  parameterId: string;
}
