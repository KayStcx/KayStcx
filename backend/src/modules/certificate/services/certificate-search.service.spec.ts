import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CertificateSearchService } from './certificate-search.service';
import { Certificate } from '../entities/certificate.entity';
import { CertificateStatus } from '../constants/certificate-status.enum';

describe('CertificateSearchService', () => {
  let service: CertificateSearchService;
  let repository: jest.Mocked<Repository<Certificate>>;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1500),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateSearchService,
        {
          provide: getRepositoryToken(Certificate),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<CertificateSearchService>(CertificateSearchService);
    repository = module.get(getRepositoryToken(Certificate));
  });

  describe('exportCertificates', () => {
    it('should use default page=1 and limit=1000 when called without pagination arguments', async () => {
      const mockCerts = Array.from({ length: 10 }, (_, i) => ({
        id: `cert-${i}`,
      })) as Certificate[];
      queryBuilder.getMany.mockResolvedValue(mockCerts);
      queryBuilder.getCount.mockResolvedValue(10);

      const result = await service.exportCertificates();

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(1000);
      expect(result).toEqual({
        certificates: mockCerts,
        total: 10,
      });
    });

    it('should apply correct skip and take when called with custom page=2 and limit=500', async () => {
      const mockCerts = Array.from({ length: 5 }, (_, i) => ({
        id: `cert-p2-${i}`,
      })) as Certificate[];
      queryBuilder.getMany.mockResolvedValue(mockCerts);
      queryBuilder.getCount.mockResolvedValue(1500);

      const result = await service.exportCertificates(2, 500);

      expect(queryBuilder.skip).toHaveBeenCalledWith(500);
      expect(queryBuilder.take).toHaveBeenCalledWith(500);
      expect(result).toEqual({
        certificates: mockCerts,
        total: 1500,
      });
    });

    it('should filter by issuerId and status when provided', async () => {
      queryBuilder.getMany.mockResolvedValue([]);
      queryBuilder.getCount.mockResolvedValue(0);

      await service.exportCertificates(
        1,
        100,
        'issuer-123',
        CertificateStatus.ACTIVE,
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'certificate.issuerId = :issuerId',
        { issuerId: 'issuer-123' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'certificate.status = :status',
        { status: CertificateStatus.ACTIVE },
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(100);
    });
  });

  describe('findAll', () => {
    it('should apply pagination and return certificates and total', async () => {
      queryBuilder.getMany.mockResolvedValue([]);
      queryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(1, 10);

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({ certificates: [], total: 0 });
    });
  });
});
