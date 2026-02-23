import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('certificate-jobs')
export class JobsProcessor {
  @Process('send-email')
  async handleEmail(job: Job) {
    console.log(`Sending email with payload:`, job.data);
    // integrate with email service
  }

  @Process('generate-pdf')
  async handlePdf(job: Job) {
    console.log(`Generating PDF with payload:`, job.data);
    // integrate with PDF generator
  }

  @Process('expiration-check')
  async handleExpiration(job: Job) {
    console.log(`Running expiration check...`);
    // Load expiry window and sequence threshold from env
    const expiryWindowDays = parseInt(
      process.env.CERTIFICATE_EXPIRY_WINDOW_DAYS || '0',
      10,
    );
    const sequenceThreshold = process.env.STELLAR_SEQUENCE_THRESHOLD
      ? parseInt(process.env.STELLAR_SEQUENCE_THRESHOLD, 10)
      : undefined;

    // Dynamically import CertificateService and WebhooksService
    const { Certificate } = await import('../../entities/certificate.entity');
    const { getConnection } = await import('typeorm');
    const connection = getConnection();
    const certificateRepo = connection.getRepository(Certificate);

    // Find certificates that are expired by date
    const now = new Date();
    let query = certificateRepo
      .createQueryBuilder('certificate')
      .where('certificate.status = :status', { status: 'active' })
      .andWhere('certificate.expiresAt <= :now', { now });

    // Optionally check Stellar sequence number threshold
    if (sequenceThreshold) {
      query = query.orWhere(
        "(certificate.metadata->>'stellarSequence')::bigint <= :sequenceThreshold",
        { sequenceThreshold },
      );
    }

    // Optionally apply expiry window
    if (expiryWindowDays > 0) {
      const windowDate = new Date(
        now.getTime() - expiryWindowDays * 24 * 60 * 60 * 1000,
      );
      query = query.andWhere('certificate.expiresAt >= :windowDate', {
        windowDate,
      });
    }

    const expiredCertificates = await query.getMany();

    if (expiredCertificates.length === 0) {
      console.log('No certificates to expire.');
      return;
    }

    // Update status and emit events
    for (const cert of expiredCertificates) {
      cert.status = 'expired';
      await certificateRepo.save(cert);
      // Emit expiry event (webhook)
      try {
        const { WebhooksService } =
          await import('../../../modules/webhooks/webhooks.service');
        const { WebhookEvent } =
          await import('../../../modules/webhooks/entities/webhook-subscription.entity');
        const webhooksService = connection.getCustomRepository(
          WebhooksService as any,
        );
        await webhooksService.triggerEvent(
          WebhookEvent.CERTIFICATE_EXPIRED,
          cert.issuerId,
          {
            id: cert.id,
            status: cert.status,
            expiredAt: now,
          },
        );
      } catch (err) {
        console.error('Failed to emit expiry event:', err);
      }
      console.log(`Certificate expired: ${cert.id}`);
    }
  }
}
