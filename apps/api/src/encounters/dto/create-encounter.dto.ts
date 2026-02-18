import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

const allowedEncounterTypes = ['LAB', 'RAD', 'OPD', 'BB', 'IPD'] as const;

export class CreateEncounterDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsIn(allowedEncounterTypes)
  type: (typeof allowedEncounterTypes)[number];

  @IsDateString()
  @IsOptional()
  startedAt?: string;
}
