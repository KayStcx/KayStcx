import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { UserRepository } from './repositories/user.repository';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailQueueService } from '../email/email-queue.service';
import { CertificateStatsService } from '../certificate/services/stats.service';
import { AuditService } from '../audit/services/audit.service';
import { LoggingService } from '../../common/logging/logging.service';
import { UserAuthService } from './services/user-auth.service';
import { UserProfileService } from './services/user-profile.service';
import { UserPasswordService } from './services/user-password.service';
import { UserAdminService } from './services/user-admin.service';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userAuthService: jest.Mocked<UserAuthService>;
  let userProfileService: jest.Mocked<UserProfileService>;
  let userPasswordService: jest.Mocked<UserPasswordService>;
  let userAdminService: jest.Mocked<UserAdminService>;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let emailQueueService: jest.Mocked<EmailQueueService>;
  let certificateStatsService: jest.Mocked<CertificateStatsService>;
  let auditService: jest.Mocked<AuditService>;

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
    refreshToken: null,
    refreshTokenExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    },
    isLocked: jest.fn().mockReturnValue(false),
    isEmailVerificationTokenValid: jest.fn().mockReturnValue(true),
    isPasswordResetTokenValid: jest.fn().mockReturnValue(true),
  } as unknown as User;

  const mockPublicUser = {
    id: mockUser.id,
    email: mockUser.email,
    username: mockUser.username,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
    profilePicture: mockUser.profilePicture,
    role: mockUser.role,
    stellarPublicKey: mockUser.stellarPublicKey,
    isEmailVerified: mockUser.isEmailVerified,
    createdAt: mockUser.createdAt,
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  };

  const mockUserRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdWithPassword: jest.fn(),
    findByEmail: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    findByUsername: jest.fn(),
    findByStellarPublicKey: jest.fn(),
    findByEmailVerificationToken: jest.fn(),
    findUsersWithPasswordResetTokens: jest.fn(),
    findByRefreshToken: jest.fn(),
    findByPasswordResetTokenHash: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    findAll: jest.fn(),
    findPaginated: jest.fn(),
    countByRole: jest.fn(),
    countByStatus: jest.fn(),
    countActive: jest.fn(),
    countTotal: jest.fn(),
    existsByEmail: jest.fn(),
    existsByUsername: jest.fn(),
    existsByStellarPublicKey: jest.fn(),
    incrementLoginAttempts: jest.fn(),
    resetLoginAttempts: jest.fn(),
    lockAccount: jest.fn(),
    updateLastLogin: jest.fn(),
    getPerUserCertificateCounts: jest.fn(),
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
    queuePasswordReset: jest.fn(),
  };

  const mockCertificateStatsService = {
    getStatistics: jest.fn(),
  };

  const mockAuditService = {
    search: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockUserAuthService = {
    findByEmailWithPassword: jest.fn(),
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
  };

  const mockUserProfileService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
  };

  const mockUserPasswordService = {
    changePassword: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  const mockUserAdminService = {
    findAllUsers: jest.fn(),
    findUserById: jest.fn(),
    adminUpdateUser: jest.fn(),
    updateUserRole: jest.fn(),
    updateUserStatus: jest.fn(),
    deactivateUser: jest.fn(),
    reactivateUser: jest.fn(),
    deleteUser: jest.fn(),
    getIssuerStats: jest.fn(),
    getIssuerActivity: jest.fn(),
    updateIssuerProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailQueueService, useValue: mockEmailQueueService },
        { provide: CertificateStatsService, useValue: mockCertificateStatsService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: LoggingService, useValue: mockLogger },
        { provide: UserAuthService, useValue: mockUserAuthService },
        { provide: UserProfileService, useValue: mockUserProfileService },
        { provide: UserPasswordService, useValue: mockUserPasswordService },
        { provide: UserAdminService, useValue: mockUserAdminService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userAuthService = module.get(UserAuthService);
    userProfileService = module.get(UserProfileService);
    userPasswordService = module.get(UserPasswordService);
    userAdminService = module.get(UserAdminService);
    userRepository = module.get(UserRepository);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    emailQueueService = module.get(EmailQueueService);
    certificateStatsService = module.get(CertificateStatsService);
    auditService = module.get(AuditService);

    // Default mock implementations
    mockConfigService.get.mockReturnValue('1h');
    mockJwtService.sign.mockReturnValue('mock-jwt-token');
    mockCertificateStatsService.getStatistics.mockResolvedValue({
      totalCertificates: 0,
      activeCertificates: 0,
      revokedCertificates: 0,
      expiredCertificates: 0,
      verificationStats: { totalVerifications: 0 },
    });
    mockAuditService.search.mockResolvedValue({ data: [], total: 0 });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockUserRepository.delete.mockResolvedValue(true);
    mockUserRepository.softDelete.mockResolvedValue(mockUser);
    mockUserRepository.findPaginated.mockResolvedValue({
      data: [mockUser],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });
  });

  describe('register', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'SecureP@ss123',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    it('should successfully register a new user', async () => {
      mockUserAuthService.register.mockResolvedValue({
        user: mockPublicUser,
        tokens: mockTokens,
      });

      const result = await service.register(createUserDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(mockUserAuthService.register).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserAuthService.register.mockRejectedValue(
        new ConflictException('Email already registered'),
      );

      await expect(service.register(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if username already exists', async () => {
      mockUserAuthService.register.mockRejectedValue(
        new ConflictException('Username already taken'),
      );

      await expect(
        service.register({ ...createUserDto, username: 'existinguser' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if Stellar public key already exists', async () => {
      mockUserAuthService.register.mockRejectedValue(
        new ConflictException('Stellar public key already registered'),
      );

      await expect(
        service.register({
          ...createUserDto,
          stellarPublicKey: 'GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      email: 'test@example.com',
      password: 'SecureP@ss123',
    };

    it('should successfully login a user', async () => {
      mockUserAuthService.login.mockResolvedValue({
        user: mockPublicUser,
        tokens: mockTokens,
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(mockUserAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockUserAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockUserAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException for locked account', async () => {
      mockUserAuthService.login.mockRejectedValue(
        new ForbiddenException('Account is locked'),
      );

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for deactivated account', async () => {
      mockUserAuthService.login.mockRejectedValue(
        new ForbiddenException('Account is deactivated'),
      );

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });

    it('should increment login attempts on failed login', async () => {
      mockUserAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should lock account after max failed attempts', async () => {
      mockUserAuthService.login.mockRejectedValue(
        new ForbiddenException('Too many failed attempts. Account locked'),
      );

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      mockUserAuthService.logout.mockResolvedValue(undefined);

      await service.logout(mockUser.id);

      expect(mockUserAuthService.logout).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens', async () => {
      mockUserAuthService.refreshTokens.mockResolvedValue(mockTokens);

      const result = await service.refreshTokens({
        refreshToken: 'valid-refresh-token',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockUserAuthService.refreshTokens).toHaveBeenCalledWith({
        refreshToken: 'valid-refresh-token',
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockUserAuthService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(
        service.refreshTokens({ refreshToken: 'invalid-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      mockUserAuthService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Refresh token expired'),
      );

      await expect(
        service.refreshTokens({ refreshToken: 'expired-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email', async () => {
      mockUserAuthService.verifyEmail.mockResolvedValue({
        message: 'Email verified successfully',
      });

      const result = await service.verifyEmail({ token: 'valid-token' });

      expect(result.message).toBe('Email verified successfully');
      expect(mockUserAuthService.verifyEmail).toHaveBeenCalledWith({
        token: 'valid-token',
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockUserAuthService.verifyEmail.mockRejectedValue(
        new BadRequestException('Invalid verification token'),
      );

      await expect(
        service.verifyEmail({ token: 'invalid-token' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      mockUserAuthService.verifyEmail.mockRejectedValue(
        new BadRequestException('Verification token has expired'),
      );

      await expect(
        service.verifyEmail({ token: 'expired-token' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerificationEmail', () => {
    it('should queue a new verification email for an existing unverified user', async () => {
      mockUserAuthService.resendVerificationEmail.mockResolvedValue({
        message: 'If the email exists, a verification link has been sent',
      });

      const result = await service.resendVerificationEmail({
        email: 'test@example.com',
      });

      expect(result.message).toContain('If the email exists');
      expect(mockUserAuthService.resendVerificationEmail).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'OldP@ss123',
      newPassword: 'NewP@ss456',
      confirmPassword: 'NewP@ss456',
    };

    it('should successfully change password', async () => {
      mockUserPasswordService.changePassword.mockResolvedValue({
        message: 'Password changed successfully',
      });

      const result = await service.changePassword(
        mockUser.id,
        changePasswordDto,
      );

      expect(result.message).toBe('Password changed successfully');
      expect(mockUserPasswordService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        changePasswordDto,
      );
    });

    it('should throw BadRequestException if passwords do not match', async () => {
      mockUserPasswordService.changePassword.mockRejectedValue(
        new BadRequestException('Passwords do not match'),
      );

      await expect(
        service.changePassword(mockUser.id, {
          ...changePasswordDto,
          confirmPassword: 'DifferentP@ss',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserPasswordService.changePassword.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        service.changePassword('non-existent-id', changePasswordDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      mockUserPasswordService.changePassword.mockRejectedValue(
        new UnauthorizedException('Current password is incorrect'),
      );

      await expect(
        service.changePassword(mockUser.id, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should return success message regardless of email existence', async () => {
      // When user is not found, returns generic message without revealing if email exists
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nonexistent@example.com',
      });

      expect(result.message).toContain('If the email exists');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'nonexistent@example.com',
      );
    });

    it('should generate reset token for existing user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'APP_URL') return 'http://localhost:5173';
        if (key === 'ALLOWED_ORIGINS') return undefined;
        return defaultValue ?? '1h';
      });
      mockEmailQueueService.queuePasswordReset.mockResolvedValue(undefined);

      const result = await service.forgotPassword({ email: mockUser.email });

      expect(result.message).toContain('If the email exists');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        mockUser.email,
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          passwordResetToken: expect.any(String),
          passwordResetTokenHash: expect.any(String),
          passwordResetExpires: expect.any(Date),
        }),
      );
      expect(mockEmailQueueService.queuePasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          userName: 'John Doe',
          resetLink: expect.stringContaining('reset-password?token='),
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      mockUserRepository.findByPasswordResetTokenHash.mockResolvedValue(
        mockUser,
      );

      const result = await service.resetPassword({
        token: 'valid-token',
        newPassword: 'NewP@ss456',
        confirmPassword: 'NewP@ss456',
      });

      expect(result.message).toBe('Password reset successfully');
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          password: expect.any(String),
        }),
      );
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockUserRepository.findByPasswordResetTokenHash.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'invalid-token',
          newPassword: 'NewP@ss456',
          confirmPassword: 'NewP@ss456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired matching token', async () => {
      const expiredUser = {
        ...mockUser,
        isPasswordResetTokenValid: jest.fn().mockReturnValue(false),
      };
      mockUserRepository.findByPasswordResetTokenHash.mockResolvedValue(
        expiredUser,
      );

      await expect(
        service.resetPassword({
          token: 'expired-token',
          newPassword: 'NewP@ss456',
          confirmPassword: 'NewP@ss456',
        }),
      ).rejects.toThrow('Reset token has expired');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockUserProfileService.getProfile.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(mockUserProfileService.getProfile).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserProfileService.getProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(service.getProfile('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    const updateProfileDto: UpdateProfileDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should successfully update profile', async () => {
      mockUserProfileService.updateProfile.mockResolvedValue({
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name',
      });

      const result = await service.updateProfile(mockUser.id, updateProfileDto);

      expect(result.firstName).toBe('Updated');
      expect(mockUserProfileService.updateProfile).toHaveBeenCalledWith(
        mockUser.id,
        updateProfileDto,
      );
    });

    it('should throw ConflictException if username is taken', async () => {
      mockUserProfileService.updateProfile.mockRejectedValue(
        new ConflictException('Username already taken'),
      );

      await expect(
        service.updateProfile(mockUser.id, { username: 'takenusername' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteProfile', () => {
    it('should soft delete user profile', async () => {
      mockUserProfileService.deleteProfile.mockResolvedValue({
        message: 'Account deactivated successfully',
      });

      const result = await service.deleteProfile(mockUser.id);

      expect(result.message).toBe('Account deactivated successfully');
      expect(mockUserProfileService.deleteProfile).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('Admin Operations', () => {
    const adminId = 'admin-123';

    describe('findAllUsers', () => {
      it('should return paginated users', async () => {
        const paginatedResult = {
          data: [mockUser],
          meta: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
        mockUserAdminService.findAllUsers.mockResolvedValue(paginatedResult);

        const result = await service.findAllUsers({ page: 1, limit: 10 });

        expect(result).toEqual(paginatedResult);
        expect(mockUserAdminService.findAllUsers).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
        });
      });
    });

    describe('updateUserRole', () => {
      it('should update user role', async () => {
        mockUserAdminService.updateUserRole.mockResolvedValue({
          ...mockUser,
          role: UserRole.ISSUER,
        });

        const result = await service.updateUserRole(adminId, mockUser.id, {
          role: UserRole.ISSUER,
        });

        expect(result.role).toBe(UserRole.ISSUER);
        expect(mockUserAdminService.updateUserRole).toHaveBeenCalledWith(
          adminId,
          mockUser.id,
          { role: UserRole.ISSUER },
        );
      });

      it('should throw ForbiddenException when admin tries to modify own role', async () => {
        mockUserAdminService.updateUserRole.mockRejectedValue(
          new ForbiddenException('Cannot modify your own role'),
        );

        await expect(
          service.updateUserRole(mockUser.id, mockUser.id, {
            role: UserRole.ADMIN,
          }),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('deactivateUser', () => {
      it('should deactivate user', async () => {
        mockUserAdminService.deactivateUser.mockResolvedValue({
          ...mockUser,
          isActive: false,
          status: UserStatus.INACTIVE,
        });

        const result = await service.deactivateUser(adminId, mockUser.id, {
          reason: 'Test reason',
        });

        expect(result.isActive).toBe(false);
        expect(mockUserAdminService.deactivateUser).toHaveBeenCalledWith(
          adminId,
          mockUser.id,
          { reason: 'Test reason' },
        );
      });

      it('should throw ForbiddenException when admin tries to deactivate self', async () => {
        mockUserAdminService.deactivateUser.mockRejectedValue(
          new ForbiddenException('Cannot deactivate your own account'),
        );

        await expect(
          service.deactivateUser(mockUser.id, mockUser.id, {}),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('deleteUser', () => {
      it('should permanently delete user', async () => {
        mockUserAdminService.deleteUser.mockResolvedValue({
          message: 'User deleted successfully',
        });

        const result = await service.deleteUser(adminId, mockUser.id);

        expect(result.message).toBe('User deleted successfully');
        expect(mockUserAdminService.deleteUser).toHaveBeenCalledWith(
          adminId,
          mockUser.id,
        );
      });

      it('should throw ForbiddenException when admin tries to delete self', async () => {
        mockUserAdminService.deleteUser.mockRejectedValue(
          new ForbiddenException('Cannot delete your own account'),
        );

        await expect(
          service.deleteUser(mockUser.id, mockUser.id),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      mockUserRepository.countTotal.mockResolvedValue(100);
      mockUserRepository.countActive.mockResolvedValue(80);
      mockUserRepository.countByRole.mockResolvedValue(50);
      mockUserRepository.countByStatus.mockResolvedValue(60);
      mockUserRepository.getPerUserCertificateCounts.mockResolvedValue({
        user1: 5,
      });

      const result = await service.getUserStats();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('active');
      expect(result).toHaveProperty('byRole');
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('certificateIssuanceCounts');
      expect(result.certificateIssuanceCounts).toEqual({ user1: 5 });
    });
  });
});
