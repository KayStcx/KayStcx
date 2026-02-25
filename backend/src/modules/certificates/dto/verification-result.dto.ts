export class VerificationResultDto {
  isValid: boolean;
  status: 'valid' | 'revoked' | 'expired' | 'not_found';
  message: string;
  verifiedAt: string;
  certificate?: {
    id: string;
    title: string;
    recipientName: string;
    recipientEmail: string;
    issuerId: string;
    issuedAt: string;
    expiresAt: string;
    status: string;
  };
  verificationId: string;
}