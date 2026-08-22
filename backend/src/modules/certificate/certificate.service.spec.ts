import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
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
  const dataSource = {
    createQueryRunner: jest.fn(),
  };
  const sorobanService = {
    isConfigured: jest.fn().mockReturnValue(false),
    issueCertificate: jest.fn(),
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

    const result = await service.getCertificateQrCode('cert-123');

    expect(result).toMatchObject({
      id: 'cert-123',
      verificationCode: 'AB12CD34',
    });
    expect(result.verificationUrl).toBe(
      'http://localhost:5173/verify/AB12CD34',
    );
    expect(typeof result.qrCode).toBe('string');
    expect(result.qrCode).toContain('data:image');
  });
});
