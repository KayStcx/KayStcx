/**
 * Certificate Revocation List (CRL) integration module.
 * Addresses issue #421: CRL contract is separate but should be integrated.
 *
 * Provides a unified interface so that certificate validity checks always
 * consult the CRL, making revocations immediately visible during verification.
 */

export interface RevocationEntry {
  certId: string;
  revokedAt: number; // Unix timestamp
  reason: string;
}

export class CertificateRevocationList {
  private revoked = new Map<string, RevocationEntry>();

  /**
   * Revoke a certificate. In production this would write to the Soroban contract.
   */
  revoke(certId: string, reason: string): void {
    if (this.revoked.has(certId)) {
      throw new Error(`Certificate ${certId} is already revoked.`);
    }
    this.revoked.set(certId, {
      certId,
      revokedAt: Math.floor(Date.now() / 1000),
      reason,
    });
  }

  /**
   * Check whether a certificate has been revoked.
   */
  isRevoked(certId: string): boolean {
    return this.revoked.has(certId);
  }

  /**
   * Retrieve the revocation entry for a certificate, if any.
   */
  getEntry(certId: string): RevocationEntry | undefined {
    return this.revoked.get(certId);
  }

  /**
   * Returns all revoked certificate IDs.
   */
  listRevoked(): string[] {
    return Array.from(this.revoked.keys());
  }
}

/**
 * Integrated certificate validator that checks both expiry and CRL status.
 * Replaces the pattern of calling the certificate contract and CRL contract separately.
 */
export function isCertificateValid(
  certId: string,
  expiresAt: number,
  crl: CertificateRevocationList,
): boolean {
  if (crl.isRevoked(certId)) return false;
  const now = Math.floor(Date.now() / 1000);
  return now < expiresAt;
}
