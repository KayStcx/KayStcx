import { Test, TestingModule } from '@nestjs/testing';
import { CertificateService } from './certificate.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Certificate } from './entities/certificate.entity';
import { Verification } from './entities/verification.entity';
import { User } from '../users/entities/user.entity';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { MetadataSchemaService } from '../metadata-schema/services/metadata-schema.service';
import { FilesService } from '../files/services/files.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { SorobanService } from '../stellar/services/soroban.service';

describe('CertificateService', () => {
  let service: CertificateService;
  const certificateRepository = {};
  const verificationRepository = {
    save: jest.fn(),
  };
  const duplicateDetectionService = {};
  const webhooksService = {
    triggerEvent: jest.fn(),
  };
  const metadataSchemaService = {};
  const filesService = {
    generateAndUploadQrCode: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  const userRepository = {};
  const dataSource = {
    createQueryRunner: jest.fn(),
  };
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
          provide: FilesService,
          useValue: filesService,
        },
        {
          provide: ConfigService,
          useValue: configService,
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

  it('should generate a QR code URL for a certificate', async () => {
    const certificate = {
      id: 'cert-123',
      verificationCode: 'AB12CD34',
    } as Certificate;

    jest.spyOn(service, 'findOne').mockResolvedValue(certificate);
    configService.get.mockReturnValue('https://kaystcx.app');
    filesService.generateAndUploadQrCode.mockResolvedValue({
      qrUrl: 'https://storage.example.com/qr.png',
      qrKey: 'qr-key',
      qrBuffer: Buffer.from('qr'),
    });

    await expect(service.getCertificateQrCode('cert-123')).resolves.toEqual({
      id: 'cert-123',
      verificationCode: 'AB12CD34',
      verificationUrl: 'http://localhost:5173/verify/AB12CD34',
      qrCode: expect.any(String),
    });
  });

  describe('verifyCertificate', () => {
    const mockCertificate = {
      id: 'cert-123',
      verificationCode: 'AB12CD34',
      recipientEmail: 'user@example.com',
      issuerId: 'issuer-1',
    } as Certificate;

    beforeEach(() => {
      verificationRepository.save.mockReset();
      webhooksService.triggerEvent.mockReset();
    });

    it('records a successful Verification row with success: true', async () => {
      jest
        .spyOn(service, 'findByVerificationCode')
        .mockResolvedValue(mockCertificate);
      verificationRepository.save.mockResolvedValue({ id: 'v-1' });
      webhooksService.triggerEvent.mockResolvedValue(undefined);

      const result = await service.verifyCertificate('AB12CD34');

      expect(result).toBe(mockCertificate);
      expect(verificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          certificate: mockCertificate,
          verificationCode: 'AB12CD34',
          success: true,
          verifiedAt: expect.any(Date),
        }),
      );
      expect(webhooksService.triggerEvent).toHaveBeenCalled();
    });

    it('records a failed Verification row with success: false on NotFoundException', async () => {
      jest
        .spyOn(service, 'findByVerificationCode')
        .mockRejectedValue(new NotFoundException('not found'));
      verificationRepository.save.mockResolvedValue({ id: 'v-1' });

      await expect(
        service.verifyCertificate('UNKNOWN'),
      ).rejects.toThrow(NotFoundException);

      expect(verificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          certificate: null,
          verificationCode: 'UNKNOWN',
          success: false,
          verifiedAt: expect.any(Date),
        }),
      );
      // Webhook should NOT fire for failed verification
      expect(webhooksService.triggerEvent).not.toHaveBeenCalled();
    });

    it('does not catch non-NotFoundException errors', async () => {
      jest
        .spyOn(service, 'findByVerificationCode')
        .mockRejectedValue(new Error('DB failure'));

      await expect(
        service.verifyCertificate('ANY'),
      ).rejects.toThrow('DB failure');

      expect(verificationRepository.save).not.toHaveBeenCalled();
    });
  });
});
