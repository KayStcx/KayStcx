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
import {
  SorobanErrorCode,
  SorobanNetworkException,
} from '../stellar/exceptions/soroban.exception';
import { CreateCertificateDto } from './dto/create-certificate.dto';

describe('CertificateService', () => {
  let service: CertificateService;

  const certificateRepository = {
    update: jest.fn(),
  };
  const verificationRepository = {};
  const userRepository = {
    findOne: jest.fn(),
  };
  const duplicateDetectionService = {};
  const webhooksService = {
    triggerEvent: jest.fn(),
  };
  const metadataSchemaService = {};
  const sorobanService = {
    isConfigured: jest.fn(),
    issueCertificate: jest.fn(),
  };

  const queryRunnerManager = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: queryRunnerManager,
  };
  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    queryRunnerManager.create.mockImplementation((_entity, data) => ({
      id: 'cert-123',
      certificateId: 'CERT-2024-AB12CD34',
      status: 'active',
      issuedAt: new Date('2026-01-01T00:00:00Z'),
      // Stellar addresses live on the entity, not the DTO — the mock injects
      // them so the on-chain issuance path is exercised.
      issuerStellarAddress:
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      recipientStellarAddress:
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      ...data,
    }));
    queryRunnerManager.save.mockImplementation((certificate) => {
      if (typeof certificate.id !== 'string') {
        certificate.id = 'cert-123';
      }
      return certificate;
    });
    queryRunner.connect.mockResolvedValue(undefined);
    queryRunner.startTransaction.mockResolvedValue(undefined);
    queryRunner.commitTransaction.mockResolvedValue(undefined);
    queryRunner.rollbackTransaction.mockResolvedValue(undefined);
    queryRunner.release.mockResolvedValue(undefined);
    certificateRepository.update.mockResolvedValue(undefined);

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
          provide: getRepositoryToken(User),
          useValue: userRepository,
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

  const validDto = (): CreateCertificateDto =>
    ({
      issuerId: 'issuer-1',
      recipientId: 'recipient-1',
      recipientEmail: 'recipient@example.com',
      recipientName: 'Recipient',
      title: 'Course Completion',
      courseName: 'Course',
      verificationCode: 'AB12CD34',
      expiresAt: new Date('2027-01-01T00:00:00Z'),
    }) as CreateCertificateDto;

  describe('on-chain issuance error propagation (issue #46)', () => {
    beforeEach(() => {
      sorobanService.isConfigured.mockReturnValue(true);
    });

    it('propagates a SorobanNetworkException raised by issueCertificate instead of returning false', async () => {
      const timeoutError = new SorobanNetworkException(
        'Certificate issuance: failed to submit transaction: request timed out',
        new Error('ETIMEDOUT'),
      );
      sorobanService.issueCertificate.mockRejectedValue(timeoutError);

      const dto = validDto();
      const result = service.create(dto);

      // The typed exception reaches CertificateService intact — neither
      // swallowed into `false` nor wrapped into a generic error.
      await expect(result).rejects.toBe(timeoutError);
      await expect(result).rejects.toBeInstanceOf(SorobanNetworkException);

      // The on-chain call was attempted with the certificate's details.
      expect(sorobanService.issueCertificate).toHaveBeenCalledWith(
        'cert-123',
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        dto.verificationCode,
        Math.floor(dto.expiresAt!.getTime() / 1000),
      );
    });

    it('keeps the blockchain error message and error code intact for the HTTP response', async () => {
      sorobanService.issueCertificate.mockRejectedValue(
        new SorobanNetworkException(
          'Certificate issuance: failed to submit transaction: request timed out',
        ),
      );

      const result = service.create(validDto());

      // The original message must survive end-to-end — the global exception
      // filter (covered by its own spec) maps this exception and message into
      // the HTTP response body with the typed error code.
      await expect(result).rejects.toThrow(
        'Certificate issuance: failed to submit transaction: request timed out',
      );
      await expect(result).rejects.toMatchObject({
        code: SorobanErrorCode.NETWORK_ERROR,
        name: 'SorobanNetworkException',
      });
    });
  });

  it('should generate a QR code URL for a certificate', async () => {
    const certificate = {
      id: 'cert-123',
      verificationCode: 'AB12CD34',
    } as Certificate;

    jest.spyOn(service, 'findOne').mockResolvedValue(certificate);

    const previousFrontendUrl = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'https://kaystcx.app';

    try {
      const result = await service.getCertificateQrCode('cert-123');

      expect(result).toMatchObject({
        id: 'cert-123',
        verificationCode: 'AB12CD34',
        verificationUrl: 'https://kaystcx.app/verify/AB12CD34',
      });
      expect(result.qrCode).toContain('data:image/png;base64,');
    } finally {
      if (previousFrontendUrl === undefined) {
        delete process.env.FRONTEND_URL;
      } else {
        process.env.FRONTEND_URL = previousFrontendUrl;
      }
    }
  });
});
