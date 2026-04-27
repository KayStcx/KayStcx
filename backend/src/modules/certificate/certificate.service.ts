import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { Certificate } from './entities/certificate.entity';
import { DuplicateDetectionConfig } from './interfaces/duplicate-detection.interface';
import { CertificateIssuanceService } from './services/certificate-issuance.service';
import { CertificateRevocationService } from './services/certificate-revocation.service';
import { CertificateVerificationService } from './services/certificate-verification.service';
import { CertificateSearchService } from './services/certificate-search.service';

/**
 * Main Certificate Service - Facade for certificate operations
 * Delegates to specialized services for specific functionality
 */
@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    private readonly issuanceService: CertificateIssuanceService,
    private readonly revocationService: CertificateRevocationService,
    private readonly verificationService: CertificateVerificationService,
    private readonly searchService: CertificateSearchService,
  ) {}

  // Issuance operations - delegated to CertificateIssuanceService
  async create(
    createCertificateDto: CreateCertificateDto,
    duplicateConfig?: DuplicateDetectionConfig,
    overrideReason?: string,
  ): Promise<Certificate> {
    return this.issuanceService.issue(
      createCertificateDto,
      duplicateConfig,
      overrideReason,
    );
  }

  // Search operations - delegated to CertificateSearchService
  async findAll(
    page = 1,
    limit = 10,
    issuerId?: string,
    status?: string,
  ): Promise<{ certificates: Certificate[]; total: number }> {
    return this.searchService.findAll(page, limit, issuerId, status);
  }

  async findOne(id: string): Promise<Certificate> {
    return this.searchService.findOne(id);
  }

  async getCertificatesByRecipient(email: string): Promise<Certificate[]> {
    return this.searchService.getCertificatesByRecipient(email);
  }

  async getCertificatesByIssuer(issuerId: string): Promise<Certificate[]> {
    return this.searchService.getCertificatesByIssuer(issuerId);
  }

  async getDuplicateCertificates(): Promise<Certificate[]> {
    return this.searchService.getDuplicateCertificates();
  }

  async exportCertificates(
    issuerId?: string,
    status?: string,
  ): Promise<Certificate[]> {
    return this.searchService.exportCertificates(issuerId, status);
  }

  // Verification operations - delegated to CertificateVerificationService
  async findByVerificationCode(verificationCode: string): Promise<Certificate> {
    return this.verificationService.findByVerificationCode(verificationCode);
  }

  async verifyCertificate(verificationCode: string): Promise<Certificate> {
    return this.verificationService.verifyCertificate(verificationCode);
  }

  // Revocation operations - delegated to CertificateRevocationService
  async revoke(id: string, reason?: string): Promise<Certificate> {
    return this.revocationService.revoke(id, reason);
  }

  async freeze(id: string, reason?: string): Promise<Certificate> {
    return this.revocationService.freeze(id, reason);
  }

  async unfreeze(id: string, reason?: string): Promise<Certificate> {
    return this.revocationService.unfreeze(id, reason);
  }

  async bulkRevoke(
    certificateIds: string[],
    reason?: string,
  ): Promise<{
    revoked: Certificate[];
    failed: { id: string; error: string }[];
  }> {
    return this.revocationService.bulkRevoke(certificateIds, reason);
  }

  // Generic operations (kept in main service for simplicity)
  async update(
    id: string,
    updateCertificateDto: UpdateCertificateDto,
  ): Promise<Certificate> {
    const certificate = await this.findOne(id);
    Object.assign(certificate, updateCertificateDto);
    return this.certificateRepository.save(certificate);
  }

  async remove(id: string): Promise<void> {
    const certificate = await this.findOne(id);
    await this.certificateRepository.remove(certificate);
  }
}
