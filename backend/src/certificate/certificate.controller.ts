import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CertificateStatsDto, StatsQueryDto } from './dto/stats.dto';
import { CertificateStatsService } from './services/stats.service';

@ApiTags('Certificate Statistics')
@Controller('certificates/stats')
// @UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CertificateStatsController {
  constructor(private readonly statsService: CertificateStatsService) {}

  @Get()
  // @Roles('admin', 'issuer')
  @ApiOperation({ summary: 'Get certificate statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns certificate statistics',
    type: CertificateStatsDto,
  })
  async getStatistics(
    @Query() query: StatsQueryDto,
  ): Promise<CertificateStatsDto> {
    return this.statsService.getStatistics(query);
  }
}
