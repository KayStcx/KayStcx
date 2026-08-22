import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AddressValidationService } from './address-validation.service';
import { StellarNetwork } from '../dto/address-validation.dto';
import { LoggingService } from '../../../common/logging/logging.service';

// The Stellar master/zero account is a well-known valid Ed25519 public key.
const VALID_PUBLIC_KEY =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('AddressValidationService', () => {
  let service: AddressValidationService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: any) => {
        const configMap = {
          STELLAR_HORIZON_PUBLIC_URL: 'https://horizon.stellar.org',
          STELLAR_HORIZON_TESTNET_URL: 'https://horizon-testnet.stellar.org',
          STELLAR_CACHE_TTL: 300000,
          STELLAR_CACHE_MAX_SIZE: 1000,
          STELLAR_RATE_LIMIT_RPS: 10,
          STELLAR_RATE_LIMIT_BURST: 20,
        };
        return configMap[key] ?? defaultValue;
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressValidationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggingService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AddressValidationService>(AddressValidationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate', () => {
    it('should validate a correct Stellar address format', async () => {
      const result = await service.validate({
        address: VALID_PUBLIC_KEY,
        network: StellarNetwork.PUBLIC,
        checkExists: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.isFormatValid).toBe(true);
      expect(result.isChecksumValid).toBe(true);
      expect(result.isNetworkValid).toBe(true);
      expect(result.accountExists).toBe(false);
    });

    it('should reject invalid address format', async () => {
      const result = await service.validate({
        address: 'INVALID_ADDRESS',
        network: StellarNetwork.PUBLIC,
        checkExists: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.isFormatValid).toBe(false);
      expect(result.error).toBe('Invalid address format');
    });
  });

  describe('validateAndCheckExists', () => {
    it('should reject an invalid format before attempting an existence check', async () => {
      const result = await service.validateAndCheckExists(
        'INVALID_ADDRESS',
        StellarNetwork.PUBLIC,
      );

      expect(result.isValid).toBe(false);
      expect(result.isFormatValid).toBe(false);
      expect(result.accountExists).toBe(false);
    });
  });

  describe('validateBulk', () => {
    it('should validate multiple addresses', async () => {
      const result = await service.validateBulk({
        addresses: [VALID_PUBLIC_KEY, 'INVALID_ADDRESS'],
        network: StellarNetwork.PUBLIC,
        checkExists: false,
      });

      expect(result.total).toBe(2);
      expect(result.valid).toBe(1);
      expect(result.invalid).toBe(1);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].isValid).toBe(true);
      expect(result.results[1].isValid).toBe(false);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('ttl');
      expect(stats).toHaveProperty('maxSize');
      expect(stats.ttl).toBe(300000);
      expect(stats.maxSize).toBe(1000);
    });
  });
});
