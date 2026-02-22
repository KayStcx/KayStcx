import { Injectable, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { Certificate } from './entities/certificate.entity';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { DuplicateDetectionConfig } from './interfaces/duplicate-detection.interface';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    private readonly duplicateDetectionService: DuplicateDetectionService,
  ) {}

  async create(
    createCertificateDto: CreateCertificateDto,
    duplicateConfig?: DuplicateDetectionConfig,
    overrideReason?: string,
  ): Promise<Certificate> {
    // Check for duplicates if config is provided
    if (duplicateConfig?.enabled) {
      const duplicateCheck = await this.duplicateDetectionService.checkForDuplicates(
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
            message: 'Warning: Potential duplicate detected. Override reason required.',
            details: duplicateCheck,
            requiresOverride: true,
          });
        }
      }
    }

    const certificate = this.certificateRepository.create({
      ...createCertificateDto,
      expiresAt: createCertificateDto.expiresAt || this.calculateDefaultExpiry(),
      verificationCode: createCertificateDto.verificationCode || this.generateVerificationCode(),
      isDuplicate: false,
    });

    const savedCertificate = await this.certificateRepository.save(certificate);

    // If this was an override, mark it appropriately
    if (overrideReason) {
      savedCertificate.isDuplicate = true;
      savedCertificate.overrideReason = overrideReason;
      await this.certificateRepository.save(savedCertificate);
    }

    this.logger.log(`Certificate created: ${savedCertificate.id} for ${createCertificateDto.recipientEmail}`);
    return savedCertificate;
  }

  async findAll(
    page = 1,
    limit = 10,
    issuerId?: string,
    status?: string,
  ): Promise<{ certificates: Certificate[]; total: number }> {
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

    const total = await queryBuilder.getCount();
    const certificates = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { certificates, total };
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

  async findByVerificationCode(verificationCode: string): Promise<Certificate> {
    const certificate = await this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer')
      .where('certificate.verificationCode = :verificationCode', { verificationCode })
      .andWhere('certificate.status = :status', { status: 'active' })
      .getOne();

    if (!certificate) {
      throw new NotFoundException('Certificate not found or invalid verification code');
    }

    return certificate;
  }

  async update(id: string, updateCertificateDto: UpdateCertificateDto): Promise<Certificate> {
    const certificate = await this.findOne(id);
    
    Object.assign(certificate, updateCertificateDto);
    
    return this.certificateRepository.save(certificate);
  }

  async revoke(id: string, reason?: string): Promise<Certificate> {
    const certificate = await this.findOne(id);
    
    certificate.status = 'revoked';
    if (reason) {
      certificate.metadata = {
        ...certificate.metadata,
        revocationReason: reason,
        revokedAt: new Date(),
      };
    }
    
    return this.certificateRepository.save(certificate);
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
}
