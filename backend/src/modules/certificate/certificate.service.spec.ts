import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CertificateService } from './certificate.service';
import { Certificate } from './entities/certificate.entity';
import { Verification } from './entities/verification.entity';
import { User } from '../users/entities/user.entity';
import { CertificateStatus } from './constants/certificate-status.enum';
import { SearchCertificatesDto } from './dto/search-certificates.dto';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { MetadataSchemaService } from '../metadata-schema/services/metadata-schema.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { SorobanService } from '../stellar/services/soroban.service';

describe('CertificateService', () => {
  let service: CertificateService;
  let certificateRepository: { createQueryBuilder: jest.Mock };

  const verificationRepository = {};
  const userRepository = {};
  const duplicateDetectionService = {};
  const webhooksService = {};
  const metadataSchemaService = {};
  const dataSource = {};
  const sorobanService = {};

  beforeEach(async () => {
    certificateRepository = {
      createQueryBuilder: jest.fn(),
    };

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

  describe('search', () => {
    let queryBuilder: {
      leftJoinAndSelect: jest.Mock;
      andWhere: jest.Mock;
      skip: jest.Mock;
      take: jest.Mock;
      orderBy: jest.Mock;
      getMany: jest.Mock;
    };

    beforeEach(() => {
      queryBuilder = {
        leftJoinAndSelect: jest.fn(),
        andWhere: jest.fn(),
        skip: jest.fn(),
        take: jest.fn(),
        orderBy: jest.fn(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      queryBuilder.leftJoinAndSelect.mockReturnValue(queryBuilder);
      queryBuilder.andWhere.mockReturnValue(queryBuilder);
      queryBuilder.skip.mockReturnValue(queryBuilder);
      queryBuilder.take.mockReturnValue(queryBuilder);
      queryBuilder.orderBy.mockReturnValue(queryBuilder);

      certificateRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    });

    it('returns certificates without applying filters when none are provided', async () => {
      await service.search({} as SearchCertificatesDto);

      expect(certificateRepository.createQueryBuilder).toHaveBeenCalledWith(
        'certificate',
      );
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.skip).not.toHaveBeenCalled();
      expect(queryBuilder.take).not.toHaveBeenCalled();
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'certificate.issuedAt',
        'DESC',
      );
      expect(queryBuilder.getMany).toHaveBeenCalled();
    });

    it('applies the free-text search filter across title, recipientName and recipientEmail', async () => {
      await service.search({ search: 'john' } as SearchCertificatesDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(certificate.title ILIKE :search OR certificate.recipientName ILIKE :search OR certificate.recipientEmail ILIKE :search)',
        { search: '%john%' },
      );
    });

    it('applies the status filter', async () => {
      await service.search({
        status: CertificateStatus.REVOKED,
      } as SearchCertificatesDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'certificate.status = :status',
        { status: CertificateStatus.REVOKED },
      );
    });

    it('applies the issuerId filter', async () => {
      await service.search({
        issuerId: 'issuer-123',
      } as SearchCertificatesDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'certificate.issuerId = :issuerId',
        { issuerId: 'issuer-123' },
      );
    });

    it('applies pagination when both page and limit are provided', async () => {
      await service.search({ page: 3, limit: 25 } as SearchCertificatesDto);

      expect(queryBuilder.skip).toHaveBeenCalledWith(50);
      expect(queryBuilder.take).toHaveBeenCalledWith(25);
    });

    it('does not apply pagination when page or limit is missing', async () => {
      await service.search({ page: 2 } as SearchCertificatesDto);

      expect(queryBuilder.skip).not.toHaveBeenCalled();
      expect(queryBuilder.take).not.toHaveBeenCalled();
    });
  });

  it('should generate a QR code URL for a certificate', async () => {
    const certificate = {
      id: 'cert-123',
      verificationCode: 'AB12CD34',
    } as Certificate;

    jest.spyOn(service, 'findOne').mockResolvedValue(certificate);

    const result = await service.getCertificateQrCode('cert-123');

    expect(result).toMatchObject({
      id: 'cert-123',
      verificationCode: 'AB12CD34',
      verificationUrl: 'http://localhost:5173/verify/AB12CD34',
    });
    expect(result.qrCode).toEqual(
      expect.stringMatching(/^data:image\/png;base64,/),
    );
  });
});
