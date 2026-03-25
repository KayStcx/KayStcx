import { Test, TestingModule } from '@nestjs/testing';
import { CertificateService } from './certificate.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Certificate } from './entities/certificate.entity';
import { Verification } from './entities/verification.entity';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { MetadataSchemaService } from '../metadata-schema/services/metadata-schema.service';
import { FilesService } from '../files/services/files.service';
import { WebhooksService } from '../webhooks/webhooks.service';

describe('CertificateService', () => {
  let service: CertificateService;
  const certificateRepository = {};
  const verificationRepository = {};
  const duplicateDetectionService = {};
  const webhooksService = {};
  const metadataSchemaService = {};
  const filesService = {
    generateAndUploadQrCode: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
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
      certificateId: 'cert-123',
      verificationCode: 'AB12CD34',
      verificationUrl: 'https://kaystcx.app/verify?serial=AB12CD34',
      qrUrl: 'https://storage.example.com/qr.png',
    });

    expect(filesService.generateAndUploadQrCode).toHaveBeenCalledWith(
      'https://kaystcx.app/verify?serial=AB12CD34',
      'certificate-cert-123-qr',
    );
  });
});
