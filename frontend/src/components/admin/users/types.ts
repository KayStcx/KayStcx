/**
 * Admin-specific User types for the admin dashboard.
 * Note: The primary User type used throughout the application is defined in src/api/types.ts
 * This is a separate, admin-dashboard-specific representation for admin features.
 * Do not use these types in non-admin components - use the types from src/api/types.ts instead.
 */

export type UserRole = 'admin' | 'issuer' | 'user' | 'viewer';

export interface UserActivity {
  id: string;
  action: string;
  timestamp: string;
  details: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isIssuer: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastActive: string;
  activities: UserActivity[];
}
