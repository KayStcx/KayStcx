import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as QRCode from 'qrcode';
import { CertificateService } from './certificate.service';
import { Certificate } from './entities/certificate.entity';
import { Verification } from './entities/verification.entity';
import { User } from '../users/entities/user.entity';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { MetadataSchemaService } from '../metadata-schema/services/metadata-schema.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { SorobanService } from '../stellar/services/soroban.service';
import { WebhookEvent } from '../webhooks/entities/webhook-subscription.entity';

describe('CertificateService', () => {
  let service: CertificateService;
  let certificateRepository: { createQueryBuilder: jest.Mock };

  const verificationRepository = {};
  const userRepository = {};
  const duplicateDetectionService = {};
  const webhooksService = {};
  const metadataSchemaService = {};
  const dataSource = {} as DataSource;
  const sorobanService = {
    isConfigured: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    verificationRepository = { save: jest.fn().mockResolvedValue({}) };
    webhooksService = { triggerEvent: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        { provide: getRepositoryToken(Certificate), useValue: {} },
        {
          provide: getRepositoryToken(Verification),
          useValue: verificationRepository,
        },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: DuplicateDetectionService, useValue: {} },
        { provide: WebhooksService, useValue: webhooksService },
        { provide: MetadataSchemaService, useValue: {} },
        { provide: DataSource, useValue: { createQueryRunner: jest.fn() } },
        {
          provide: SorobanService,
          useValue: { isConfigured: jest.fn(), issueCertificate: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CertificateService>(CertificateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a QR code data URL for a certificate', async () => {
    const certificate = {
      id: 'cert-123',
      verificationCode: 'AB12CD34',
    } as Certificate;

    jest.spyOn(service, 'findOne').mockResolvedValue(certificate);
    const toDataURL = jest
      .spyOn(QRCode, 'toDataURL')
      .mockResolvedValue('data:image/png;base64,QR');
    process.env.FRONTEND_URL = 'https://kaystcx.app';

    await expect(service.getCertificateQrCode('cert-123')).resolves.toEqual({
      id: 'cert-123',
      verificationCode: 'AB12CD34',
      verificationUrl: 'https://kaystcx.app/verify/AB12CD34',
      qrCode: 'data:image/png;base64,QR',
    });

    expect(toDataURL).toHaveBeenCalledWith(
      'https://kaystcx.app/verify/AB12CD34',
    );

    delete process.env.FRONTEND_URL;
  });

  describe('bulkExport / exportAllFiltered shared filter query (issue #6 / B8)', () => {
    const SEARCH_CLAUSE =
      '(certificate.serialNumber ILIKE :search OR certificate.recipientName ILIKE :search OR certificate.recipientEmail ILIKE :search OR certificate.title ILIKE :search)';

    const mockQueryBuilder = () => {
      const spy = {
        conditions: [] as string[],
        parameters: {} as Record<string, unknown>,
      };
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn(
          (condition: string, params?: Record<string, unknown>) => {
            spy.conditions.push(condition);
            Object.assign(spy.parameters, params ?? {});
            return qb;
          },
        ),
        getMany: jest.fn().mockResolvedValue([]),
      };
      (certificateRepository as any).createQueryBuilder = jest
        .fn()
        .mockReturnValue(qb);
      return { qb, ...spy };
    };

    it('bulkExport applies the shared search/status/date filters plus the certificateIds clause', async () => {
      const { qb, conditions, parameters } = mockQueryBuilder();

      await service.bulkExport(['id-1', 'id-2'], {
        search: 'alice',
        status: 'active',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });

      expect(conditions).toContain('certificate.id IN (:...certificateIds)');
      expect(conditions).toContain(SEARCH_CLAUSE);
      expect(conditions).toContain('certificate.status = :status');
      expect(conditions).toContain('certificate.issuedAt >= :startDate');
      expect(conditions).toContain('certificate.issuedAt <= :endDate');
      expect(parameters).toMatchObject({
        certificateIds: ['id-1', 'id-2'],
        search: '%alice%',
        status: 'active',
      });
      expect(parameters.startDate).toBeInstanceOf(Date);
      expect(parameters.endDate).toBeInstanceOf(Date);
      expect(qb.getMany).toHaveBeenCalledTimes(1);
    });

    it('exportAllFiltered applies the shared filters but never the certificateIds clause', async () => {
      const { conditions, parameters } = mockQueryBuilder();

      await service.exportAllFiltered({ status: 'active' });

      expect(conditions).toContain('certificate.status = :status');
      expect(parameters.status).toBe('active');
      expect(
        conditions.some((condition) => condition.includes('certificate.id IN')),
      ).toBe(false);
    });

    it('bulkExport and exportAllFiltered produce identical filter conditions for identical filters', async () => {
      const filters = {
        search: 'alice',
        status: 'active',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };

      const bulk = mockQueryBuilder();
      await service.bulkExport([], filters);

      const filtered = mockQueryBuilder();
      await service.exportAllFiltered(filters);

      expect(bulk.conditions).toEqual(filtered.conditions);
      expect(bulk.parameters).toEqual(filtered.parameters);
    });

    it('leaves the query untouched when no filters are provided', async () => {
      const { conditions } = mockQueryBuilder();

      await service.exportAllFiltered();

      expect(conditions).toEqual([]);
      expect((certificateRepository as any).createQueryBuilder).toHaveBeenCalledWith(
        'certificate',
      );
    });
  });
});
