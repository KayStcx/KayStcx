import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Certificate } from '../entities/certificate.entity';
import { CertificateStatus } from '../constants/certificate-status.enum';
import { CertificateExpiryNotificationJob } from './certificate-expiry-notification.job';
import { EmailQueueService } from '../../email/email-queue.service';
import { LoggingService } from '../../../common/logging/logging.service';

function makeCertificate(
  overrides?: Partial<Certificate>,
): Partial<Certificate> {
  return {
    certificateId: 'CERT-001',
    title: 'Test Certificate',
    recipientEmail: 'user@example.com',
    recipientName: 'John Doe',
    expiresAt: new Date('2026-09-15T00:00:00Z'),
    status: CertificateStatus.ACTIVE,
    ...overrides,
  };
}

describe('CertificateExpiryNotificationJob', () => {
  let job: CertificateExpiryNotificationJob;
  let emailQueueService: jest.Mocked<
    Pick<EmailQueueService, 'queueCertificateExpiring'>
  >;
  let configGet: jest.Mock;
  let getMany: jest.Mock;
  let queryBuilderWhere: jest.Mock;
  let queryBuilderAndWhere: jest.Mock;

  beforeEach(async () => {
    getMany = jest.fn();
    queryBuilderWhere = jest.fn().mockReturnThis();
    queryBuilderAndWhere = jest.fn().mockReturnThis();

    const mockCertificateRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: queryBuilderWhere,
        andWhere: queryBuilderAndWhere,
        getMany,
      }),
    };

    emailQueueService = {
      queueCertificateExpiring: jest.fn().mockResolvedValue(undefined),
    };

    configGet = jest.fn();

    const mockConfigService = {
      get: configGet,
    };

    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateExpiryNotificationJob,
        {
          provide: getRepositoryToken(Certificate),
          useValue: mockCertificateRepository,
        },
        {
          provide: EmailQueueService,
          useValue: emailQueueService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggingService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    job = module.get<CertificateExpiryNotificationJob>(
      CertificateExpiryNotificationJob,
    );
  });

  it('should be defined', () => {
    expect(job).toBeDefined();
  });

  describe('notifyExpiringCertificates', () => {
    beforeEach(() => {
      configGet.mockImplementation((key: string, defaultValue: unknown) => {
        const env: Record<string, unknown> = {
          EXPIRY_NOTIFICATIONS_ENABLED: true,
          EXPIRY_NOTIFICATION_DAYS_BEFORE: 7,
        };
        return env[key] ?? defaultValue;
      });
    });

    it('should query with the correct date range when EXPIRY_NOTIFICATION_DAYS_BEFORE=7', async () => {
      jest.useFakeTimers();
      const now = new Date('2026-08-22T12:00:00Z');
      jest.setSystemTime(now);

      const expectedWindowEnd = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      getMany.mockResolvedValue([]);

      await job.notifyExpiringCertificates();

      // Verify the BETWEEN query received the correct range
      expect(queryBuilderAndWhere).toHaveBeenCalledWith(
        'cert.expiresAt BETWEEN :now AND :windowEnd',
        { now, windowEnd: expectedWindowEnd },
      );

      jest.useRealTimers();
    });

    it('should enqueue exactly N emails when N expiring certificates are found', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-22T12:00:00Z'));

      const expiringCerts = [
        makeCertificate({ certificateId: 'CERT-A' }),
        makeCertificate({ certificateId: 'CERT-B' }),
        makeCertificate({ certificateId: 'CERT-C' }),
      ];

      getMany.mockResolvedValue(expiringCerts);

      await job.notifyExpiringCertificates();

      expect(emailQueueService.queueCertificateExpiring).toHaveBeenCalledTimes(
        3,
      );

      // Verify each call uses the correct certificate data
      expect(emailQueueService.queueCertificateExpiring).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          to: 'user@example.com',
          certificateId: 'CERT-A',
          recipientName: 'John Doe',
          certificateName: 'Test Certificate',
        }),
      );
      expect(emailQueueService.queueCertificateExpiring).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ certificateId: 'CERT-C' }),
      );

      jest.useRealTimers();
    });

    it('should skip certificates without a recipient email', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-22T12:00:00Z'));

      const expiringCerts = [
        makeCertificate({ certificateId: 'CERT-1' }),
        makeCertificate({
          certificateId: 'CERT-2',
          recipientEmail: undefined,
        }),
        makeCertificate({ certificateId: 'CERT-3' }),
      ];

      getMany.mockResolvedValue(expiringCerts);

      await job.notifyExpiringCertificates();

      expect(emailQueueService.queueCertificateExpiring).toHaveBeenCalledTimes(
        2,
      );
      expect(emailQueueService.queueCertificateExpiring).toHaveBeenCalledWith(
        expect.objectContaining({ certificateId: 'CERT-1' }),
      );
      expect(emailQueueService.queueCertificateExpiring).toHaveBeenCalledWith(
        expect.objectContaining({ certificateId: 'CERT-3' }),
      );

      jest.useRealTimers();
    });

    it('should not run when EXPIRY_NOTIFICATIONS_ENABLED=false', async () => {
      configGet.mockImplementation((key: string, defaultValue: unknown) => {
        const env: Record<string, unknown> = {
          EXPIRY_NOTIFICATIONS_ENABLED: false,
          EXPIRY_NOTIFICATION_DAYS_BEFORE: 7,
        };
        return env[key] ?? defaultValue;
      });

      await job.notifyExpiringCertificates();

      expect(getMany).not.toHaveBeenCalled();
      expect(
        emailQueueService.queueCertificateExpiring,
      ).not.toHaveBeenCalled();
    });

    it('should not run when EXPIRY_NOTIFICATION_DAYS_BEFORE=0', async () => {
      configGet.mockImplementation((key: string, defaultValue: unknown) => {
        const env: Record<string, unknown> = {
          EXPIRY_NOTIFICATIONS_ENABLED: true,
          EXPIRY_NOTIFICATION_DAYS_BEFORE: 0,
        };
        return env[key] ?? defaultValue;
      });

      await job.notifyExpiringCertificates();

      expect(getMany).not.toHaveBeenCalled();
      expect(
        emailQueueService.queueCertificateExpiring,
      ).not.toHaveBeenCalled();
    });
  });
});