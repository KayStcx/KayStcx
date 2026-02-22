import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { SendCertificateIssuedDto } from './dto/send-certificate-issued.dto';
import { SendVerificationDto } from './dto/send-verification.dto';
import { SendPasswordResetDto } from './dto/send-password-reset.dto';
import { SendRevocationNoticeDto } from './dto/send-revocation-notice.dto';
import { SendEmailDto } from './dto/send-email.dto';

interface EmailConfig {
  service?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private logger = new Logger(EmailService.name);
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
    this.loadTemplates();
  }

  private initializeTransporter(): void {
    const emailService = this.configService.get<string>('EMAIL_SERVICE');
    const emailFrom = this.configService.get<string>('EMAIL_FROM');

    let config: EmailConfig = {};

    if (
      emailService === 'sendgrid' ||
      this.configService.get<string>('SENDGRID_API_KEY')
    ) {
      // SendGrid configuration
      const sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
      config = {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: sendGridApiKey || 'your-sendgrid-api-key',
        },
      };
      this.logger.log('Email service configured with SendGrid');
    } else {
      // Nodemailer SMTP configuration
      const emailHost = this.configService.get<string>('EMAIL_HOST');
      const emailPort = this.configService.get<number>('EMAIL_PORT') || 587;
      const emailUsername = this.configService.get<string>('EMAIL_USERNAME');
      const emailPassword = this.configService.get<string>('EMAIL_PASSWORD');

      config = {
        host: emailHost || 'smtp.mailtrap.io',
        port: emailPort,
        secure: emailPort === 465,
        auth: {
          user: emailUsername || 'user@example.com',
          pass: emailPassword || 'password',
        },
      };
      this.logger.log('Email service configured with SMTP');
    }

    this.transporter = nodemailer.createTransport(config);
  }

  private loadTemplates(): void {
    const templatesDir = path.join(__dirname, 'templates');
    const templates = [
      'certificate-issued',
      'verification-email',
      'password-reset',
      'revocation-notice',
    ];

    templates.forEach((templateName) => {
      const templatePath = path.join(templatesDir, `${templateName}.hbs`);
      try {
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        const compiled = handlebars.compile(templateContent);
        this.templates.set(templateName, compiled);
        this.logger.log(`Template loaded: ${templateName}`);
      } catch (error) {
        this.logger.error(
          `Failed to load template ${templateName}: ${error.message}`,
        );
      }
    });
  }

  async sendEmail(dto: SendEmailDto): Promise<void> {
    try {
      const template = this.templates.get(dto.template);
      if (!template) {
        throw new Error(`Template ${dto.template} not found`);
      }

      const htmlContent = template(dto.data || {});
      const emailFrom =
        this.configService.get<string>('EMAIL_FROM') ||
        'noreply@kaystcx.com';

      const mailOptions = {
        from: emailFrom,
        to: dto.to,
        subject: dto.subject,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${dto.to}: ${info.response}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${dto.to}: ${error.message}`);
      throw error;
    }
  }

  async sendCertificateIssued(dto: SendCertificateIssuedDto): Promise<void> {
    const emailDto: SendEmailDto = {
      to: dto.to,
      subject: `Certificate Issued: ${dto.certificateName}`,
      template: 'certificate-issued',
      data: {
        recipientName: dto.recipientName,
        certificateName: dto.certificateName,
        issuerName: dto.issuerName,
        certificateId: dto.certificateId,
        issuedDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        certificateLink: `${this.getBaseUrl()}/certificates/${dto.certificateId}`,
      },
    };

    await this.sendEmail(emailDto);
  }

  async sendVerificationEmail(dto: SendVerificationDto): Promise<void> {
    const emailDto: SendEmailDto = {
      to: dto.to,
      subject: 'Verify Your Email Address',
      template: 'verification-email',
      data: {
        userName: dto.userName,
        verificationLink: dto.verificationLink,
      },
    };

    await this.sendEmail(emailDto);
  }

  async sendPasswordReset(dto: SendPasswordResetDto): Promise<void> {
    const emailDto: SendEmailDto = {
      to: dto.to,
      subject: 'Reset Your Password',
      template: 'password-reset',
      data: {
        userName: dto.userName,
        resetLink: dto.resetLink,
      },
    };

    await this.sendEmail(emailDto);
  }

  async sendRevocationNotice(dto: SendRevocationNoticeDto): Promise<void> {
    const emailDto: SendEmailDto = {
      to: dto.to,
      subject: `Certificate Revoked: ${dto.certificateName}`,
      template: 'revocation-notice',
      data: {
        recipientName: dto.recipientName,
        certificateId: dto.certificateId,
        certificateName: dto.certificateName,
        reason: dto.reason,
        revocationDate: new Date(dto.revocationDate).toLocaleDateString(
          'en-US',
          {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          },
        ),
      },
    };

    await this.sendEmail(emailDto);
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified');
      return true;
    } catch (error) {
      this.logger.error(`Email service connection failed: ${error.message}`);
      return false;
    }
  }

  private getBaseUrl(): string {
    // This should be configurable in production
    return process.env.APP_URL || 'https://kaystcx.com';
  }
}
