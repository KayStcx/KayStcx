import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
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
import { WebhookEvent } from '../webhooks/entities/webhook-subscription.entity';

describe('CertificateService', () => {
  let service: CertificateService;
  let verificationRepository: { save: jest.Mock };
  let webhooksService: { triggerEvent: jest.Mock };

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

  describe('verifyCertificate', () => {
    const code = 'AB12CD34';
    const metadata = {
      verifiedBy: 'public',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    };

    it('records a successful verification with the code and metadata', async () => {
      const certificate = {
        id: 'cert-1',
        issuerId: 'issuer-1',
        recipientEmail: 'recipient@example.com',
      } as Certificate;

      jest
        .spyOn(service, 'findByVerificationCode')
        .mockResolvedValue(certificate);

      const result = await service.verifyCertificate(code, metadata);

      expect(result).toBe(certificate);
      expect(verificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          certificate,
          success: true,
          verificationCode: code,
          verifiedBy: 'public',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
      expect(webhooksService.triggerEvent).toHaveBeenCalledWith(
        WebhookEvent.CERTIFICATE_VERIFIED,
        'issuer-1',
        expect.objectContaining({ id: 'cert-1', verificationCode: code }),
      );
    });

    it('records a failed verification and re-throws the NotFoundException', async () => {
      const notFound = new NotFoundException(
        'Certificate not found or invalid verification code',
      );
      jest.spyOn(service, 'findByVerificationCode').mockRejectedValue(notFound);

      await expect(service.verifyCertificate(code, metadata)).rejects.toThrow(
        NotFoundException,
      );

      expect(verificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          certificate: null,
          success: false,
          verificationCode: code,
          verifiedBy: 'public',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
    });

    it('still re-throws NotFoundException if persisting the failed attempt fails', async () => {
      const notFound = new NotFoundException(
        'Certificate not found or invalid verification code',
      );
      jest.spyOn(service, 'findByVerificationCode').mockRejectedValue(notFound);
      verificationRepository.save.mockRejectedValue(new Error('db down'));

      await expect(service.verifyCertificate(code)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not record a verification for non-not-found errors', async () => {
      jest
        .spyOn(service, 'findByVerificationCode')
        .mockRejectedValue(new Error('unexpected failure'));

      await expect(service.verifyCertificate(code)).rejects.toThrow(
        'unexpected failure',
      );
      expect(verificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('verifyByCode', () => {
    it('forwards request metadata to verifyCertificate', async () => {
      const certificate = { id: 'cert-1' } as Certificate;
      const verifySpy = jest
        .spyOn(service, 'verifyCertificate')
        .mockResolvedValue(certificate);

      await service.verifyByCode('CODE', 'someone', '10.0.0.1', 'agent');

      expect(verifySpy).toHaveBeenCalledWith('CODE', {
        verifiedBy: 'someone',
        ipAddress: '10.0.0.1',
        userAgent: 'agent',
      });
    });
  });
});
