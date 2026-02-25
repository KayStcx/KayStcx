"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const user_entity_1 = require("./entities/user.entity");
const user_repository_1 = require("./repositories/user.repository");
let UsersService = UsersService_1 = class UsersService {
    userRepository;
    jwtService;
    configService;
    logger = new common_1.Logger(UsersService_1.name);
    SALT_ROUNDS = 12;
    MAX_LOGIN_ATTEMPTS = 5;
    LOCK_TIME_MINUTES = 30;
    EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
    PASSWORD_RESET_EXPIRY_HOURS = 1;
    constructor(userRepository, jwtService, configService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async register(createUserDto) {
        const { email, password, stellarPublicKey, username } = createUserDto;
        if (await this.userRepository.existsByEmail(email)) {
            throw new common_1.ConflictException('Email already registered');
        }
        if (username && (await this.userRepository.existsByUsername(username))) {
            throw new common_1.ConflictException('Username already taken');
        }
        if (stellarPublicKey &&
            (await this.userRepository.existsByStellarPublicKey(stellarPublicKey))) {
            throw new common_1.ConflictException('Stellar public key already registered');
        }
        const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
        const emailVerificationToken = this.generateToken();
        const emailVerificationExpires = new Date();
        emailVerificationExpires.setHours(emailVerificationExpires.getHours() +
            this.EMAIL_VERIFICATION_EXPIRY_HOURS);
        const user = await this.userRepository.create({
            ...createUserDto,
            password: hashedPassword,
            emailVerificationToken,
            emailVerificationExpires,
            status: user_entity_1.UserStatus.PENDING_VERIFICATION,
            role: createUserDto.role || user_entity_1.UserRole.USER,
        });
        this.logger.log(`New user registered: ${user.email}`);
        const tokens = await this.generateTokens(user);
        return {
            user: this.toPublicUser(user),
            tokens,
        };
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.userRepository.findByEmailWithPassword(email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.isLocked()) {
            const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            throw new common_1.ForbiddenException(`Account is locked. Please try again in ${remainingTime} minutes`);
        }
        if (!user.isActive) {
            throw new common_1.ForbiddenException('Account is deactivated');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            await this.userRepository.incrementLoginAttempts(user.id);
            if (user.loginAttempts + 1 >= this.MAX_LOGIN_ATTEMPTS) {
                const lockUntil = new Date();
                lockUntil.setMinutes(lockUntil.getMinutes() + this.LOCK_TIME_MINUTES);
                await this.userRepository.lockAccount(user.id, lockUntil);
                throw new common_1.ForbiddenException(`Too many failed attempts. Account locked for ${this.LOCK_TIME_MINUTES} minutes`);
            }
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.userRepository.resetLoginAttempts(user.id);
        await this.userRepository.updateLastLogin(user.id);
        const tokens = await this.generateTokens(user);
        this.logger.log(`User logged in: ${user.email}`);
        return {
            user: this.toPublicUser(user),
            tokens,
        };
    }
    async logout(userId) {
        await this.userRepository.update(userId, {
            refreshToken: undefined,
            refreshTokenExpires: undefined,
        });
        this.logger.log(`User logged out: ${userId}`);
    }
    async refreshTokens(refreshTokenDto) {
        const { refreshToken } = refreshTokenDto;
        const user = await this.userRepository.findByRefreshToken(refreshToken);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (user.refreshTokenExpires && user.refreshTokenExpires < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token expired');
        }
        return this.generateTokens(user);
    }
    async verifyEmail(verifyEmailDto) {
        const { token } = verifyEmailDto;
        const user = await this.userRepository.findByEmailVerificationToken(token);
        if (!user) {
            throw new common_1.BadRequestException('Invalid verification token');
        }
        if (!user.isEmailVerificationTokenValid()) {
            throw new common_1.BadRequestException('Verification token has expired');
        }
        await this.userRepository.update(user.id, {
            isEmailVerified: true,
            emailVerificationToken: undefined,
            emailVerificationExpires: undefined,
            status: user_entity_1.UserStatus.ACTIVE,
        });
        this.logger.log(`Email verified for user: ${user.email}`);
        return { message: 'Email verified successfully' };
    }
    async resendVerificationEmail(resendDto) {
        const { email } = resendDto;
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            return {
                message: 'If the email exists, a verification link has been sent',
            };
        }
        if (user.isEmailVerified) {
            throw new common_1.BadRequestException('Email is already verified');
        }
        const emailVerificationToken = this.generateToken();
        const emailVerificationExpires = new Date();
        emailVerificationExpires.setHours(emailVerificationExpires.getHours() +
            this.EMAIL_VERIFICATION_EXPIRY_HOURS);
        await this.userRepository.update(user.id, {
            emailVerificationToken,
            emailVerificationExpires,
        });
        return {
            message: 'If the email exists, a verification link has been sent',
        };
    }
    async changePassword(userId, changePasswordDto) {
        const { currentPassword, newPassword, confirmPassword } = changePasswordDto;
        if (newPassword !== confirmPassword) {
            throw new common_1.BadRequestException('Passwords do not match');
        }
        const user = await this.userRepository.findByIdWithPassword(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
        await this.userRepository.update(userId, { password: hashedPassword });
        this.logger.log(`Password changed for user: ${user.email}`);
        return { message: 'Password changed successfully' };
    }
    async forgotPassword(forgotPasswordDto) {
        const { email } = forgotPasswordDto;
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            return {
                message: 'If the email exists, a password reset link has been sent',
            };
        }
        const passwordResetToken = this.generateToken();
        const passwordResetExpires = new Date();
        passwordResetExpires.setHours(passwordResetExpires.getHours() + this.PASSWORD_RESET_EXPIRY_HOURS);
        await this.userRepository.update(user.id, {
            passwordResetToken,
            passwordResetExpires,
        });
        this.logger.log(`Password reset requested for: ${email}`);
        return {
            message: 'If the email exists, a password reset link has been sent',
        };
    }
    async resetPassword(resetPasswordDto) {
        const { token, newPassword, confirmPassword } = resetPasswordDto;
        if (newPassword !== confirmPassword) {
            throw new common_1.BadRequestException('Passwords do not match');
        }
        const user = await this.userRepository.findByPasswordResetToken(token);
        if (!user) {
            throw new common_1.BadRequestException('Invalid reset token');
        }
        if (!user.isPasswordResetTokenValid()) {
            throw new common_1.BadRequestException('Reset token has expired');
        }
        const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
        await this.userRepository.update(user.id, {
            password: hashedPassword,
            passwordResetToken: undefined,
            passwordResetExpires: undefined,
        });
        this.logger.log(`Password reset completed for: ${user.email}`);
        return { message: 'Password reset successfully' };
    }
    async getProfile(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateProfile(userId, updateProfileDto) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (updateProfileDto.username &&
            updateProfileDto.username !== user.username) {
            if (await this.userRepository.existsByUsername(updateProfileDto.username)) {
                throw new common_1.ConflictException('Username already taken');
            }
        }
        if (updateProfileDto.stellarPublicKey &&
            updateProfileDto.stellarPublicKey !== user.stellarPublicKey) {
            if (await this.userRepository.existsByStellarPublicKey(updateProfileDto.stellarPublicKey)) {
                throw new common_1.ConflictException('Stellar public key already registered');
            }
        }
        const updatedUser = await this.userRepository.update(userId, updateProfileDto);
        this.logger.log(`Profile updated for user: ${user.email}`);
        return updatedUser;
    }
    async deleteProfile(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.userRepository.softDelete(userId);
        this.logger.log(`Profile deleted (soft) for user: ${user.email}`);
        return { message: 'Account deactivated successfully' };
    }
    async findAllUsers(filterDto) {
        const { page, limit, sortBy, sortOrder, ...filters } = filterDto;
        return this.userRepository.findPaginated({ page: page || 1, limit: limit || 10 }, filters, { field: sortBy || 'createdAt', order: sortOrder || 'DESC' });
    }
    async findUserById(id) {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async adminUpdateUser(adminId, userId, updateDto) {
        if (adminId === userId && updateDto.role) {
            throw new common_1.ForbiddenException('Cannot modify your own role');
        }
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updatedUser = await this.userRepository.update(userId, updateDto);
        this.logger.log(`Admin ${adminId} updated user ${userId}`);
        return updatedUser;
    }
    async updateUserRole(adminId, userId, updateRoleDto) {
        if (adminId === userId) {
            throw new common_1.ForbiddenException('Cannot modify your own role');
        }
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updatedUser = await this.userRepository.update(userId, {
            role: updateRoleDto.role,
        });
        this.logger.log(`Admin ${adminId} changed role of user ${userId} to ${updateRoleDto.role}`);
        return updatedUser;
    }
    async updateUserStatus(adminId, userId, updateStatusDto) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updatedUser = await this.userRepository.update(userId, {
            status: updateStatusDto.status,
            isActive: updateStatusDto.status === user_entity_1.UserStatus.ACTIVE,
        });
        this.logger.log(`Admin ${adminId} changed status of user ${userId} to ${updateStatusDto.status}`);
        return updatedUser;
    }
    async deactivateUser(adminId, userId, deactivateDto) {
        if (adminId === userId) {
            throw new common_1.ForbiddenException('Cannot deactivate your own account');
        }
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updatedUser = await this.userRepository.update(userId, {
            isActive: false,
            status: user_entity_1.UserStatus.INACTIVE,
            metadata: {
                ...user.metadata,
                deactivationReason: deactivateDto.reason,
                deactivatedBy: adminId,
                deactivatedAt: new Date().toISOString(),
            },
        });
        this.logger.log(`Admin ${adminId} deactivated user ${userId}`);
        return updatedUser;
    }
    async reactivateUser(adminId, userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updatedUser = await this.userRepository.update(userId, {
            isActive: true,
            status: user.isEmailVerified
                ? user_entity_1.UserStatus.ACTIVE
                : user_entity_1.UserStatus.PENDING_VERIFICATION,
            metadata: {
                ...user.metadata,
                reactivatedBy: adminId,
                reactivatedAt: new Date().toISOString(),
            },
        });
        this.logger.log(`Admin ${adminId} reactivated user ${userId}`);
        return updatedUser;
    }
    async deleteUser(adminId, userId) {
        if (adminId === userId) {
            throw new common_1.ForbiddenException('Cannot delete your own account');
        }
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.userRepository.delete(userId);
        this.logger.log(`Admin ${adminId} permanently deleted user ${userId}`);
        return { message: 'User deleted successfully' };
    }
    async getIssuerStats(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.role !== user_entity_1.UserRole.ISSUER && user.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only issuers and admins can access issuer stats');
        }
        return {
            totalCertificates: 125,
            activeCertificates: 118,
            revokedCertificates: 7,
            expiredCertificates: 0,
            totalVerifications: 2847,
            lastLogin: user.lastLoginAt || user.updatedAt,
        };
    }
    async getIssuerActivity(userId, page = 1, limit = 10) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.role !== user_entity_1.UserRole.ISSUER && user.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only issuers and admins can access activity logs');
        }
        const mockActivities = [
            {
                id: '1',
                action: 'ISSUE_CERTIFICATE',
                description: 'Issued "Blockchain Fundamentals" certificate to Alice Johnson',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '2',
                action: 'REVOKE_CERTIFICATE',
                description: 'Revoked certificate #CERT-2024-045',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '3',
                action: 'UPDATE_PROFILE',
                description: 'Updated organization details',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
        ];
        const total = mockActivities.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const activities = mockActivities.slice(startIndex, endIndex);
        return {
            activities,
            meta: {
                total,
                page,
                limit,
                totalPages,
            },
        };
    }
    async updateIssuerProfile(userId, updateDto) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.role !== user_entity_1.UserRole.ISSUER && user.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only issuers and admins can update issuer profile');
        }
        if (updateDto.username && updateDto.username !== user.username) {
            if (await this.userRepository.existsByUsername(updateDto.username)) {
                throw new common_1.ConflictException('Username already taken');
            }
        }
        if (updateDto.stellarPublicKey &&
            updateDto.stellarPublicKey !== user.stellarPublicKey) {
            if (await this.userRepository.existsByStellarPublicKey(updateDto.stellarPublicKey)) {
                throw new common_1.ConflictException('Stellar public key already registered');
            }
        }
        const updateData = {};
        if (updateDto.firstName)
            updateData.firstName = updateDto.firstName;
        if (updateDto.lastName)
            updateData.lastName = updateDto.lastName;
        if (updateDto.username)
            updateData.username = updateDto.username;
        if (updateDto.phone)
            updateData.phone = updateDto.phone;
        if (updateDto.profilePicture)
            updateData.profilePicture = updateDto.profilePicture;
        if (updateDto.stellarPublicKey)
            updateData.stellarPublicKey = updateDto.stellarPublicKey;
        if (updateDto.organization !== undefined) {
            updateData.metadata = {
                ...user.metadata,
                organization: updateDto.organization,
            };
        }
        const updatedUser = await this.userRepository.update(userId, updateData);
        this.logger.log(`User ${userId} updated issuer profile`);
        return updatedUser;
    }
    async getUserStats() {
        const [total, active, userCount, issuerCount, adminCount] = await Promise.all([
            this.userRepository.countTotal(),
            this.userRepository.countActive(),
            this.userRepository.countByRole(user_entity_1.UserRole.USER),
            this.userRepository.countByRole(user_entity_1.UserRole.ISSUER),
            this.userRepository.countByRole(user_entity_1.UserRole.ADMIN),
        ]);
        const [activeStatus, inactiveStatus, suspendedStatus, pendingStatus] = await Promise.all([
            this.userRepository.countByStatus(user_entity_1.UserStatus.ACTIVE),
            this.userRepository.countByStatus(user_entity_1.UserStatus.INACTIVE),
            this.userRepository.countByStatus(user_entity_1.UserStatus.SUSPENDED),
            this.userRepository.countByStatus(user_entity_1.UserStatus.PENDING_VERIFICATION),
        ]);
        return {
            total,
            active,
            byRole: {
                [user_entity_1.UserRole.USER]: userCount,
                [user_entity_1.UserRole.ISSUER]: issuerCount,
                [user_entity_1.UserRole.ADMIN]: adminCount,
            },
            byStatus: {
                [user_entity_1.UserStatus.ACTIVE]: activeStatus,
                [user_entity_1.UserStatus.INACTIVE]: inactiveStatus,
                [user_entity_1.UserStatus.SUSPENDED]: suspendedStatus,
                [user_entity_1.UserStatus.PENDING_VERIFICATION]: pendingStatus,
            },
        };
    }
    async findOneByEmail(email) {
        const user = await this.userRepository.findByEmail(email);
        return user || undefined;
    }
    async findOneById(id) {
        const user = await this.userRepository.findById(id);
        return user || undefined;
    }
    async create(userData) {
        return this.userRepository.create(userData);
    }
    async update(id, userData) {
        const user = await this.userRepository.update(id, userData);
        return user || undefined;
    }
    async remove(id) {
        await this.userRepository.delete(id);
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h'),
        });
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: '7d',
        });
        const refreshTokenExpires = new Date();
        refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 7);
        await this.userRepository.update(user.id, {
            refreshToken,
            refreshTokenExpires,
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: 3600,
        };
    }
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    toPublicUser(user) {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture,
            role: user.role,
            stellarPublicKey: user.stellarPublicKey,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_repository_1.UserRepository,
        jwt_1.JwtService,
        config_1.ConfigService])
], UsersService);
//# sourceMappingURL=users.service.js.map