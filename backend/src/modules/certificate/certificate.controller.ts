import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Post,
  Body,
  Delete,
  Patch,
} from '@nestjs/common';
import { CertificateService } from './certificate.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CertificateStatsDto } from './dto/stats.dto';
import { CertificateStatsService } from './services/stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/roles';
import { Certificate } from './entities/certificate.entity';
import { CreateCertificateDto } from './dto/create-certificate.dto';

@ApiTags('Certificates')
@Controller('certificates')
@ApiBearerAuth()
export class CertificateController {
  constructor(
    private readonly certificateService: CertificateService,
    private readonly statsService: CertificateStatsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ISSUER)
  @ApiOperation({ summary: 'List certificates' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('issuerId') issuerId?: string,
    @Query('status') status?: string,
  ) {
    return this.certificateService.findAll(page, limit, issuerId, status);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get public certificate summary statistics' })
  async getPublicSummary(): Promise<Partial<CertificateStatsDto>> {
    return this.statsService.getPublicSummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get certificate by ID' })
  async findOne(@Param('id') id: string) {
    return this.certificateService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new certificate' })
  async create(@Body() dto: CreateCertificateDto) {
    return this.certificateService.create(dto);
  }

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Revoke certificate' })
  async revoke(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.certificateService.revoke(id, reason);
  }
}
