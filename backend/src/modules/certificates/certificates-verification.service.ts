import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from './entities/certificate.entity';
import { Verification } from '../../certificate/entities/verification.entity';
import { VerificationResultDto } from './dto/verification-result.dto';

@Injectable()
export class CertificatesVerificationService {
  private readonly logger = new Logger(CertificatesVerificationService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
  ) {}

  async verifyCertificate(certificateId: string): Promise<VerificationResultDto> {
    const startTime = Date.now();
    this.logger.log(`Starting verification for certificate ID: ${certificateId}`);

    try {
      // Step 1: Look up certificate in our database
      let certificate: Certificate | null = null;
      let status: 'valid' | 'revoked' | 'expired' | 'not_found' = 'not_found';
      let message = 'Certificate not found';

      // First try to find by ID
      try {
        certificate = await this.certificateRepository.findOne({
          where: { id: certificateId },
        });
      } catch (error) {
        this.logger.error(`Error querying database for certificate ${certificateId}:`, error);
      }

      // If not found by ID, try to find by verification code
      if (!certificate) {
        try {
          certificate = await this.certificateRepository.findOne({
            where: { verificationCode: certificateId },
          });
        } catch (error) {
          this.logger.error(`Error querying database for verification code ${certificateId}:`, error);
        }
      }

      if (certificate) {
        // Check if certificate exists on Stellar blockchain (placeholder implementation)
        const isOnStellar = await this.checkStellarRecords(certificate);
        
        if (!isOnStellar) {
          status = 'not_found';
          message = 'Certificate found in database but not on Stellar blockchain - may be tampered';
        } else if (certificate.status === 'revoked') {
          status = 'revoked';
          message = 'Certificate has been revoked';
        } else if (certificate.expiresAt && new Date(certificate.expiresAt) < new Date()) {
          status = 'expired';
          message = 'Certificate has expired';
        } else {
          status = 'valid';
          message = 'Certificate is valid and active';
        }
      }

      const isValid = status === 'valid';
      const verifiedAt = new Date().toISOString();

      // Generate a verification ID for audit trail
      const verificationId = `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Record verification attempt in audit trail
      await this.recordVerificationAttempt(certificate, isValid, verificationId);

      this.logger.log(`Verification completed for ${certificateId}. Status: ${status}. Duration: ${Date.now() - startTime}ms`);

      const result: VerificationResultDto = {
        isValid,
        status,
        message,
        verifiedAt,
        verificationId,
      };

      // Add certificate data if found and valid
      if (certificate && status === 'valid') {
        result.certificate = {
          id: certificate.id,
          title: certificate.title,
          recipientName: certificate.recipientName,
          recipientEmail: certificate.recipientEmail,
          issuerId: certificate.issuerId,
          issuedAt: certificate.issuedAt ? certificate.issuedAt.toISOString() : '',
          expiresAt: certificate.expiresAt ? certificate.expiresAt.toISOString() : '',
          status: certificate.status,
        };
      }

      return result;
    } catch (error) {
      this.logger.error(`Unexpected error during verification of ${certificateId}:`, error);
      
      // Still log the verification attempt even if there's an error
      await this.recordVerificationAttempt(null, false, `ver_error_${Date.now()}`);
      
      return {
        isValid: false,
        status: 'not_found',
        message: 'An error occurred during verification',
        verifiedAt: new Date().toISOString(),
        verificationId: `ver_error_${Date.now()}`,
      };
    }
  }

  /**
   * Check if the certificate exists on the Stellar blockchain
   */
  private async checkStellarRecords(certificate: Certificate): Promise<boolean> {
    try {
      // In a real implementation, this would query the Stellar blockchain
      // to verify that the certificate exists in the smart contract
      // For now, we'll return true as a placeholder
      this.logger.log(`Checking Stellar records for certificate ${certificate.id}`);
      
      // This is where we would integrate with the Stellar service to verify
      // the certificate exists on the blockchain
      // Example: await this.stellarService.verifyCertificateOnChain(certificate.id);
      
      // For demonstration purposes, assume it's valid if it exists in our DB
      // In a real implementation, this would check the actual blockchain
      return true;
    } catch (error) {
      this.logger.error(`Error checking Stellar records for certificate ${certificate.id}:`, error);
      return false;
    }
  }

  /**
   * Record verification attempt for audit trail
   */
  private async recordVerificationAttempt(
    certificate: Certificate | null, 
    success: boolean, 
    verificationId: string
  ): Promise<void> {
    try {
      if (certificate) {
        const verification = this.verificationRepository.create({
          certificate,
          success,
          verifiedAt: new Date(),
        });
        await this.verificationRepository.save(verification);
      } else {
        // Even if certificate wasn't found, we can still record the attempt
        // In a real implementation, we might want to create a separate table for failed attempts
        this.logger.log(`Recording verification attempt for non-existent certificate with ID: ${verificationId}`);
      }
    } catch (error) {
      this.logger.error(`Error recording verification attempt:`, error);
      // Don't throw here as it shouldn't affect the verification result
    }
  }
}