import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { RevokeCertificateDto } from './dto/revoke-certificate.dto';
import { SearchCertificatesDto } from './dto/search-certificates.dto';
import { Certificate } from './entities/certificate.entity';
import { Verification } from './entities/verification.entity';
import { CertificateStatus } from './constants/certificate-status.enum';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { DuplicateDetectionConfig } from './interfaces/duplicate-detection.interface';
import {
  CertificateRepository,
  PaginatedCertificates,
} from './repositories/certificate.repository';
import { CertificateMapper } from './mappers/certificate.mapper';
import { VerificationResult } from './interfaces/verification-result.interface';
import { KaystcxificateData } from './interfaces/kaystcxificate-data.interface';
import { StellarService } from '../stellar/services/stellar.service';
import { AuditService } from '../audit/services/audit.service';
import { AuditAction } from '../audit/constants/audit-action.enum';
import { AuditResourceType } from '../audit/constants/audit-resource-type.enum';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WebhookEvent } from '../webhooks/entities/webhook-subscription.entity';
import { MetadataSchemaService } from '../metadata-schema/services/metadata-schema.service';
import { FilesService } from '../files/services/files.service';
import { CertificateQrResponseDto } from './dto/certificate-qr-response.dto';
import { LoggingService } from "../../common/logging/logging.service";

