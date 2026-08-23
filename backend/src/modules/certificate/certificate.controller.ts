import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Post,
  Body,
  Patch,
  Delete,
  ParseUUIDPipe,
  Req,
  Res,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CertificateService } from './certificate.service';
import { CertificatePdfService } from './services/pdf.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CertificateStatsDto, StatsQueryDto } from './dto/stats.dto';
import { CertificateStatsService } from './services/stats.service';
import { JwtAuthGuard } from 'src/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/constants/roles';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { RevokeCertificateDto } from './dto/revoke-certificate.dto';
import { SearchCertificatesDto } from './dto/search-certificates.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}
import { CertificateQrResponseDto } from './dto/certificate-qr-response.dto';
import { ExportFiltersDto, BulkExportDto } from './dto/export-filters.dto';
import { IpRateLimitGuard } from '../../common/guards/ip-rate-limit.guard';
import {
  CertificateResponseDto,
  CertificateListResponseDto,
} from './dto/certificate-response.dto';
import {
  BulkRevokeDto,
  BulkRevokeResponseDto,
} from './dto/bulk-revoke.dto';
import { VerificationHistoryResponseDto } from './dto/verification-history-response.dto';
import { StellarTransactionResponseDto } from './dto/stellar-transaction-response.dto';

@ApiTags('Certificates')
@Controller('certificates')
@ApiBearerAuth()
export class CertificateController {
  constructor(
    private readonly certificateService: CertificateService,
    private readonly statsService: CertificateStatsService,
    private readonly pdfService: CertificatePdfService,
  ) {}

