export declare enum UserRole {
    USER = "user",
    ISSUER = "issuer",
    ADMIN = "admin"
}
export declare enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended",
    PENDING_VERIFICATION = "pending_verification"
}
export declare class User {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    phone: string;
    profilePicture: string;
    role: UserRole;
    status: UserStatus;
    stellarPublicKey: string;
    isEmailVerified: boolean;
    emailVerificationToken: string;
    emailVerificationExpires: Date;
    passwordResetToken: string;
    passwordResetExpires: Date;
    isActive: boolean;
    metadata: Record<string, any>;
    loginAttempts: number;
    lastLoginAt: Date;
    lockedUntil: Date;
    refreshToken: string;
    refreshTokenExpires: Date;
    createdAt: Date;
    updatedAt: Date;
    get fullName(): string;
    isLocked(): boolean;
    isEmailVerificationTokenValid(): boolean;
    isPasswordResetTokenValid(): boolean;
}
