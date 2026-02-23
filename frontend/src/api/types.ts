/**
 * User roles in the system
 */
export enum UserRole {
  ADMIN = 'admin',
  ISSUER = 'issuer',
  RECIPIENT = 'recipient',
  VERIFIER = 'verifier',
}

/**
 * Basic User profile information
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  stellarPublicKey?: string;
  organization?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Authentication Response from login/register
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Certificate data model
 */
export interface Certificate {
  id: string;
  serialNumber: string;
  recipientName: string;
  recipientEmail: string;
  title: string;
  courseName: string;
  issuerName: string;
  issueDate: string;
  expiryDate?: string;
  status: 'active' | 'revoked' | 'expired' | 'frozen';
  pdfUrl?: string; // Link to certificate file
  txHash?: string; // Stellar transaction hash
  cid?: string; // IPFS CID for certificate file/metadata
  metadata?: Record<string, any>;
  frozenAt?: string;
  freezeReason?: string;
  unfreezeAt?: string;
}

/**
 * Request payload for creating a certificate
 */
export interface CreateCertificateData {
  recipientName: string;
  recipientEmail: string;
  courseName: string;
  issuerId: string;
  expiryDate?: string;
  templateId?: string;
  metadata?: Record<string, any>;
}

/**
 * Verification result details
 */
export interface VerificationResult {
  isValid: boolean;
  certificate?: Certificate;
  verificationDate: string;
  stellarProof?: {
    txHash: string;
    ledger: number;
    timestamp: string;
  };
  message?: string;
}

/**
 * Certificate Template model
 */
export interface CertificateTemplate {
  id: string;
  name: string;
  description?: string;
  layoutUrl: string;
  fields: string[];
  issuerId: string;
}

export interface IssuanceTrendPoint {
  date: string;
  count: number;
}

export interface StatusDistribution {
  active: number;
  revoked: number;
  expired: number;
}

export type ActivityType = 'issue' | 'verify' | 'revoke';

export interface ActivityItem {
  type: ActivityType;
  date: string;
  description: string;
}

/**
 * Dashboard / Analytics Summary
 */
export interface DashboardStats {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
   expiredCertificates?: number;
  totalVerifications: number;
  verifications24h: number;
  totalUsers: number;
  issuanceTrend?: IssuanceTrendPoint[];
  statusDistribution?: StatusDistribution;
  recentActivity: ActivityItem[];
}

/**
 * Standard API error response
 */
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: any;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