@Injectable()
export class CertificateService {
  private readonly enableSoroban: boolean;

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    private readonly certRepo: CertificateRepository,
    private readonly duplicateDetectionService: DuplicateDetectionService,
    private readonly webhooksService: WebhooksService,
    private readonly metadataSchemaService: MetadataSchemaService,
    private readonly stellarService: StellarService,
    private readonly auditService: AuditService,
    private readonly mapper: CertificateMapper,
    private readonly filesService: FilesService,
    private readonly configService: ConfigService, private readonly logger: LoggingService
  ) {
    this.enableSoroban = this.configService.get<boolean>('ENABLE_SOROBAN_INTEGRATION', false) || false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Certificate Issuance
  // ─────────────────────────────────────────────────────────────────────────────

  /** Alias for `issue()` used by legacy tests and tooling. */
  async create(
    dto: CreateCertificateDto,
    ipAddress = 'unknown',
    userAgent = 'unknown',
  ): Promise<Certificate> {
    return this.issue(
      dto as unknown as IssueCertificateDto,
      dto.issuerId,
      ipAddress,
      userAgent,
    );
  }

  async issue(
    dto: IssueCertificateDto,
    issuedByUserId: string,
    ipAddress = 'unknown',
    userAgent = 'unknown',
  ): Promise<Certificate> {
    if (dto.metadataSchemaId && dto.metadata) {
      const validation = await this.metadataSchemaService.validate(
        dto.metadataSchemaId,
        dto.metadata,
      );
      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Certificate metadata failed schema validation',
          errors: validation.errors,
          schemaId: validation.schemaId,
        });
      }
    }

    const certId = await this.generateCertificateId();
    const verificationCode =
      dto.verificationCode ?? this.generateVerificationCode();
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : this.calculateDefaultExpiry();

    const memoText = certId.substring(0, 28);

    const certDataForStellar: KaystcxificateData = {
      certificateId: certId,
      recipientName: dto.recipientName,
      recipientEmail: dto.recipientEmail,
      title: dto.title,
      issuerId: dto.issuerId,
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      verificationCode,
    };

    let stellarTransactionHash: string | undefined;
    let stellarMemo: string | undefined;
    let stellarSequenceNumber: string | undefined;

    if (!dto.skipStellar) {
      try {
        const destination =
          dto.recipientStellarAddress ?? dto.issuerStellarAddress;
        if (destination) {
          const txResult =
            await this.stellarService.createCertificateTransaction(
              destination,
              memoText,
            );
          if (txResult.successful) {
            stellarTransactionHash = txResult.hash;
            stellarMemo = JSON.stringify(certDataForStellar);
            try {
              if (dto.issuerStellarAddress) {
                const acct = await this.stellarService.getAccountInfo(
                  dto.issuerStellarAddress,
                );
                stellarSequenceNumber = acct.sequence;
              }
            } catch {
              // Non-critical
            }
          } else {
            this.logger.warn(
              `Stellar tx failed for ${certId}: ${txResult.error}. Saving without blockchain record.`,
            );
          }
        }
      } catch (err: unknown) {
        this.logger.warn(
          `Stellar error for cert ${certId}: ${err instanceof Error ? err.message : String(err)}. Proceeding.`,
        );
      }
    }

    const qrCodeData = await this.generateQrCode(certId, verificationCode);

    const certificate = this.certificateRepository.create({
      certificateId: certId,
      issuerId: dto.issuerId,
      issuerName: dto.issuerName,
      issuerStellarAddress: dto.issuerStellarAddress,
      recipientEmail: dto.recipientEmail,
      recipientName: dto.recipientName,
      recipientStellarAddress: dto.recipientStellarAddress,
      title: dto.title,
      description: dto.description,
      metadata: dto.metadata,
      metadataSchemaId: dto.metadataSchemaId,
      status: CertificateStatus.ACTIVE,
      verificationCode,
      verificationCount: 0,
      stellarTransactionHash,
      stellarMemo,
      stellarSequenceNumber,
      qrCodeData,
      isDuplicate: false,
      expiresAt,
    });

    const saved = await this.certificateRepository.save(certificate);

    void this.auditService.log({
      action: AuditAction.CERTIFICATE_ISSUE,
      resourceType: AuditResourceType.CERTIFICATE,
      resourceId: saved.id,
      userId: issuedByUserId,
      ipAddress,
      userAgent,
      metadata: {
        certificateId: certId,
        recipientEmail: dto.recipientEmail,
        hasStellarRecord: !!stellarTransactionHash,
      },
      status: 'success',
    });

    void this.webhooksService.triggerEvent(
      WebhookEvent.CERTIFICATE_ISSUED,
      saved.issuerId,
      {
        id: saved.id,
        certificateId: saved.certificateId,
        recipientEmail: saved.recipientEmail,
        recipientName: saved.recipientName,
        title: saved.title,
        issuedAt: saved.issuedAt,
        status: saved.status,
        stellarTransactionHash: saved.stellarTransactionHash,
      },
    );

    return saved;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Verification
  // ─────────────────────────────────────────────────────────────────────────────

  async verifyByCode(
    verificationCode: string,
    verifiedBy = 'anonymous',
    ipAddress = 'unknown',
    userAgent = 'unknown',
  ): Promise<VerificationResult> {
    const certificate =
      await this.certRepo.findByVerificationCode(verificationCode);

    if (!certificate) {
      return {
        isValid: false,
        stellarVerified: false,
        verifiedAt: new Date(),
        message: 'Certificate not found or invalid verification code.',
      };
    }

    if (certificate.status === CertificateStatus.REVOKED) {
      return {
        isValid: false,
        certificate: this.mapper.toVerificationData(certificate),
        stellarVerified: false,
        verifiedAt: new Date(),
        message: `Certificate is revoked: ${certificate.revocationReason ?? 'No reason provided.'}`,
      };
    }

    if (
      certificate.isExpired() ||
      certificate.status === CertificateStatus.EXPIRED
    ) {
      return {
        isValid: false,
        certificate: this.mapper.toVerificationData(certificate),
        stellarVerified: false,
        verifiedAt: new Date(),
        message: 'Certificate has expired.',
      };
    }

    let stellarVerified = false;
    if (certificate.stellarTransactionHash) {
      try {
        const txResult = await this.stellarService.verifyTransaction(
          certificate.stellarTransactionHash,
        );
        stellarVerified = txResult.successful;
      } catch {
        this.logger.warn(
          `Could not verify Stellar tx for cert ${certificate.id}`,
        );
      }
    }

    certificate.addVerificationRecord(verifiedBy, ipAddress, userAgent);
    await this.certificateRepository.save(certificate);

    await this.verificationRepository.save({ certificate, success: true });

    void this.webhooksService.triggerEvent(
      WebhookEvent.CERTIFICATE_VERIFIED,
      certificate.issuerId,
      {
        id: certificate.id,
        verificationCode,
        verifiedAt: new Date(),
        recipientEmail: certificate.recipientEmail,
        stellarVerified,
      },
    );

    void this.auditService.log({
      action: AuditAction.CERTIFICATE_VERIFY,
      resourceType: AuditResourceType.CERTIFICATE,
      resourceId: certificate.id,
      ipAddress,
      userAgent,
      metadata: { verifiedBy, stellarVerified },
      status: 'success',
    });

    return {
      isValid: true,
      certificate: this.mapper.toVerificationData(certificate),
      stellarVerified,
      stellarTransactionHash: certificate.stellarTransactionHash,
      verifiedAt: new Date(),
      message: 'Certificate is valid and authentic.',
    };
  }

  /** Forward-compat alias used by the controller */
  async verifyCertificate(verificationCode: string): Promise<Certificate> {
    const certificate = await this.findByVerificationCode(verificationCode);

    await this.verificationRepository.save({ certificate, success: true });

    void this.webhooksService.triggerEvent(
      WebhookEvent.CERTIFICATE_VERIFIED,
      certificate.issuerId,
      {
        id: certificate.id,
        verificationCode,
        verifiedAt: new Date(),
        recipientEmail: certificate.recipientEmail,
      },
    );

    return certificate;
  }

  async verifyByStellarHash(
    hash: string,
    ipAddress = 'unknown',
    userAgent = 'unknown',
  ): Promise<VerificationResult> {
    const certificate = await this.certRepo.findByStellarTransactionHash(hash);

    const txResult = await this.stellarService.verifyTransaction(hash);

    if (!certificate) {
      return {
        isValid: false,
        stellarVerified: txResult.successful,
        verifiedAt: new Date(),
        message: txResult.successful
          ? 'Stellar transaction exists but no matching certificate found in database.'
          : 'Stellar transaction not found.',
      };
    }

    if (certificate.status === CertificateStatus.REVOKED) {
      return {
        isValid: false,
        certificate: this.mapper.toVerificationData(certificate),
        stellarVerified: txResult.successful,
        verifiedAt: new Date(),
        message: `Certificate is revoked: ${certificate.revocationReason ?? 'No reason provided.'}`,
      };
    }

    void this.auditService.log({
      action: AuditAction.CERTIFICATE_VERIFY,
      resourceType: AuditResourceType.CERTIFICATE,
      resourceId: certificate.id,
      ipAddress,
      userAgent,
      metadata: {
        method: 'stellar_hash',
        hash,
        stellarVerified: txResult.successful,
      },
      status: 'success',
    });

    return {
      isValid: certificate.isActive() && txResult.successful,
      certificate: this.mapper.toVerificationData(certificate),
      stellarVerified: txResult.successful,
      stellarTransactionHash: hash,
      verifiedAt: new Date(),
      message: txResult.successful
        ? 'Certificate and Stellar transaction are both valid.'
        : 'Certificate found in database but Stellar could not be verified.',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Revocation
  // ─────────────────────────────────────────────────────────────────────────────

  async revoke(
    id: string,
    reasonOrDto: RevokeCertificateDto | string | undefined,
    revokedByUserId = 'system',
    ipAddress = 'unknown',
    userAgent = 'unknown',
  ): Promise<Certificate> {
    const certificate = await this.findOne(id);

    if (!certificate.canBeRevoked()) {
      throw new BadRequestException(
        `Certificate cannot be revoked. Current status: ${certificate.status}`,
      );
    }

    const reason =
      typeof reasonOrDto === 'string'
        ? reasonOrDto
        : ((reasonOrDto as RevokeCertificateDto)?.reason ??
          'No reason provided');

    const before = { status: certificate.status };

    certificate.status = CertificateStatus.REVOKED;
    certificate.revocationReason = reason;
    certificate.revokedAt = new Date();
    certificate.revokedBy = revokedByUserId;
    // metadata is typed as CertificateMetadata; cast to include revocation details
    certificate.metadata = {
      ...(certificate.metadata ?? {}),
      additionalFields: {
        ...((certificate.metadata?.additionalFields as Record<
          string,
          unknown
        >) ?? {}),
        revocationReason: reason,
        revokedAt: certificate.revokedAt,
      },
    };

    const saved = await this.certificateRepository.save(certificate);

    void this.auditService.log({
      action: AuditAction.CERTIFICATE_REVOKE,
      resourceType: AuditResourceType.CERTIFICATE,
      resourceId: saved.id,
      userId: revokedByUserId,
      ipAddress,
      userAgent,
      changes: { before, after: { status: saved.status } },
      metadata: { reason },
      status: 'success',
    });

    void this.webhooksService.triggerEvent(
      WebhookEvent.CERTIFICATE_REVOKED,
      saved.issuerId,
      {
        id: saved.id,
        certificateId: saved.certificateId,
        status: saved.status,
        revocationReason: reason,
        revokedAt: saved.revokedAt,
      },
    );

    return saved;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────────

  async search(dto: SearchCertificatesDto): Promise<PaginatedCertificates> {
    return this.certRepo.search(dto);
  }

  async findAll(
    page = 1,
    limit = 10,
    issuerId?: string,
    status?: string,
  ): Promise<{ certificates: Certificate[]; total: number }> {
    const qb = this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer')
      .orderBy('certificate.issuedAt', 'DESC');

    if (issuerId) {
      qb.andWhere('certificate.issuerId = :issuerId', { issuerId });
    }
    if (status) {
      qb.andWhere('certificate.status = :status', { status });
    }

    const total = await qb.getCount();
    const certificates = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { certificates, total };
  }

  async findOne(id: string): Promise<Certificate> {
    const certificate = await this.certRepo.findById(id);
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
    const certificate =
      await this.certRepo.findByVerificationCode(verificationCode);
    if (!certificate) {
      throw new NotFoundException(
        'Certificate not found or invalid verification code',
      );
    }
    return certificate;
  }

  async getCertificatesByRecipient(
    email: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedCertificates> {
    return this.certRepo.findByRecipientEmail(email, page, limit);
  }

  async getCertificatesByIssuer(
    issuerId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedCertificates> {
    return this.certRepo.findByIssuerId(issuerId, page, limit);
  }

  async getDuplicateCertificates(): Promise<Certificate[]> {
    return this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer')
      .where('certificate.isDuplicate = :isDuplicate', { isDuplicate: true })
      .orderBy('certificate.issuedAt', 'DESC')
      .getMany();
  }

  async getVerificationHistory(
    id: string,
  ): Promise<Certificate['verificationHistory']> {
    const cert = await this.findOne(id);
    return cert.verificationHistory ?? [];
  }

  async getStellarTransactionData(id: string) {
    const cert = await this.findOne(id);

    if (!cert.stellarTransactionHash) {
      return {
        hasStellarRecord: false,
        message: 'No Stellar transaction for this certificate.',
      };
    }

    try {
      const txResult = await this.stellarService.verifyTransaction(
        cert.stellarTransactionHash,
      );
      return {
        hasStellarRecord: true,
        hash: cert.stellarTransactionHash,
        memo: cert.stellarMemo,
        verified: txResult.successful,
        ledger: txResult.ledger,
      };
    } catch (err: unknown) {
      return {
        hasStellarRecord: true,
        hash: cert.stellarTransactionHash,
        verified: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async exportCertificate(id: string): Promise<Record<string, unknown>> {
    const cert = await this.findOne(id);
    return {
      certificateId: cert.certificateId,
      title: cert.title,
      recipientName: cert.recipientName,
      recipientEmail: cert.recipientEmail,
      issuerName: cert.issuerName ?? cert.issuer?.name,
      status: cert.status,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt,
      metadata: cert.metadata,
      stellarTransactionHash: cert.stellarTransactionHash,
      verificationCode: cert.verificationCode,
      qrCodeData: cert.qrCodeData,
      exportedAt: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Update / Delete
  // ─────────────────────────────────────────────────────────────────────────────

  async update(
    id: string,
    updateCertificateDto: UpdateCertificateDto,
    updatedByUserId = 'system',
  ): Promise<Certificate> {
    const certificate = await this.findOne(id);
    const before = { status: certificate.status, title: certificate.title };

    Object.assign(certificate, updateCertificateDto);

    const saved = await this.certificateRepository.save(certificate);

    void this.auditService.log({
      action: AuditAction.CERTIFICATE_UPDATE,
      resourceType: AuditResourceType.CERTIFICATE,
      resourceId: saved.id,
      userId: updatedByUserId,
      changes: { before, after: { status: saved.status, title: saved.title } },
      status: 'success',
    });

    return saved;
  }

  async freeze(id: string, reason?: string): Promise<Certificate> {
    const certificate = await this.findOne(id);

    if (certificate.status !== CertificateStatus.ACTIVE) {
      throw new ConflictException(
        `Certificate must be active to freeze. Current status: ${certificate.status}`,
      );
    }

    certificate.status = CertificateStatus.FROZEN;
    if (reason) {
      certificate.metadata = {
        ...certificate.metadata,
        additionalFields: {
          ...((certificate.metadata?.additionalFields as Record<
            string,
            unknown
          >) ?? {}),
          freezeReason: reason,
          frozenAt: new Date(),
        },
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

    if (certificate.status !== CertificateStatus.FROZEN) {
      throw new ConflictException(
        `Certificate must be frozen to unfreeze. Current status: ${certificate.status}`,
      );
    }

    certificate.status = CertificateStatus.ACTIVE;
    if (reason) {
      certificate.metadata = {
        ...certificate.metadata,
        additionalFields: {
          ...((certificate.metadata?.additionalFields as Record<
            string,
            unknown
          >) ?? {}),
          unfreezeReason: reason,
          unfrozenAt: new Date(),
        },
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

  async exportCertificates(
    issuerId?: string,
    status?: string,
  ): Promise<Certificate[]> {
    const queryBuilder = this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer')
      .orderBy('certificate.issuedAt', 'DESC');

    if (issuerId) {
      queryBuilder.andWhere('certificate.issuerId = :issuerId', { issuerId });
    }

    if (status) {
      queryBuilder.andWhere('certificate.status = :status', { status });
    }

    return queryBuilder.getMany();
  }

  async bulkExport(certificateIds: string[], filters?: any): Promise<string> {
    const queryBuilder = this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer')
      .orderBy('certificate.issuedAt', 'DESC');

    // Apply certificate ID filter if provided
    if (certificateIds && certificateIds.length > 0) {
      queryBuilder.andWhere('certificate.id IN (:...certificateIds)', {
        certificateIds,
      });
    }

    // Apply additional filters
    if (filters) {
      if (filters.search) {
        queryBuilder.andWhere(
          '(certificate.serialNumber ILIKE :search OR certificate.recipientName ILIKE :search OR certificate.recipientEmail ILIKE :search OR certificate.title ILIKE :search)',
          { search: `%${filters.search}%` },
        );
      }

      if (filters.status) {
        queryBuilder.andWhere('certificate.status = :status', {
          status: filters.status,
        });
      }

      if (filters.startDate) {
        queryBuilder.andWhere('certificate.issuedAt >= :startDate', {
          startDate: new Date(filters.startDate),
        });
      }

      if (filters.endDate) {
        queryBuilder.andWhere('certificate.issuedAt <= :endDate', {
          endDate: new Date(filters.endDate),
        });
      }
    }

    const certificates = await queryBuilder.getMany();
    return this.convertToCSV(certificates);
  }

  async exportAllFiltered(filters?: any): Promise<string> {
    const queryBuilder = this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer')
      .orderBy('certificate.issuedAt', 'DESC');

    // Apply filters
    if (filters) {
      if (filters.search) {
        queryBuilder.andWhere(
          '(certificate.serialNumber ILIKE :search OR certificate.recipientName ILIKE :search OR certificate.recipientEmail ILIKE :search OR certificate.title ILIKE :search)',
          { search: `%${filters.search}%` },
        );
      }

      if (filters.status) {
        queryBuilder.andWhere('certificate.status = :status', {
          status: filters.status,
        });
      }

      if (filters.startDate) {
        queryBuilder.andWhere('certificate.issuedAt >= :startDate', {
          startDate: new Date(filters.startDate),
        });
      }

      if (filters.endDate) {
        queryBuilder.andWhere('certificate.issuedAt <= :endDate', {
          endDate: new Date(filters.endDate),
        });
      }
    }

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private async generateCertificateId(): Promise<string> {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id: string;
    let attempts = 0;

    do {
      const random = Array.from({ length: 8 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length)),
      ).join('');
      id = `CERT-${year}-${random}`;
      attempts++;
    } while (attempts < 10 && (await this.certRepo.existsByCertificateId(id)));

    return id;
  }

  private generateVerificationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 8 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
  }

  private calculateDefaultExpiry(): Date {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
  }

  private async generateQrCode(
    certificateId: string,
    verificationCode: string,
  ): Promise<string> {
    try {
      return await QRCode.toDataURL(
        JSON.stringify({ certificateId, verificationCode }),
      );
    } catch (err: unknown) {
      this.logger.warn(
        `QR code generation failed for ${certificateId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return '';
    }
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
