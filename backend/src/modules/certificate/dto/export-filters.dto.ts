import { IsOptional, IsString, IsDateString } from 'class-validator';

export class ExportFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class BulkExportDto {
  @IsOptional()
  certificateIds?: string[];

  @IsOptional()
  filters?: ExportFiltersDto;
}
