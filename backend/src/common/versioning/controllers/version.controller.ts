import { Controller, Get, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { VersionService } from '../services/version.service';
import {
  ApiVersionsResponseDto,
  MigrationGuideDto,
} from '../dto/version-info.dto';
import { ApiVersion } from '../version.enum';

@ApiTags('API Versioning')
@Controller('versions')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get()
  @ApiOperation({ summary: 'Get API version information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns information about all API versions',
    type: ApiVersionsResponseDto,
  })
  getVersions(): ApiVersionsResponseDto {
    return this.versionService.getVersionInfo();
  }

  @Get('migration-guide')
  @ApiOperation({ summary: 'Get migration guide between versions' })
  @ApiQuery({ name: 'from', enum: ApiVersion, description: 'Source version' })
  @ApiQuery({ name: 'to', enum: ApiVersion, description: 'Target version' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns migration guide between two versions',
    type: MigrationGuideDto,
  })
  getMigrationGuide(
    @Query('from') fromVersion: ApiVersion,
    @Query('to') toVersion: ApiVersion,
  ): MigrationGuideDto {
    return this.versionService.getMigrationGuide(fromVersion, toVersion);
  }
}
