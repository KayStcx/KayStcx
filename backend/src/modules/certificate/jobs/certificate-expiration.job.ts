import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, In } from 'typeorm';
import { Certificate } from '../entities/certificate.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { EmailService } from '../../email/email.service';

/**
 * Scheduled job that checks for certificates approaching expiration
 * and sends notifications at 30, 14, and 7 days before expiry.
 * Resolves Issue #278 – Certificate Expiration Notifications
 */
@Injectable()
export class CertificateExpirationJob {
  private readonly logger = new Logger(CertificateExpirationJob.name);

  // Days before expiration to send notifications
  private readonly notificationDays = [30, 14, 7];

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Runs daily at 8:00 AM to check for certificates
   * approaching expiration.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleExpirationNotifications(): Promise<void> {
    this.logger.log('Running certificate expiration notification check...');

    for (const daysBeforeExpiry of this.notificationDays) {
      await this.sendNotificationsForDay(daysBeforeExpiry);
    }

    // Also mark expired certificates
    await this.markExpiredCertificates();

    this.logger.log('Certificate expiration notification check complete.');
  }

  /**
   * Find certificates expiring in exactly `daysBeforeExpiry` days
   * and send in-app + email notifications.
   */
  private async sendNotificationsForDay(
    daysBeforeExpiry: number,
  ): Promise<void> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBeforeExpiry);

    // Find certificates expiring on the target date (within a 24-hour window)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const expiringCertificates = await this.certificateRepository
      .createQueryBuilder('certificate')
      .leftJoinAndSelect('certificate.issuer', 'issuer')
      .where('certificate.status = :status', { status: 'active' })
      .andWhere('certificate.expiresAt >= :startOfDay', { startOfDay })
      .andWhere('certificate.expiresAt <= :endOfDay', { endOfDay })
      .getMany();

    if (expiringCertificates.length === 0) {
      this.logger.debug(
        `No certificates expiring in ${daysBeforeExpiry} days.`,
      );
      return;
    }

    this.logger.log(
      `Found ${expiringCertificates.length} certificates expiring in ${daysBeforeExpiry} days.`,
    );

    for (const certificate of expiringCertificates) {
      try {
        // Skip if already notified for this period
        const notificationKey = `expiry_${daysBeforeExpiry}d`;
        if (certificate.metadata?.notifications?.[notificationKey]) {
          continue;
        }

        // Send in-app notification
        if (certificate.issuerId) {
          await this.notificationsService.createNotification(
            certificate.issuerId,
            NotificationType.INFO,
            `Certificate Expiring in ${daysBeforeExpiry} Days`,
            `Certificate "${certificate.title}" for ${certificate.recipientName} (${certificate.recipientEmail}) will expire on ${certificate.expiresAt.toLocaleDateString()}.`,
          );
        }

        // Send email notification
        try {
          await this.emailService.sendEmail({
            to: certificate.recipientEmail,
            subject: `Certificate Expiring in ${daysBeforeExpiry} Days: ${certificate.title}`,
            template: 'certificate-issued', // Reuse existing template as fallback
            data: {
              recipientName: certificate.recipientName,
              certificateName: certificate.title,
              issuerName: certificate.issuer?.name || 'Kaystcx',
              certificateId: certificate.id,
              issuedDate: certificate.issuedAt?.toLocaleDateString() || 'N/A',
              expiryDate: certificate.expiresAt?.toLocaleDateString() || 'N/A',
              daysRemaining: daysBeforeExpiry,
              certificateLink: `${process.env.APP_URL || 'https://kaystcx.com'}/certificates/${certificate.id}`,
            },
          });
        } catch (emailError) {
          this.logger.error(
            `Failed to send expiration email for certificate ${certificate.id}: ${emailError.message}`,
          );
        }

        // Mark certificate as notified for this period
        certificate.metadata = {
          ...certificate.metadata,
          notifications: {
            ...(certificate.metadata?.notifications || {}),
            [notificationKey]: new Date().toISOString(),
          },
        };
        await this.certificateRepository.save(certificate);

        this.logger.debug(
          `Sent ${daysBeforeExpiry}-day expiration notification for certificate ${certificate.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send expiration notification for certificate ${certificate.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Mark certificates that have already expired
   * (past their expiresAt date) as 'expired'.
   */
  private async markExpiredCertificates(): Promise<void> {
    const now = new Date();

    const expiredCertificates = await this.certificateRepository
      .createQueryBuilder('certificate')
      .where('certificate.status = :status', { status: 'active' })
      .andWhere('certificate.expiresAt <= :now', { now })
      .getMany();

    if (expiredCertificates.length === 0) {
      return;
    }

    for (const certificate of expiredCertificates) {
      certificate.status = 'expired';
      certificate.metadata = {
        ...certificate.metadata,
        expiredAt: new Date().toISOString(),
        autoExpired: true,
      };
      await this.certificateRepository.save(certificate);

      // Notify the issuer
      if (certificate.issuerId) {
        await this.notificationsService.createNotification(
          certificate.issuerId,
          NotificationType.INFO,
          'Certificate Expired',
          `Certificate "${certificate.title}" for ${certificate.recipientName} has expired.`,
        );
      }
    }

    this.logger.log(
      `Marked ${expiredCertificates.length} certificates as expired.`,
    );
  }
}
