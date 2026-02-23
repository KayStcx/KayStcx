import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CertificateStatsDto, StatsQueryDto } from './dto/stats.dto';
import { CertificateStatsService } from './services/stats.service';

@ApiTags('Certificates')
@Controller('certificates')
// @UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Get()
  @ApiOperation({ summary: 'Get certificates (with optional status filter)' })
  @ApiResponse({
    status: 200,
    description: 'Returns certificates',
    type: Array,
  })
  async getCertificates(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('issuerId') issuerId?: string,
  ) {
    return this.certificateService.findAll(page, limit, issuerId, status);
  }
}
