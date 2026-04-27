import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from '../entities/certificate.entity';
import { WebhooksService } from '../../webhooks/webhooks.service';
import { WebhookEvent } from '../../webhooks/entities/webhook-subscription.entity';

@Injectable()
export class CertificateRevocationService {
  private readonly logger = new Logger(CertificateRevocationService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    private readonly webhooksService: WebhooksService,
  ) {}

  async revoke(id: string, reason?: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
    });

    if (!certificate) {
      throw new ConflictException(`Certificate with ID ${id} not found`);
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

    this.logger.log(`Certificate revoked: ${id} with reason: ${reason}`);

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

    return savedCertificate;
  }

  async freeze(id: string, reason?: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
    });

    if (!certificate) {
      throw new ConflictException(`Certificate with ID ${id} not found`);
    }

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

    this.logger.log(`Certificate frozen: ${id} with reason: ${reason}`);

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

    return savedCertificate;
  }

  async unfreeze(id: string, reason?: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
    });

    if (!certificate) {
      throw new ConflictException(`Certificate with ID ${id} not found`);
    }

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

    this.logger.log(`Certificate unfrozen: ${id} with reason: ${reason}`);

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

    return savedCertificate;
  }

  async bulkRevoke(
    certificateIds: string[],
    reason?: string,
  ): Promise<{
    revoked: Certificate[];
    failed: { id: string; error: string }[];
  }> {
    const revoked: Certificate[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of certificateIds) {
      try {
        const certificate = await this.revoke(id, reason);
        revoked.push(certificate);
      } catch (error) {
        failed.push({
          id,
          error: error.message || 'Failed to revoke certificate',
        });
      }
    }

    this.logger.log(
      `Bulk revoke completed: ${revoked.length} revoked, ${failed.length} failed`,
    );

    return { revoked, failed };
  }
}
