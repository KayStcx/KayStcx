import { IsEmail, IsIn, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateExportDto {
  @IsEmail()
  requesterEmail: string;

  @IsOptional()
  @IsIn(['pdf', 'csv', 'json'])
  format?: 'pdf' | 'csv' | 'json' = 'csv';

  @IsOptional()
  @IsIn(['active', 'revoked', 'expired'])
  status?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  issuerId?: string;
}
