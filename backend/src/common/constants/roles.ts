/**
 * Application role constants
 */
export enum UserRole {
  ADMIN = 'admin',
  ISSUER = 'issuer',
  USER = 'user',
  AUDITOR = 'auditor',
}

export const ROLE_HIERARCHY = {
  [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.ISSUER, UserRole.USER, UserRole.AUDITOR],
  [UserRole.ISSUER]: [UserRole.ISSUER, UserRole.USER],
  [UserRole.AUDITOR]: [UserRole.AUDITOR, UserRole.USER],
  [UserRole.USER]: [UserRole.USER],
};

export const PUBLIC_ROUTES = [
  'auth/login',
  'auth/register',
  'auth/refresh',
  'health',
  'health/status',
];
