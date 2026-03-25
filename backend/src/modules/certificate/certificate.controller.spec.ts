import { Test, TestingModule } from '@nestjs/testing';
import { CertificateController } from './certificate.controller';
import { CertificateService } from './certificate.service';
import { CertificateStatsService } from './services/stats.service';

describe('CertificateController', () => {
  let controller: CertificateController;
  const certificateService = {
    getCertificateQrCode: jest.fn(),
  };
  const statsService = {
    getPublicSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificateController],
      providers: [
        {
          provide: CertificateService,
          useValue: certificateService,
        },
        {
          provide: CertificateStatsService,
          useValue: statsService,
        },
      ],
    }).compile();

    controller = module.get<CertificateController>(CertificateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate QR code generation to the service', async () => {
    const response = {
      certificateId: 'cert-123',
      verificationCode: 'AB12CD34',
      verificationUrl: 'https://kaystcx.app/verify?serial=AB12CD34',
      qrUrl: 'https://storage.example.com/qr.png',
    };

    certificateService.getCertificateQrCode.mockResolvedValue(response);

    await expect(controller.getQrCode('cert-123')).resolves.toEqual(response);
    expect(certificateService.getCertificateQrCode).toHaveBeenCalledWith(
      'cert-123',
    );
  });
});
