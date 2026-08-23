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

describe('CertificateService', () => {
  let service: CertificateService;
  const certificateRepository = {};
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        {
          provide: getRepositoryToken(Certificate),
          useValue: certificateRepository,
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: verificationRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: DuplicateDetectionService,
          useValue: duplicateDetectionService,
        },
        {
          provide: WebhooksService,
          useValue: webhooksService,
        },
        {
          provide: MetadataSchemaService,
          useValue: metadataSchemaService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: SorobanService,
          useValue: sorobanService,
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

  describe('export query builder (issue #49)', () => {
    const ID_CLAUSE = 'certificate.id IN (:...certificateIds)';
    const STATUS_CLAUSE = 'certificate.status = :status';

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

    it('bulkExport(["id1", "id2"], { status: "active" }) applies both the ID filter and the status filter', async () => {
      const { qb, conditions, parameters } = mockQueryBuilder();

      await service.bulkExport(['id1', 'id2'], { status: 'active' });

      expect(conditions).toContain(ID_CLAUSE);
      expect(conditions).toContain(STATUS_CLAUSE);
      expect(parameters).toMatchObject({
        certificateIds: ['id1', 'id2'],
        status: 'active',
      });
      expect(qb.getMany).toHaveBeenCalledTimes(1);
    });

    it('exportAllFiltered({ status: "active" }) applies the status filter but never an ID filter', async () => {
      const { conditions, parameters } = mockQueryBuilder();

      await service.exportAllFiltered({ status: 'active' });

      expect(conditions).toContain(STATUS_CLAUSE);
      expect(parameters.status).toBe('active');
      expect(
        conditions.some((condition) => condition.includes('certificate.id IN')),
      ).toBe(false);
    });

    it('both methods reuse the same base query (join + ordering) via buildExportQuery', async () => {
      const bulk = mockQueryBuilder();
      await service.bulkExport([], {});

      const filtered = mockQueryBuilder();
      await service.exportAllFiltered({});

      expect(
        (certificateRepository as any).createQueryBuilder,
      ).toHaveBeenCalledWith('certificate');
      expect(bulk.qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'certificate.issuer',
        'issuer',
      );
      expect(bulk.qb.orderBy).toHaveBeenCalledWith(
        'certificate.issuedAt',
        'DESC',
      );
      // With no filters and no IDs, both methods must build the identical query.
      expect(bulk.conditions).toEqual(filtered.conditions);
      expect(bulk.parameters).toEqual(filtered.parameters);
    });
  });
});