  // ─── List / Search ──────────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ISSUER)
  @ApiOperation({ summary: 'List certificates with optional filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'issuerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({
    status: 200,
    description: 'List of certificates with total count',
    type: CertificateListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('issuerId') issuerId?: string,
    @Query('status') status?: string,
  ) {
    return this.certificateService.findAll(+page, +limit, issuerId, status);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ISSUER)
  @ApiOperation({
    summary: 'Advanced certificate search with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Matching certificates',
    type: CertificateResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(@Query() dto: SearchCertificatesDto) {
    return this.certificateService.search(dto);
  }

  // ─── Statistics ──────────────────────────────────────────────────────────────

  @Get('stats/summary')
  @Public()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get public certificate summary statistics' })
  @ApiResponse({
    status: 200,
    description: 'Public certificate summary statistics',
    type: CertificateStatsDto,
  })
  async getPublicSummary(): Promise<Partial<CertificateStatsDto>> {
    return this.statsService.getPublicSummary();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ISSUER, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Detailed certificate statistics' })
  @ApiResponse({
    status: 200,
    description: 'Detailed certificate statistics',
    type: CertificateStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatistics(
    @Query() query: StatsQueryDto,
  ): Promise<CertificateStatsDto> {
    return this.statsService.getStatistics(query);
  }

  // ─── Verification (public) ───────────────────────────────────────────────────

  @Get('verify/:code')
  @Public()
  @ApiOperation({ summary: 'Verify a certificate by its verification code' })
  @ApiParam({
    name: 'code',
    description: 'Alphanumeric certificate verification code',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification result',
    type: CertificateResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async verifyByCode(
    @Param('code') code: string,
    @Req() req: Request,
    @Query('verifiedBy') verifiedBy?: string,
  ): Promise<unknown> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) ?? req.ip ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.certificateService.verifyByCode(
      code,
      verifiedBy ?? 'public',
      ipAddress,
      userAgent,
    );
  }

  @Get('verify/stellar/:hash')
  @Public()
  @ApiOperation({
    summary: 'Verify a certificate using its Stellar transaction hash',
  })
  @ApiParam({
    name: 'hash',
    description: 'Stellar blockchain transaction hash',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification result',
    type: CertificateResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async verifyByStellarHash(
    @Param('hash') hash: string,
    @Req() req: Request,
  ): Promise<unknown> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) ?? req.ip ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.certificateService.verifyByStellarHash(
      hash,
      ipAddress,
      userAgent,
    );
  }

  // ─── Recipient & Issuer scoped ───────────────────────────────────────────────

  @Get('recipient/:email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ISSUER)
  @ApiOperation({ summary: 'List all certificates for a recipient email' })
  @ApiParam({ name: 'email', description: 'Recipient email address' })
  @ApiResponse({
    status: 200,
    description: 'Certificates for the recipient',
    type: CertificateResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Recipient not found' })
  async getByRecipient(
    @Param('email') email: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.certificateService.getCertificatesByRecipient(
      email,
      +page,
      +limit,
    );
  }

  @Get('issuer/:issuerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ISSUER)
  @ApiOperation({ summary: 'List all certificates issued by an issuer' })
  @ApiParam({ name: 'issuerId', description: 'Issuer UUID' })
  @ApiResponse({
    status: 200,
    description: 'Certificates issued by the issuer',
    type: CertificateResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Issuer not found' })
  async getByIssuer(
    @Param('issuerId', ParseUUIDPipe) issuerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.certificateService.getCertificatesByIssuer(
      issuerId,
      +page,
      +limit,
    );
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ISSUER, UserRole.USER)
  @ApiOperation({ summary: 'List all certificates for a user with pagination' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Certificates for the user',
    type: CertificateResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserCertificates(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.certificateService.getUserCertificates(userId, +page, +limit);
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export certificates' })
  @ApiResponse({
    status: 200,
    description: 'Exported certificates',
    type: CertificateResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportCertificates(
    @Query('issuerId') issuerId?: string,
    @Query('status') status?: string,
  ) {
    return this.certificateService.exportCertificates(issuerId, status);
  }

  // ─── Single Certificate ───────────────────────────────────────────────────────

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download certificate as PDF' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({
    status: 200,
    description: 'PDF file stream',
    content: {
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async getCertificatePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const certificate = await this.certificateService.findOne(id);
    const buffer = await this.pdfService.generate(certificate);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${certificate.certificateId}.pdf"`,
    );
    res.end(buffer);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Get QR code URL for a certificate' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({
    status: 200,
    description: 'QR code generated successfully',
    type: CertificateQrResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async getQrCode(@Param('id') id: string): Promise<CertificateQrResponseDto> {
    return this.certificateService.getCertificateQrCode(id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get certificate details by ID' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({
    status: 200,
    description: 'Certificate details',
    type: CertificateResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.certificateService.findOne(id);
  }

  @Get(':id/stellar')
  @Public()
  @ApiOperation({
    summary: 'Get the Stellar blockchain record for a certificate',
  })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({
    status: 200,
    description: 'Stellar blockchain record',
    type: StellarTransactionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async getStellarData(@Param('id', ParseUUIDPipe) id: string) {
    return this.certificateService.getStellarTransactionData(id);
  }

  @Get(':id/verification-history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ISSUER, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Get verification history for a certificate' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({
    status: 200,
    description: 'Verification history',
    type: VerificationHistoryResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async getVerificationHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.certificateService.getVerificationHistory(id);
  }

  @Get(':id/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ISSUER)
  @ApiOperation({ summary: 'Export certificate data for backup or audit' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({
    status: 200,
    description: 'Exported certificate data',
    type: CertificateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async exportCertificate(@Param('id', ParseUUIDPipe) id: string) {
    return this.certificateService.exportCertificate(id);
  }

  // ─── Issue ───────────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Issue a new certificate with optional Stellar blockchain record',
  })
  @ApiBody({ type: IssueCertificateDto })
  @ApiResponse({
    status: 201,
    description: 'Certificate issued successfully',
    type: CertificateResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async issue(
    @Body() dto: IssueCertificateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) ?? req.ip ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.certificateService.issue(dto, user.id, ipAddress, userAgent);
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update non-immutable certificate fields' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiBody({ type: UpdateCertificateDto })
  @ApiResponse({
    status: 200,
    description: 'Updated certificate',
    type: CertificateResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCertificateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.certificateService.updateWithUser(id, dto, user.id);
  }

  // ─── Revoke ───────────────────────────────────────────────────────────────────

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Revoke a certificate' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiBody({ type: RevokeCertificateDto })
  @ApiResponse({
    status: 200,
    description: 'Certificate revoked',
    type: CertificateResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeCertificateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<unknown> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) ?? req.ip ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.certificateService.revokeWithUser(
      id,
      dto,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a certificate (admin only)' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({ status: 204, description: 'Certificate deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.certificateService.remove(id);
  }

  @Patch(':id/freeze')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Freeze certificate' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({
    status: 200,
    description: 'Frozen certificate',
    type: CertificateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async freeze(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.certificateService.freeze(id, reason);
  }

  @Patch(':id/unfreeze')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Unfreeze certificate' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({
    status: 200,
    description: 'Unfrozen certificate',
    type: CertificateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async unfreeze(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.certificateService.unfreeze(id, reason);
  }

  @Post('bulk-revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk revoke certificates' })
  @ApiBody({ type: BulkRevokeDto })
  @ApiResponse({
    status: 201,
    description: 'Bulk revoke result',
    type: BulkRevokeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async bulkRevoke(
    @Body('certificateIds') certificateIds: string[],
    @Body('reason') reason?: string,
    @CurrentUser('id') issuerId?: string,
    @CurrentUser('role') userRole?: string,
  ) {
    return this.certificateService.bulkRevoke(
      certificateIds,
      reason,
      issuerId,
      userRole,
    );
  }

  @Post('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk export certificates with filters' })
  @ApiBody({ type: BulkExportDto })
  @ApiResponse({
    status: 201,
    description: 'CSV export',
    content: {
      'text/csv': { schema: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async bulkExport(@Body() bulkExportDto: BulkExportDto, @Res() res: any) {
    const csvData = await this.certificateService.bulkExport(
      bulkExportDto.certificateIds || [],
      bulkExportDto.filters,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificates-export-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csvData);
  }

  @Post('export/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export all certificates matching filters' })
  @ApiBody({ type: ExportFiltersDto })
  @ApiResponse({
    status: 201,
    description: 'CSV export',
    content: {
      'text/csv': { schema: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportAllFiltered(@Body() filters: ExportFiltersDto, @Res() res: any) {
    const csvData = await this.certificateService.exportAllFiltered(filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificates-export-all-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csvData);
  }
}
