import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from '../entities/certificate.entity';
import { CertificateStatus } from '../constants/certificate-status.enum';
import { EmailQueueService } from '../../email/email-queue.service';
import { LoggingService } from '../../../common/logging/logging.service';

@Injectable()
export class CertificateExpiryNotificationJob {
  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    private readonly emailQueueService: EmailQueueService,
    private readonly configService: ConfigService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Runs once daily to query active certificates expiring within the
   * configured advance window and enqueue expiry-warning emails.
   *
   * - `EXPIRY_NOTIFICATION_DAYS_BEFORE` controls the lookahead (default 30).
   * - `EXPIRY_NOTIFICATIONS_ENABLED` toggles the entire check (default true).
   * - Setting `EXPIRY_NOTIFICATION_DAYS_BEFORE=0` disables notifications.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async notifyExpiringCertificates(): Promise<void> {
    const enabled = this.configService.get<boolean>(
      'EXPIRY_NOTIFICATIONS_ENABLED',
      true,
    );
    if (!enabled) {
      this.logger.log(
        'Certificate expiry notifications are disabled (EXPIRY_NOTIFICATIONS_ENABLED=false)',
      );
      return;
    }

    const daysBefore = this.configService.get<number>(
      'EXPIRY_NOTIFICATION_DAYS_BEFORE',
      30,
    );

    if (daysBefore <= 0) {
      this.logger.log(
        `Certificate expiry notifications are disabled (EXPIRY_NOTIFICATION_DAYS_BEFORE=${daysBefore})`,
      );
      return;
    }

    const now = new Date();
    const windowEnd = new Date(
      now.getTime() + daysBefore * 24 * 60 * 60 * 1000,
    );

    this.logger.log(
      `Starting certificate expiry notification check. Window: ${now.toISOString()} → ${windowEnd.toISOString()}`,
    );

    const expiringCertificates = await this.certificateRepository
      .createQueryBuilder('cert')
      .where('cert.status = :status', { status: CertificateStatus.ACTIVE })
      .andWhere('cert.expiresAt IS NOT NULL')
      .andWhere('cert.expiresAt BETWEEN :now AND :windowEnd', {
        now,
        windowEnd,
      })
      .getMany();

    let enqueued = 0;

    for (const certificate of expiringCertificates) {
      const recipientEmail = certificate.recipientEmail;
      if (!recipientEmail) {
        this.logger.warn(
          `Certificate ${certificate.certificateId} has no recipient email — skipping`,
        );
        continue;
      }

      try {
        await this.emailQueueService.queueCertificateExpiring({
          to: recipientEmail,
          certificateId: certificate.certificateId,
          recipientName: certificate.recipientName,
          certificateName: certificate.title,
          expiryDate: certificate.expiresAt!.toISOString(),
        });
        enqueued++;
        this.logger.log(
          `Enqueued expiry notification for certificate ${certificate.certificateId} to ${recipientEmail}`,
        );
      } catch (error: unknown) {
        this.logger.error(
          `Failed to enqueue expiry notification for certificate ${certificate.certificateId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(
      `Certificate expiry notification check complete. Enqueued ${enqueued} emails for ${expiringCertificates.length} expiring certificates.`,
    );
  }
}