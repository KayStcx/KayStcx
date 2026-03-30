import { Test, TestingModule } from '@nestjs/testing';
import { CertificateController } from './certificate.controller';
import { CertificateService } from './certificate.service';
import { CertificateStatsService } from './services/stats.service';

describe('CertificateController', () => {
  let controller: CertificateController;
  const certificateService = {
    getCertificateQrCode: jest.fn(),
    verifyCertificate: jest.fn(),
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
      verificationUrl: 'https://stellarcert.app/verify?serial=AB12CD34',
      qrUrl: 'https://storage.example.com/qr.png',
    };

    certificateService.getCertificateQrCode.mockResolvedValue(response);

    await expect(controller.getQrCode('cert-123')).resolves.toEqual(response);
    expect(certificateService.getCertificateQrCode).toHaveBeenCalledWith(
      'cert-123',
    );
  });

  it('should verify certificate with verification code', async () => {
    const mockCertificate = {
      id: 'cert-123',
      title: 'Test Certificate',
      recipientName: 'John Doe',
      recipientEmail: 'john@example.com',
      status: 'active',
      issuedAt: new Date('2024-01-01'),
      expiresAt: new Date('2025-01-01'),
      issuer: {
        name: 'Test Issuer',
        website: 'https://issuer.com',
      },
      verificationCode: 'AB12CD34',
    };

    const expectedResponse = {
      id: mockCertificate.id,
      title: mockCertificate.title,
      recipientName: mockCertificate.recipientName,
      recipientEmail: mockCertificate.recipientEmail,
      status: mockCertificate.status,
      issuedAt: mockCertificate.issuedAt,
      expiresAt: mockCertificate.expiresAt,
      issuer: mockCertificate.issuer,
      verificationCode: mockCertificate.verificationCode,
    };

    certificateService.verifyCertificate.mockResolvedValue(mockCertificate);

    await expect(controller.verifyCertificate('AB12CD34')).resolves.toEqual(expectedResponse);
    expect(certificateService.verifyCertificate).toHaveBeenCalledWith('AB12CD34');
  });
});
