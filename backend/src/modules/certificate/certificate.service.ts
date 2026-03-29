import {
  Injectable,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { Certificate } from './entities/certificate.entity';
import { Verification } from './entities/verification.entity';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { DuplicateDetectionConfig } from './interfaces/duplicate-detection.interface';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WebhookEvent } from '../webhooks/entities/webhook-subscription.entity';
import { MetadataSchemaService } from '../metadata-schema/services/metadata-schema.service';
import { FilesService } from '../files/services/files.service';
import { CertificateQrResponseDto } from './dto/certificate-qr-response.dto';
import { ExportFiltersDto } from './dto/export-filters.dto';
import { AuditService } from '../audit/services/audit.service';
import { AuditAction, AuditResourceType } from '../audit/constants';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    private readonly duplicateDetectionService: DuplicateDetectionService,
    private readonly webhooksService: WebhooksService,
    private readonly metadataSchemaService: MetadataSchemaService,
    private readonly filesService: FilesService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createCertificateDto: CreateCertificateDto,
    duplicateConfig?: DuplicateDetectionConfig,
    overrideReason?: string,
  ): Promise<Certificate> {
    // Check for duplicates if config is provided
    if (duplicateConfig?.enabled) {
      const duplicateCheck =
        await this.duplicateDetectionService.checkForDuplicates(
          createCertificateDto,
          duplicateConfig,
        );

      if (duplicateCheck.isDuplicate) {
        if (duplicateCheck.action === 'block') {
          throw new ConflictException({
            message: 'Certificate issuance blocked due to potential duplicate',
            details: duplicateCheck,
          });
        } else if (duplicateCheck.action === 'warn' && !overrideReason) {
          throw new ConflictException({
            message:
              'Warning: Potential duplicate detected. Override reason required.',
            details: duplicateCheck,
            requiresOverride: true,
          });
        }
      }
    }

    if (
      createCertificateDto.metadataSchemaId &&
      createCertificateDto.metadata
    ) {
      const validationResult = await this.metadataSchemaService.validate(
        createCertificateDto.metadataSchemaId,
        createCertificateDto.metadata,
      );
      if (!validationResult.valid) {
        throw new ConflictException({
          message: 'Certificate metadata failed schema validation',
          errors: validationResult.errors,
          schemaId: validationResult.schemaId,
          schemaVersion: validationResult.schemaVersion,
        });
      }
    }

    const certificate = this.certificateRepository.create({
      ...createCertificateDto,
      expiresAt:
        createCertificateDto.expiresAt || this.calculateDefaultExpiry(),
      verificationCode:
        createCertificateDto.verificationCode ||
        this.generateVerificationCode(),
      isDuplicate: false,
    });

    const savedCertificate = await this.certificateRepository.save(certificate);

    // If this was an override, mark it appropriately
    if (overrideReason) {
      savedCertificate.isDuplicate = true;
      savedCertificate.overrideReason = overrideReason;
      await this.certificateRepository.save(savedCertificate);
    }

    // Generate PDF and QR code for the certificate
    try {
      const verificationUrl = this.buildVerificationUrl(
        savedCertificate.verificationCode,
      );
      const { pdfUrl, qrUrl } =
        await this.filesService.generateAndUploadCertificate({
          tokenId: savedCertificate.id,
          recipientName: savedCertificate.recipientName,
          title: savedCertificate.title,
          description: savedCertificate.description,
          issuedAt: savedCertificate.issuedAt,
          expiresAt: savedCertificate.expiresAt,
          issuerName: savedCertificate.issuer?.name || 'Unknown Issuer',
          verificationUrl,
          metadata: savedCertificate.metadata,
        });

      savedCertificate.pdfUrl = pdfUrl;
      savedCertificate.qrCodeUrl = qrUrl;
      await this.certificateRepository.save(savedCertificate);

      this.logger.log(
        `Generated PDF and QR code for certificate: ${savedCertificate.id}`,
      );
    } catch (fileError) {
      this.logger.error(
        `Failed to generate PDF/QR for certificate ${savedCertificate.id}: ${fileError.message}`,
      );
      // Continue with certificate creation even if file generation fails
    }

    this.logger.log(
      `Certificate created: ${savedCertificate.id} for ${createCertificateDto.recipientEmail}`,
    );

    // Audit logging
    await this.auditService.log({
      action: AuditAction.CERTIFICATE_ISSUE,
      resourceType: AuditResourceType.CERTIFICATE,
      resourceId: savedCertificate.id,
      userId: savedCertificate.issuerId,
      userEmail: createCertificateDto.recipientEmail,
      status: 'success',
      metadata: {
        title: savedCertificate.title,
        recipientName: savedCertificate.recipientName,
        courseName: savedCertificate.courseName,
        templateId: savedCertificate.templateId,
      },
    });

    // Trigger webhook event
    await this.webhooksService.triggerEvent(
      WebhookEvent.CERTIFICATE_ISSUED,
      savedCertificate.issuerId,
      {
        id: savedCertificate.id,
        recipientEmail: savedCertificate.recipientEmail,
        recipientName: savedCertificate.recipientName,
        title: savedCertificate.title,
        issuedAt: savedCertificate.issuedAt,
        status: savedCertificate.status,
      },
    );

    return savedCertificate;
  }

  async findAll(
    page = 1,
    limit = 10,
    issuerId?: string,
    status?: string,
    search?: string,
    sortBy = 'issueDate',
    sortOrder = 'desc',
    startDate?: string,
    endDate?: string,
  ): Promise<{
    data: Array<Record<string, unknown>>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const queryBuilder = this.createCertificateQueryBuilder();

    this.applyCertificateFilters(queryBuilder, {
      issuerId,
      status,
      search,
      startDate,
      endDate,
    });
    this.applyCertificateSorting(queryBuilder, sortBy, sortOrder);

    const total = await queryBuilder.getCount();
    const certificates = await queryBuilder
      .skip((normalizedPage - 1) * normalizedLimit)
      .take(normalizedLimit)
      .getMany();

    return {
      data: certificates.map((certificate) =>
        this.serializeCertificateForFrontend(certificate),
      ),
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      totalPages: Math.max(1, Math.ceil(total / normalizedLimit)),
    };
  }

  async findOne(id: string): Promise<Certificate> {
    const certificate = await this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer')
      .where('certificate.id = :id', { id })
      .getOne();

    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${id} not found`);
    }

    return certificate;
  }

  async getCertificateQrCode(id: string): Promise<CertificateQrResponseDto> {
    const certificate = await this.findOne(id);

    if (!certificate.verificationCode) {
      throw new NotFoundException(
        `Certificate with ID ${id} does not have a verification code`,
      );
    }

    const verificationUrl = this.buildVerificationUrl(
      certificate.verificationCode,
    );
    const { qrUrl } = await this.filesService.generateAndUploadQrCode(
      verificationUrl,
      `certificate-${certificate.id}-qr`,
    );

    return {
      certificateId: certificate.id,
      verificationCode: certificate.verificationCode,
      verificationUrl,
      qrUrl,
    };
  }

  async findByVerificationCode(verificationCode: string): Promise<Certificate> {
    const certificate = await this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer')
      .where('certificate.verificationCode = :verificationCode', {
        verificationCode,
      })
      .andWhere('certificate.status = :status', { status: 'active' })
      .getOne();

    if (!certificate) {
      // Record failed verification if we want to track it
      throw new NotFoundException(
        'Certificate not found or invalid verification code',
      );
    }

    return certificate;
  }

  async verifyCertificate(verificationCode: string): Promise<Certificate> {
    try {
      const certificate = await this.findByVerificationCode(verificationCode);

      // Record successful verification
      await this.verificationRepository.save({
        certificate,
        success: true,
        verifiedAt: new Date(),
      });

      // Trigger webhook event
      await this.webhooksService.triggerEvent(
        WebhookEvent.CERTIFICATE_VERIFIED,
        certificate.issuerId,
        {
          id: certificate.id,
          verificationCode,
          verifiedAt: new Date(),
          recipientEmail: certificate.recipientEmail,
        },
      );

      // Audit logging
      await this.auditService.log({
        action: AuditAction.CERTIFICATE_VERIFY,
        resourceType: AuditResourceType.CERTIFICATE,
        resourceId: certificate.id,
        status: 'success',
        metadata: {
          verificationCode,
          recipientEmail: certificate.recipientEmail,
        },
      });

      return certificate;
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Option: Record failed verification in DB too
      }
      throw error;
    }
  }

  async update(
    id: string,
    updateCertificateDto: UpdateCertificateDto,
  ): Promise<Certificate> {
    const certificate = await this.findOne(id);

    Object.assign(certificate, updateCertificateDto);

    return this.certificateRepository.save(certificate);
  }

  async revoke(
    id: string,
    reason?: string,
    issuerId?: string,
    userRole?: string,
  ): Promise<Certificate> {
    const certificate = await this.findOne(id);

    if (userRole !== 'admin' && issuerId && certificate.issuerId !== issuerId) {
      throw new ForbiddenException(
        'You are not authorized to revoke this certificate',
      );
    }

    certificate.status = 'revoked';
    if (reason) {
      certificate.metadata = {
        ...certificate.metadata,
        revocationReason: reason,
        revokedAt: new Date(),
      };
    }

    const savedCertificate = await this.certificateRepository.save(certificate);

    // Trigger webhook event
    await this.webhooksService.triggerEvent(
      WebhookEvent.CERTIFICATE_REVOKED,
      savedCertificate.issuerId,
      {
        id: savedCertificate.id,
        status: savedCertificate.status,
        revocationReason: reason,
        revokedAt: new Date(),
      },
    );

    // Audit logging
    await this.auditService.log({
      action: AuditAction.CERTIFICATE_REVOKE,
      resourceType: AuditResourceType.CERTIFICATE,
      resourceId: savedCertificate.id,
      userId: issuerId,
      status: 'success',
      metadata: {
        reason,
        status: savedCertificate.status,
      },
    });

    return savedCertificate;
  }

  async freeze(id: string, reason?: string): Promise<Certificate> {
    const certificate = await this.findOne(id);

    if (certificate.status !== 'active') {
      throw new ConflictException(
        `Certificate must be active to freeze. Current status: ${certificate.status}`,
      );
    }

    certificate.status = 'frozen';
    if (reason) {
      certificate.metadata = {
        ...certificate.metadata,
        freezeReason: reason,
        frozenAt: new Date(),
      };
    }

    const savedCertificate = await this.certificateRepository.save(certificate);

    // Trigger webhook event
    await this.webhooksService.triggerEvent(
      WebhookEvent.CERTIFICATE_REVOKED, // Using existing revoked event, could add new freeze event
      savedCertificate.issuerId,
      {
        id: savedCertificate.id,
        status: savedCertificate.status,
        freezeReason: reason,
        frozenAt: new Date(),
      },
    );

    // Audit logging
    await this.auditService.log({
      action: AuditAction.CERTIFICATE_FREEZE,
      resourceType: AuditResourceType.CERTIFICATE,
      resourceId: savedCertificate.id,
      status: 'success',
      metadata: {
        reason,
        status: savedCertificate.status,
      },
    });

    return savedCertificate;
  }

  async unfreeze(id: string, reason?: string): Promise<Certificate> {
    const certificate = await this.findOne(id);

    if (certificate.status !== 'frozen') {
      throw new ConflictException(
        `Certificate must be frozen to unfreeze. Current status: ${certificate.status}`,
      );
    }

    certificate.status = 'active';
    if (reason) {
      certificate.metadata = {
        ...certificate.metadata,
        unfreezeReason: reason,
        unfrozenAt: new Date(),
      };
    }

    const savedCertificate = await this.certificateRepository.save(certificate);

    // Trigger webhook event
    await this.webhooksService.triggerEvent(
      WebhookEvent.CERTIFICATE_ISSUED, // Using existing issued event, could add new unfreeze event
      savedCertificate.issuerId,
      {
        id: savedCertificate.id,
        status: savedCertificate.status,
        unfreezeReason: reason,
        unfrozenAt: new Date(),
      },
    );

    // Audit logging
    await this.auditService.log({
      action: AuditAction.CERTIFICATE_UNFREEZE,
      resourceType: AuditResourceType.CERTIFICATE,
      resourceId: savedCertificate.id,
      status: 'success',
      metadata: {
        reason,
        status: savedCertificate.status,
      },
    });

    return savedCertificate;
  }

  async bulkRevoke(
    certificateIds: string[],
    reason?: string,
    issuerId?: string,
    userRole?: string,
  ): Promise<{
    revoked: Certificate[];
    failed: { id: string; error: string }[];
  }> {
    const revoked: Certificate[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of certificateIds) {
      try {
        const certificate = await this.revoke(id, reason, issuerId, userRole);
        revoked.push(certificate);
      } catch (error) {
        failed.push({
          id,
          error: error.message || 'Failed to revoke certificate',
        });
      }
    }

    return { revoked, failed };
  }

  private createCertificateQueryBuilder(): SelectQueryBuilder<Certificate> {
    return this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer');
  }

  private applyCertificateFilters(
    queryBuilder: SelectQueryBuilder<Certificate>,
    filters: {
      issuerId?: string;
      status?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    },
  ): void {
    if (filters.issuerId) {
      queryBuilder.andWhere('certificate.issuerId = :issuerId', {
        issuerId: filters.issuerId,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('certificate.status = :status', {
        status: filters.status,
      });
    }

    if (filters.search?.trim()) {
      const search = `%${filters.search.trim()}%`;
      queryBuilder.andWhere(
        new Brackets((builder) => {
          builder
            .where('CAST(certificate.id AS text) ILIKE :search', { search })
            .orWhere('certificate.recipientName ILIKE :search', { search })
            .orWhere('certificate.recipientEmail ILIKE :search', { search })
            .orWhere('certificate.title ILIKE :search', { search })
            .orWhere('certificate.courseName ILIKE :search', { search })
            .orWhere('certificate.verificationCode ILIKE :search', { search })
            .orWhere('issuer.name ILIKE :search', { search });
        }),
      );
    }

    if (filters.startDate) {
      queryBuilder.andWhere('certificate.issuedAt >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('certificate.issuedAt <= :endDate', {
        endDate: end,
      });
    }
  }

  private applyCertificateSorting(
    queryBuilder: SelectQueryBuilder<Certificate>,
    sortBy?: string,
    sortOrder?: string,
  ): void {
    const order = sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const sortColumnMap: Record<string, string> = {
      serialNumber: 'certificate.id',
      recipientName: 'certificate.recipientName',
      title: 'certificate.title',
      issuerName: 'issuer.name',
      issueDate: 'certificate.issuedAt',
      status: 'certificate.status',
    };

    queryBuilder.orderBy(
      sortColumnMap[sortBy || 'issueDate'] || 'certificate.issuedAt',
      order,
    );
  }

  private serializeCertificateForFrontend(certificate: Certificate) {
    const metadata = certificate.metadata ?? {};

    return {
      id: certificate.id,
      serialNumber: certificate.verificationCode || certificate.id,
      recipientName: certificate.recipientName,
      recipientEmail: certificate.recipientEmail,
      title: certificate.title,
      courseName: certificate.courseName,
      issuerName: certificate.issuer?.name || 'Unknown Issuer',
      issueDate: certificate.issuedAt.toISOString(),
      expiryDate: certificate.expiresAt?.toISOString(),
      status: certificate.status,
      pdfUrl: certificate.pdfUrl,
      metadata: certificate.metadata,
      frozenAt: metadata.frozenAt,
      freezeReason: metadata.freezeReason,
      unfreezeAt: metadata.unfrozenAt,
    };
  }

  async exportCertificates(
    issuerId?: string,
    status?: string,
  ): Promise<Certificate[]> {
    const queryBuilder = this.createCertificateQueryBuilder();
    this.applyCertificateFilters(queryBuilder, { issuerId, status });
    this.applyCertificateSorting(queryBuilder, 'issueDate', 'desc');

    return queryBuilder.getMany();
  }

  async bulkExport(
    certificateIds: string[],
    filters?: ExportFiltersDto,
  ): Promise<string> {
    const queryBuilder = this.createCertificateQueryBuilder();

    if (certificateIds && certificateIds.length > 0) {
      queryBuilder.andWhere('certificate.id IN (:...certificateIds)', {
        certificateIds,
      });
    }

    this.applyCertificateFilters(queryBuilder, filters ?? {});
    this.applyCertificateSorting(queryBuilder, 'issueDate', 'desc');

    const certificates = await queryBuilder.getMany();
    return this.convertToCSV(certificates);
  }

  async exportAllFiltered(filters?: ExportFiltersDto): Promise<string> {
    const queryBuilder = this.createCertificateQueryBuilder();
    this.applyCertificateFilters(queryBuilder, filters ?? {});
    this.applyCertificateSorting(queryBuilder, 'issueDate', 'desc');

    const certificates = await queryBuilder.getMany();
    return this.convertToCSV(certificates);
  }

  private convertToCSV(certificates: Certificate[]): string {
    const headers = [
      'ID',
      'Serial Number',
      'Recipient Name',
      'Recipient Email',
      'Title',
      'Course Name',
      'Issuer Name',
      'Issue Date',
      'Status',
      'Expiry Date',
    ];

    const rows = certificates.map((cert) => [
      cert.id,
      cert.verificationCode || cert.id,
      cert.recipientName,
      cert.recipientEmail,
      cert.title,
      cert.courseName,
      cert.issuer?.name || 'Unknown',
      cert.issuedAt.toISOString().split('T')[0],
      cert.status,
      cert.expiresAt ? cert.expiresAt.toISOString().split('T')[0] : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  async remove(id: string): Promise<void> {
    const certificate = await this.findOne(id);
    await this.certificateRepository.remove(certificate);
  }

  async getCertificatesByRecipient(email: string): Promise<Certificate[]> {
    return this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer')
      .where('certificate.recipientEmail = :email', { email })
      .orderBy('certificate.issuedAt', 'DESC')
      .getMany();
  }

  async getCertificatesByIssuer(issuerId: string): Promise<Certificate[]> {
    return this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer')
      .where('certificate.issuerId = :issuerId', { issuerId })
      .orderBy('certificate.issuedAt', 'DESC')
      .getMany();
  }

  async getDuplicateCertificates(): Promise<Certificate[]> {
    return this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer')
      .where('certificate.isDuplicate = :isDuplicate', { isDuplicate: true })
      .orderBy('certificate.issuedAt', 'DESC')
      .getMany();
  }

  private calculateDefaultExpiry(): Date {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1); // Default 1 year expiry
    return expiry;
  }

  private generateVerificationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private buildVerificationUrl(verificationCode: string): string {
    const appUrl =
      process.env.APP_URL ||
      this.configService.get<string>('APP_URL') ||
      this.configService.get<string>('ALLOWED_ORIGINS')?.split(',')[0] ||
      'http://localhost:5173';

    const normalizedBaseUrl = appUrl.replace(/\/+$/, '');
    return `${normalizedBaseUrl}/verify?serial=${encodeURIComponent(verificationCode)}`;
  }
}
