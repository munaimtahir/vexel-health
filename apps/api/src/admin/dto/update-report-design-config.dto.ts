import { IsBoolean, IsIn, IsString } from 'class-validator';

export class UpdateReportDesignConfigDto {
  @IsBoolean()
  showLogo: boolean;

  @IsIn(['left', 'center', 'right'])
  logoPosition: string;

  @IsString()
  headerText1: string;

  @IsString()
  headerText2: string;

  @IsIn(['thin', 'none', 'accent'])
  headerDividerStyle: string;

  @IsIn(['compact', 'spacious'])
  patientLayoutStyle: string;

  @IsBoolean()
  showRefNumber: boolean;

  @IsBoolean()
  showConsultant: boolean;

  @IsBoolean()
  showSampleTime: boolean;

  @IsIn(['small', 'normal', 'large'])
  resultsFontSize: string;

  @IsBoolean()
  showUnitsColumn: boolean;

  @IsBoolean()
  showReferenceRange: boolean;

  @IsIn(['bold', 'color', 'border'])
  abnormalHighlightStyle: string;

  @IsString()
  footerText: string;

  @IsBoolean()
  showSignatories: boolean;

  @IsIn(['single', 'dual'])
  signatoryBlockStyle: string;
}
