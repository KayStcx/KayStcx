import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/change-password.dto';
import { LoginUserDto, RefreshTokenDto } from './dto/login-user.dto';
import { UserFilterDto } from './dto/pagination.dto';
import { AdminUpdateUserDto, UpdateUserRoleDto, UpdateUserStatusDto, DeactivateUserDto } from './dto/admin-user.dto';
import { VerifyEmailDto, ResendVerificationDto } from './dto/email-verification.dto';
import { IPaginatedResult } from './interfaces';
import { IAuthTokens, IUserPublic } from './interfaces/user.interface';
export declare class UsersService {
    private readonly userRepository;
    private readonly jwtService;
    private readonly configService;
    private readonly logger;
    private readonly SALT_ROUNDS;
    private readonly MAX_LOGIN_ATTEMPTS;
    private readonly LOCK_TIME_MINUTES;
    private readonly EMAIL_VERIFICATION_EXPIRY_HOURS;
    private readonly PASSWORD_RESET_EXPIRY_HOURS;
    constructor(userRepository: UserRepository, jwtService: JwtService, configService: ConfigService);
    register(createUserDto: CreateUserDto): Promise<{
        user: IUserPublic;
        tokens: IAuthTokens;
    }>;
    login(loginDto: LoginUserDto): Promise<{
        user: IUserPublic;
        tokens: IAuthTokens;
    }>;
    logout(userId: string): Promise<void>;
    refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<IAuthTokens>;
    verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{
        message: string;
    }>;
    resendVerificationEmail(resendDto: ResendVerificationDto): Promise<{
        message: string;
    }>;
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    getProfile(userId: string): Promise<User>;
    updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User>;
    deleteProfile(userId: string): Promise<{
        message: string;
    }>;
    findAllUsers(filterDto: UserFilterDto): Promise<IPaginatedResult<User>>;
    findUserById(id: string): Promise<User>;
    adminUpdateUser(adminId: string, userId: string, updateDto: AdminUpdateUserDto): Promise<User>;
    updateUserRole(adminId: string, userId: string, updateRoleDto: UpdateUserRoleDto): Promise<User>;
    updateUserStatus(adminId: string, userId: string, updateStatusDto: UpdateUserStatusDto): Promise<User>;
    deactivateUser(adminId: string, userId: string, deactivateDto: DeactivateUserDto): Promise<User>;
    reactivateUser(adminId: string, userId: string): Promise<User>;
    deleteUser(adminId: string, userId: string): Promise<{
        message: string;
    }>;
    getIssuerStats(userId: string): Promise<any>;
    getIssuerActivity(userId: string, page?: number, limit?: number): Promise<any>;
    updateIssuerProfile(userId: string, updateDto: any): Promise<any>;
    getUserStats(): Promise<{
        total: number;
        active: number;
        byRole: Record<UserRole, number>;
        byStatus: Record<UserStatus, number>;
    }>;
    findOneByEmail(email: string): Promise<User | undefined>;
    findOneById(id: string): Promise<User | undefined>;
    create(userData: Partial<User>): Promise<User>;
    update(id: string, userData: Partial<User>): Promise<User | undefined>;
    remove(id: string): Promise<void>;
    private generateTokens;
    private generateToken;
    private toPublicUser;
}
