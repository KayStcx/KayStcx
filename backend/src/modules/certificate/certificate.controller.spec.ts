import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CertificateController } from './certificate.controller';
import { CertificateService } from './certificate.service';
import { CertificateStatsService } from './services/stats.service';
import { CertificatePdfService } from './services/pdf.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';

describe('CertificateController', () => {
  let controller: CertificateController;
  const certificateService = {
    getCertificateQrCode: jest.fn(),
    verifyCertificate: jest.fn(),
    verifyByCode: jest.fn(),
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
        {
          provide: CertificatePdfService,
          useValue: {
            generate: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        CacheInterceptor,
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

    certificateService.verifyByCode.mockResolvedValue(mockCertificate);

    const req = {
      headers: {
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent',
      },
      ip: '127.0.0.1',
    };

    const result = await controller.verifyByCode(
      'AB12CD34',
      req as any,
      'public',
    );

    expect(certificateService.verifyByCode).toHaveBeenCalledWith(
      'AB12CD34',
      'public',
      '127.0.0.1',
      'test-agent',
    );
    expect(result).toEqual(mockCertificate);
  });
});
