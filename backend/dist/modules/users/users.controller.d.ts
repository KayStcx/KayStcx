import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto, RefreshTokenDto } from './dto/login-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/change-password.dto';
import { UserFilterDto } from './dto/pagination.dto';
import { AdminUpdateUserDto, UpdateUserRoleDto, UpdateUserStatusDto, DeactivateUserDto } from './dto/admin-user.dto';
import { VerifyEmailDto, ResendVerificationDto } from './dto/email-verification.dto';
import { UpdateIssuerProfileDto } from './dto/issuer-profile.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    register(createUserDto: CreateUserDto): Promise<{
        user: import("./interfaces").IUserPublic;
        tokens: import("./interfaces").IAuthTokens;
    }>;
    login(loginDto: LoginUserDto): Promise<{
        user: import("./interfaces").IUserPublic;
        tokens: import("./interfaces").IAuthTokens;
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<import("./interfaces").IAuthTokens>;
    verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{
        message: string;
    }>;
    resendVerification(resendDto: ResendVerificationDto): Promise<{
        message: string;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    getProfile(userId: string): Promise<User>;
    updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User>;
    deleteProfile(userId: string): Promise<{
        message: string;
    }>;
    findAll(filterDto: UserFilterDto): Promise<import("./interfaces").IPaginatedResult<User>>;
    getStats(): Promise<{
        total: number;
        active: number;
        byRole: Record<UserRole, number>;
        byStatus: Record<import("./entities/user.entity").UserStatus, number>;
    }>;
    findOne(id: string): Promise<User>;
    adminUpdate(adminId: string, userId: string, updateDto: AdminUpdateUserDto): Promise<User>;
    updateRole(adminId: string, userId: string, updateRoleDto: UpdateUserRoleDto): Promise<User>;
    updateStatus(adminId: string, userId: string, updateStatusDto: UpdateUserStatusDto): Promise<User>;
    deactivate(adminId: string, userId: string, deactivateDto: DeactivateUserDto): Promise<User>;
    reactivate(adminId: string, userId: string): Promise<User>;
    remove(adminId: string, userId: string): Promise<{
        message: string;
    }>;
    getIssuerStats(userId: string): Promise<any>;
    getIssuerActivity(userId: string, page?: number, limit?: number): Promise<any>;
    updateIssuerProfile(userId: string, updateDto: UpdateIssuerProfileDto): Promise<any>;
}
