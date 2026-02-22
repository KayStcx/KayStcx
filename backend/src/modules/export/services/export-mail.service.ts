import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ExportFormat } from '../entities/export-job.entity';

@Injectable()
export class ExportMailService {
  private readonly logger = new Logger(ExportMailService.name);

  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendDownloadLink(to: string, downloadUrl: string, format: ExportFormat) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'noreply@kaystcx.com',
        to,
        subject: 'Your Certificate Export is Ready',
        html: `
          <p>Your certificate export (<strong>${format.toUpperCase()}</strong>) has been generated.</p>
          <p>
            <a href="${downloadUrl}" style="padding:10px 20px;background:#1a1a2e;color:#fff;text-decoration:none;border-radius:4px;">
              Download Export
            </a>
          </p>
          <p style="color:#888;font-size:12px;">This link will be available as long as the file exists on the server.</p>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send export email to ${to}: ${err.message}`);
    }
  }
}
