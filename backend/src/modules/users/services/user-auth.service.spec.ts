import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserAuthService } from './user-auth.service';
import { UserRepository } from '../repositories/user.repository';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { EmailQueueService } from '../../email/email-queue.service';
import { AuditService } from '../../audit/services/audit.service';
import { LoggingService } from '../../../common/logging/logging.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UserAuthService', () => {
  let service: UserAuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashedPassword123',
    phone: '+1234567890',
    profilePicture: null,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    stellarPublicKey: null,
    isEmailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    isActive: true,
    metadata: null,
    loginAttempts: 0,
    lastLoginAt: null,
    lockedUntil: null,
    refreshToken: 'hashed-refresh-token',
    refreshTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as User;

  const mockUserRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockEmailQueueService = {
    queueVerificationEmail: jest.fn(),
  };

  const mockAuditService = {
    search: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailQueueService, useValue: mockEmailQueueService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<UserAuthService>(UserAuthService);
    userRepository = module.get(UserRepository);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    mockJwtService.verify.mockReturnValue({ sub: mockUser.id });
    mockJwtService.sign.mockReturnValue('mock-jwt-token');
    mockUserRepository.findById.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
    mockUserRepository.update.mockResolvedValue(mockUser);
  });

  describe('generateTokens (via refreshTokens)', () => {
    it('uses configurable access and refresh token expiry from ConfigService', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '30m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
        return defaultValue;
      });

      const result = await service.refreshTokens({
        refreshToken: 'valid-refresh-token',
      });

      // Access token signed with configured access expiry
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser.id }),
        expect.objectContaining({ expiresIn: '30m' }),
      );
      // Refresh token signed with configured refresh expiry
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser.id }),
        expect.objectContaining({ expiresIn: '30d' }),
      );
      // Returned expiresIn reflects the configured access expiry (30m = 1800s)
      expect(result.expiresIn).toBe(1800);
      // Stored refresh token expiry is derived from the configured expiry
      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          refreshToken: expect.any(String),
          refreshTokenExpires: expect.any(Date),
        }),
      );
    });

    it('falls back to sensible defaults when config is not provided', async () => {
      // Simulate ConfigService returning the provided default when unset
      configService.get.mockImplementation(
        (_key: string, defaultValue?: any) => defaultValue,
      );

      const result = await service.refreshTokens({
        refreshToken: 'valid-refresh-token',
      });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser.id }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser.id }),
        expect.objectContaining({ expiresIn: '7d' }),
      );
      // Default access expiry '15m' => 900 seconds
      expect(result.expiresIn).toBe(900);
    });

    it('returns expiresIn in seconds for hour-based access expiry', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '1h';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return defaultValue;
      });

      const result = await service.refreshTokens({
        refreshToken: 'valid-refresh-token',
      });

      expect(result.expiresIn).toBe(3600);
    });

    it('throws UnauthorizedException for an invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(
        service.refreshTokens({ refreshToken: 'invalid-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
