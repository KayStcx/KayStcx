import { Injectable, Logger, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from './entities/certificate.entity';
import { User } from '../users/entities/user.entity';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WebhookEvent } from '../webhooks/entities/webhook-subscription.entity';

@Injectable()
export class CertificatesRevocationService {
  private readonly logger = new Logger(CertificatesRevocationService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    private readonly webhooksService: WebhooksService,
  ) {}

  async revokeCertificate(
    certificateId: string,
    user: User,
    reason?: string,
  ): Promise<Certificate> {
    this.logger.log(`Revoking certificate ${certificateId} by user ${user.id}`);

    try {
      // 1. Verify caller is the original issuer or admin
      const certificate = await this.certificateRepository.findOne({
        where: { id: certificateId },
      });

      if (!certificate) {
        throw new NotFoundException(`Certificate with ID ${certificateId} not found`);
      }

      // Check if user is admin or the original issuer
      const isAdmin = user.role === 'admin';
      const isOriginalIssuer = certificate.issuerId === user.id;
      
      if (!isAdmin && !isOriginalIssuer) {
        throw new UnauthorizedException(
          'Only the original issuer or admin can revoke this certificate',
        );
      }

      // Check if certificate is already revoked
      if (certificate.status === 'revoked') {
        throw new BadRequestException('Certificate is already revoked');
      }

      // 2. Submit revocation transaction to Stellar (simulated for now)
      try {
        await this.submitRevocationToStellar(certificate, user, reason);
      } catch (stellarError) {
        this.logger.error(`Failed to submit revocation to Stellar for certificate ${certificateId}:`, stellarError);
        throw new BadRequestException('Failed to submit revocation to Stellar blockchain');
      }

      // 3. Update certificate status in database
      certificate.status = 'revoked';
      certificate.metadata = {
        ...certificate.metadata,
        revocationReason: reason || 'Revoked by issuer',
        revokedAt: new Date(),
        revokedBy: user.id,
      };

      const updatedCertificate = await this.certificateRepository.save(certificate);

      // 4. Emit revocation event for WebSocket broadcast
      this.emitRevocationEvent(updatedCertificate, user, reason);

      // 5. Trigger webhook event
      await this.webhooksService.triggerEvent(WebhookEvent.CERTIFICATE_REVOKED, certificate.issuerId, {
        id: certificate.id,
        title: certificate.title,
        recipientName: certificate.recipientName,
        recipientEmail: certificate.recipientEmail,
        issuerId: certificate.issuerId,
        revokedAt: new Date(),
        revokedBy: user.id,
        reason: reason || 'No reason provided',
      });

      this.logger.log(`Certificate ${certificateId} successfully revoked by user ${user.id}`);
      return updatedCertificate;
    } catch (error) {
      this.logger.error(`Error revoking certificate ${certificateId}:`, error);
      throw error;
    }
  }

  /**
   * Submit revocation transaction to Stellar blockchain
   */
  private async submitRevocationToStellar(
    certificate: Certificate,
    user: User,
    reason?: string,
  ): Promise<void> {
    this.logger.log(`Submitting revocation to Stellar for certificate ${certificate.id}`);

    // In a real implementation, this would interact with the Stellar blockchain
    // to submit the revocation transaction to the smart contract
    // Example:
    // await this.stellarService.submitRevocationTransaction(
    //   user.stellarPublicKey,
    //   certificate.id,
    //   reason || 'Revoked by issuer'
    // );

    // For now, we'll simulate the blockchain interaction
    this.logger.log(`Simulated Stellar revocation for certificate ${certificate.id}`);
  }

  /**
   * Emit revocation event for WebSocket broadcast
   */
  private emitRevocationEvent(
    certificate: Certificate,
    user: User,
    reason?: string,
  ): void {
    this.logger.log(`Emitting revocation event for certificate ${certificate.id}`);

    // In a real implementation, this would emit an event to WebSocket clients
    // Example:
    // this.wss.emit('certificate.revoked', {
    //   certificateId: certificate.id,
    //   recipientName: certificate.recipientName,
    //   revokedAt: new Date(),
    //   revokedBy: user.id,
    //   reason: reason || 'No reason provided',
    // });

    // For now, we'll just log the event
    this.logger.log(`Revocation event emitted for certificate ${certificate.id}`);
  }

  /**
   * Check if a certificate can be re-issued (prevent re-issuance of revoked certificate IDs)
   */
  async canReissueCertificate(certificateId: string): Promise<boolean> {
    try {
      const certificate = await this.certificateRepository.findOne({
        where: { id: certificateId },
      });

      if (!certificate) {
        // Certificate doesn't exist, so it can be issued
        return true;
      }

      // Check if certificate is revoked
      if (certificate.status === 'revoked') {
        this.logger.warn(`Attempt to re-issue revoked certificate ${certificateId}`);
        return false;
      }

      // Certificate exists but is not revoked, so it cannot be re-issued with same ID
      // This prevents duplicate certificates with same ID
      return false;
    } catch (error) {
      this.logger.error(`Error checking if certificate ${certificateId} can be re-issued:`, error);
      return false;
    }
  }
}