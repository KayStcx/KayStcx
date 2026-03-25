import { Injectable } from '@nestjs/common';
import { Certificate } from '../entities/certificate.entity';
import { VerifiedCertificateData } from '../interfaces/verification-result.interface';

export interface CertificateResponseDto {
  id: string;
  certificateId: string;
  issuerId: string;
  issuerName?: string;
  issuerStellarAddress?: string;
  recipientName: string;
  recipientEmail: string;
  recipientStellarAddress?: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  status: string;
  revocationReason?: string;
  revokedAt?: Date;
  stellarTransactionHash?: string;
  stellarMemo?: string;
  verificationCode?: string;
  verificationCount: number;
  qrCodeData?: string;
  pdfUrl?: string;
  issuedAt: Date;
  expiresAt?: Date;
  updatedAt: Date;
}

export interface CertificateSummaryDto {
  id: string;
  certificateId: string;
  recipientName: string;
  recipientEmail: string;
  title: string;
  status: string;
  issuedAt: Date;
  expiresAt?: Date;
  hasStellarRecord: boolean;
}

@Injectable()
export class CertificateMapper {
  toResponse(certificate: Certificate): CertificateResponseDto {
    return {
      id: certificate.id,
      certificateId: certificate.certificateId,
      issuerId: certificate.issuerId,
      issuerName: certificate.issuerName ?? certificate.issuer?.name,
      issuerStellarAddress:
        certificate.issuerStellarAddress ??
        certificate.issuer?.stellarPublicKey,
      recipientName: certificate.recipientName,
      recipientEmail: certificate.recipientEmail,
      recipientStellarAddress: certificate.recipientStellarAddress,
      title: certificate.title,
      description: certificate.description,
      metadata: certificate.metadata as Record<string, unknown> | undefined,
      status: certificate.status,
      revocationReason: certificate.revocationReason,
      revokedAt: certificate.revokedAt,
      stellarTransactionHash: certificate.stellarTransactionHash,
      stellarMemo: certificate.stellarMemo,
      verificationCode: certificate.verificationCode,
      verificationCount: certificate.verificationCount,
      qrCodeData: certificate.qrCodeData,
      pdfUrl: certificate.pdfUrl,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      updatedAt: certificate.updatedAt,
    };
  }

  toSummary(certificate: Certificate): CertificateSummaryDto {
    return {
      id: certificate.id,
      certificateId: certificate.certificateId,
      recipientName: certificate.recipientName,
      recipientEmail: certificate.recipientEmail,
      title: certificate.title,
      status: certificate.status,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      hasStellarRecord: !!certificate.stellarTransactionHash,
    };
  }

  toVerificationData(certificate: Certificate): VerifiedCertificateData {
    return {
      id: certificate.id,
      certificateId: certificate.certificateId,
      recipientName: certificate.recipientName,
      recipientEmail: certificate.recipientEmail,
      title: certificate.title,
      issuerName:
        certificate.issuerName ?? certificate.issuer?.name ?? 'Unknown',
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt ?? null,
      status: certificate.status,
      verificationCount: certificate.verificationCount,
    };
  }

  toResponseList(
    certificates: Certificate[],
    total: number,
    page: number,
    limit: number,
  ) {
    return {
      data: certificates.map((c) => this.toSummary(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
