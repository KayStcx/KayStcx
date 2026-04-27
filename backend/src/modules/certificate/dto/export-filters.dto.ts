import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExportFiltersDto {
  @ApiPropertyOptional({
    description: 'Full text search filter for exported certificates',
    example: 'data science',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Certificate status filter for export',
    example: 'active',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Export start date (ISO 8601)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Export end date (ISO 8601)',
    example: '2026-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class BulkExportDto {
  @ApiPropertyOptional({
    description: 'List of certificate IDs to export',
    example: ['a3d8a582-bd23-4a2d-9630-6d4a2f5fd6f0'],
  })
  @IsOptional()
  certificateIds?: string[];

  @ApiPropertyOptional({
    description: 'Optional filters to apply to the bulk export',
    type: ExportFiltersDto,
  })
  @IsOptional()
  filters?: ExportFiltersDto;
}
