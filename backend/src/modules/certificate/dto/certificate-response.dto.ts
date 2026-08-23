import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CertificateStatus } from '../constants/certificate-status.enum';

export class IssuerResponseDto {
  @ApiProperty({ description: 'Issuer UUID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Issuer display name', example: 'Stellar Academy' })
  name: string;

  @ApiProperty({ description: "Issuer's Stellar public key" })
  stellarPublicKey: string;

  @ApiPropertyOptional({ description: 'Issuer description' })
  description?: string;

  @ApiProperty({ description: 'Whether the issuer account is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Issuer website URL' })
  website?: string;

  @ApiPropertyOptional({ description: 'Issuer contact email' })
  contactEmail?: string;

  @ApiProperty({ description: 'Issuer subscription tier' })
  tier: string;

  @ApiProperty({ description: 'Number of certificates issued by this issuer' })
  certificateCount: number;

  @ApiProperty({ description: 'Issuer creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Issuer last update timestamp' })
  updatedAt: Date;
}

export class CertificateResponseDto {
  @ApiProperty({
    description: 'Certificate database UUID',
    format: 'uuid',
    example: 'a3d8a582-bd23-4a2d-9630-6d4a2f5fd6f0',
  })
  id: string;

  @ApiProperty({
    description: 'Human-readable certificate ID',
    example: 'CERT-2024-AB12CD34',
  })
  certificateId: string;

  @ApiProperty({
    description: 'Issuer UUID',
    format: 'uuid',
    example: '5f1e8a8d-8f58-4c8b-88d4-5d0a8c9dbf2a',
  })
  issuerId: string;

  @ApiPropertyOptional({
    description: 'Recipient user UUID (if recipient is a registered user)',
    format: 'uuid',
  })
  recipientId?: string;

  @ApiProperty({
    description: 'Recipient email address',
    example: 'recipient@example.com',
  })
  recipientEmail: string;

  @ApiProperty({ description: 'Recipient full name', example: 'Jane Doe' })
  recipientName: string;

  @ApiPropertyOptional({ description: "Recipient's Stellar public key" })
  recipientStellarAddress?: string;

  @ApiPropertyOptional({ description: 'Issuer display name' })
  issuerName?: string;

  @ApiPropertyOptional({ description: "Issuer's Stellar public key" })
  issuerStellarAddress?: string;

  @ApiProperty({
    description: 'Certificate title',
    example: 'Blockchain Fundamentals',
  })
  title: string;

  @ApiPropertyOptional({ description: 'Associated course name' })
  courseName?: string;

  @ApiPropertyOptional({
    description: 'Certificate template UUID',
    format: 'uuid',
  })
  templateId?: string;

  @ApiPropertyOptional({ description: 'Certificate description' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Structured certificate metadata',
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Certificate status',
    enum: CertificateStatus,
    example: CertificateStatus.ACTIVE,
  })
  status: CertificateStatus;

  @ApiPropertyOptional({ description: 'Reason the certificate was revoked' })
  revocationReason?: string;

  @ApiPropertyOptional({ description: 'Timestamp the certificate was revoked' })
  revokedAt?: Date;

  @ApiPropertyOptional({ description: 'User who revoked the certificate' })
  revokedBy?: string;

  @ApiPropertyOptional({ description: 'Legacy Stellar transaction ID' })
  stellarTransactionId?: string;

  @ApiPropertyOptional({ description: 'Stellar transaction hash' })
  stellarTransactionHash?: string;

  @ApiPropertyOptional({ description: 'Stellar transaction memo' })
  stellarMemo?: string;

  @ApiPropertyOptional({ description: 'Stellar transaction sequence number' })
  stellarSequenceNumber?: string;

  @ApiPropertyOptional({ description: 'Certificate verification code' })
  verificationCode?: string;

  @ApiPropertyOptional({
    description: 'Recorded verification history entries',
    type: 'array',
    items: { type: 'object' },
  })
  verificationHistory?: Array<Record<string, unknown>>;

  @ApiProperty({ description: 'Number of times the certificate was verified' })
  verificationCount: number;

  @ApiPropertyOptional({ description: 'Encoded QR code data' })
  qrCodeData?: string;

  @ApiPropertyOptional({ description: 'URL of the generated certificate PDF' })
  pdfUrl?: string;

  @ApiPropertyOptional({ description: 'URL of the generated QR code' })
  qrCodeUrl?: string;

  @ApiProperty({ description: 'Whether the certificate is a detected duplicate' })
  isDuplicate: boolean;

  @ApiPropertyOptional({
    description: 'ID of the original certificate this record duplicates',
    format: 'uuid',
  })
  duplicateOfId?: string;

  @ApiPropertyOptional({
    description: 'Reason supplied when overriding duplicate detection',
  })
  overrideReason?: string;

  @ApiPropertyOptional({ description: 'User who overrode duplicate detection' })
  overriddenBy?: string;

  @ApiPropertyOptional({
    description: 'Metadata schema UUID used for validation',
    format: 'uuid',
  })
  metadataSchemaId?: string;

  @ApiProperty({ description: 'Certificate issuance timestamp' })
  issuedAt: Date;

  @ApiPropertyOptional({ description: 'Certificate expiration timestamp' })
  expiresAt?: Date;

  @ApiProperty({ description: 'Certificate last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Issuer details',
    type: IssuerResponseDto,
  })
  issuer?: IssuerResponseDto;
}

export class CertificateListResponseDto {
  @ApiProperty({
    description: 'List of certificates',
    type: [CertificateResponseDto],
  })
  certificates: CertificateResponseDto[];

  @ApiProperty({
    description: 'Total number of certificates matching the filters',
    example: 1280,
  })
  total: number;
}
