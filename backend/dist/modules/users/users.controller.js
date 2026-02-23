"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const users_service_1 = require("./users.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("./guards/roles.guard");
const roles_decorator_1 = require("./decorators/roles.decorator");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const user_entity_1 = require("./entities/user.entity");
const create_user_dto_1 = require("./dto/create-user.dto");
const login_user_dto_1 = require("./dto/login-user.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const change_password_dto_1 = require("./dto/change-password.dto");
const pagination_dto_1 = require("./dto/pagination.dto");
const admin_user_dto_1 = require("./dto/admin-user.dto");
const email_verification_dto_1 = require("./dto/email-verification.dto");
const user_response_dto_1 = require("./dto/user-response.dto");
const issuer_profile_dto_1 = require("./dto/issuer-profile.dto");
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async register(createUserDto) {
        return this.usersService.register(createUserDto);
    }
    async login(loginDto) {
        return this.usersService.login(loginDto);
    }
    async logout(userId) {
        await this.usersService.logout(userId);
        return { message: 'Logged out successfully' };
    }
    async refreshToken(refreshTokenDto) {
        return this.usersService.refreshTokens(refreshTokenDto);
    }
    async verifyEmail(verifyEmailDto) {
        return this.usersService.verifyEmail(verifyEmailDto);
    }
    async resendVerification(resendDto) {
        return this.usersService.resendVerificationEmail(resendDto);
    }
    async forgotPassword(forgotPasswordDto) {
        return this.usersService.forgotPassword(forgotPasswordDto);
    }
    async resetPassword(resetPasswordDto) {
        return this.usersService.resetPassword(resetPasswordDto);
    }
    async changePassword(userId, changePasswordDto) {
        return this.usersService.changePassword(userId, changePasswordDto);
    }
    async getProfile(userId) {
        return this.usersService.getProfile(userId);
    }
    async updateProfile(userId, updateProfileDto) {
        return this.usersService.updateProfile(userId, updateProfileDto);
    }
    async deleteProfile(userId) {
        return this.usersService.deleteProfile(userId);
    }
    async findAll(filterDto) {
        return this.usersService.findAllUsers(filterDto);
    }
    async getStats() {
        return this.usersService.getUserStats();
    }
    async findOne(id) {
        return this.usersService.findUserById(id);
    }
    async adminUpdate(adminId, userId, updateDto) {
        return this.usersService.adminUpdateUser(adminId, userId, updateDto);
    }
    async updateRole(adminId, userId, updateRoleDto) {
        return this.usersService.updateUserRole(adminId, userId, updateRoleDto);
    }
    async updateStatus(adminId, userId, updateStatusDto) {
        return this.usersService.updateUserStatus(adminId, userId, updateStatusDto);
    }
    async deactivate(adminId, userId, deactivateDto) {
        return this.usersService.deactivateUser(adminId, userId, deactivateDto);
    }
    async reactivate(adminId, userId) {
        return this.usersService.reactivateUser(adminId, userId);
    }
    async remove(adminId, userId) {
        return this.usersService.deleteUser(adminId, userId);
    }
    async getIssuerStats(userId) {
        return this.usersService.getIssuerStats(userId);
    }
    async getIssuerActivity(userId, page, limit) {
        return this.usersService.getIssuerActivity(userId, page, limit);
    }
    async updateIssuerProfile(userId, updateDto) {
        return this.usersService.updateIssuerProfile(userId, updateDto);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new user' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'User registered successfully',
        type: user_response_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email already registered' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Login user' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Login successful',
        type: user_response_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Account locked or deactivated' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_user_dto_1.LoginUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Logout user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Logout successful' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('refresh-token'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Tokens refreshed successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid or expired refresh token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_user_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify email address' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Email verified successfully',
        type: user_response_dto_1.MessageResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid or expired token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [email_verification_dto_1.VerifyEmailDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('resend-verification'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resend email verification' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Verification email sent',
        type: user_response_dto_1.MessageResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [email_verification_dto_1.ResendVerificationDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resendVerification", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Request password reset' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Password reset email sent',
        type: user_response_dto_1.MessageResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [change_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password with token' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Password reset successfully',
        type: user_response_dto_1.MessageResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid or expired token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [change_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Put)('change-password'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Change password (authenticated)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Password changed successfully',
        type: user_response_dto_1.MessageResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Passwords do not match' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Current password incorrect' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user profile' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User profile',
        type: user_response_dto_1.UserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Put)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update current user profile' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Profile updated successfully',
        type: user_response_dto_1.UserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Username or Stellar key already taken',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Delete)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete current user account (soft delete)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Account deactivated successfully',
        type: user_response_dto_1.MessageResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteProfile", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all users (Admin only)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Paginated list of users',
        type: user_response_dto_1.PaginatedUsersResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin only' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_dto_1.UserFilterDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user statistics (Admin only)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User statistics',
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin only' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user by ID (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID (UUID)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User details',
        type: user_response_dto_1.UserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin only' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update user (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID (UUID)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User updated successfully',
        type: user_response_dto_1.UserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin only' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, admin_user_dto_1.AdminUpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "adminUpdate", null);
__decorate([
    (0, common_1.Patch)(':id/role'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update user role (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID (UUID)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User role updated successfully',
        type: user_response_dto_1.UserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Cannot modify own role',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, admin_user_dto_1.UpdateUserRoleDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update user status (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID (UUID)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User status updated successfully',
        type: user_response_dto_1.UserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin only' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, admin_user_dto_1.UpdateUserStatusDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate user (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID (UUID)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User deactivated successfully',
        type: user_response_dto_1.UserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Cannot deactivate self',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, admin_user_dto_1.DeactivateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Patch)(':id/reactivate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Reactivate user (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID (UUID)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User reactivated successfully',
        type: user_response_dto_1.UserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin only' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "reactivate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Permanently delete user (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID (UUID)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User deleted successfully',
        type: user_response_dto_1.MessageResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Cannot delete self' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('profile/stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ISSUER, user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get issuer profile statistics' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Issuer statistics',
        type: issuer_profile_dto_1.IssuerProfileStatsDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Issuer/Admin only' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getIssuerStats", null);
__decorate([
    (0, common_1.Get)('profile/activity'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ISSUER, user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get issuer activity log' }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        description: 'Page number',
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        description: 'Items per page',
        example: 10,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Activity log',
        type: issuer_profile_dto_1.IssuerActivityResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Issuer/Admin only' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getIssuerActivity", null);
__decorate([
    (0, common_1.Put)('profile/issuer'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ISSUER, user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update issuer profile information' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Profile updated successfully',
        type: user_response_dto_1.UserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Issuer/Admin only' }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Username or Stellar key already taken',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, issuer_profile_dto_1.UpdateIssuerProfileDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateIssuerProfile", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map