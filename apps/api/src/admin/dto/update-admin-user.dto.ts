import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateAdminUserDto {
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleNames?: string[];
}
