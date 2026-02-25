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
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/constants/roles';

@ApiTags('Certificate Statistics')
@Controller('certificates/stats')
@ApiBearerAuth()
export class CertificateStatsController {
  constructor(private readonly statsService: CertificateStatsService) { }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ISSUER)
  @ApiOperation({ summary: 'Get detailed certificate statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns detailed certificate statistics',
    type: CertificateStatsDto,
  })
  async getCertificates(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('issuerId') issuerId?: string,
  ) {
    return this.certificateService.findAll(page, limit, issuerId, status);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get public certificate summary statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns basic certificate summary',
  })
  async getPublicSummary(): Promise<Partial<CertificateStatsDto>> {
    return this.statsService.getPublicSummary();
  }
}
