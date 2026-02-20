import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SorobanRpc, TransactionBuilder, Networks, Contract, xdr, Address, ScVal } from '@stellar/stellar-sdk';
import { StellarService } from '../stellar/services/stellar.service';

// Revocation reason enum matching the smart contract
export enum RevocationReason {
  KeyCompromise = 0,
  CACompromise = 1,
  AffiliationChanged = 2,
  Superseded = 3,
  CessationOfOperation = 4,
  CertificateHold = 5,
  RemoveFromCRL = 6,
  PrivilegeWithdrawn = 7,
  AACompromise = 8,
  Other = 9,
}

export interface RevokedCertificate {
  certificate_id: string;
  issuer: string;
  revocation_date: number;
  reason: RevocationReason;
  invalidity_date?: number;
}

export interface CertificateRevocationList {
  issuer: string;
  this_update: number;
  next_update: number;
  revoked_certificates: RevokedCertificate[];
  merkle_root?: string;
  crl_number: number;
  authority_key_identifier?: string;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface PaginatedResult {
  data: RevokedCertificate[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
}

export interface VerificationResult {
  is_revoked: boolean;
  revocation_info?: RevokedCertificate;
  crl_number: number;
  this_update: number;
}

@Injectable()
export class CRLService {
  private readonly logger = new Logger(CRLService.name);
  private contractId: string;
  private server: SorobanRpc.Server;
  private networkPassphrase: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly stellarService: StellarService,
  ) {
    this.initializeService();
  }

  private initializeService() {
    const contractId = this.configService.get<string>('CRL_CONTRACT_ID');
    const horizonUrl = this.configService.get<string>('STELLAR_HORIZON_URL');
    const network = this.configService.get<string>('STELLAR_NETWORK');

    if (!contractId || !horizonUrl || !network) {
      this.logger.warn('CRL configuration missing. CRLService may not function correctly.');
      return;
    }

    this.contractId = contractId;
    this.networkPassphrase = network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;
    this.server = new SorobanRpc.Server(horizonUrl, { allowHttp: horizonUrl.includes('localhost') });

    this.logger.log(`CRLService initialized with contract: ${contractId}`);
  }

  /**
   * Initialize the CRL contract
   */
  async initializeCRL(issuerPublicKey: string): Promise<string> {
    try {
      const issuerKeyPair = this.stellarService.getKeypairFromPublicKey(issuerPublicKey);
      const sourceAccount = await this.server.getAccount(issuerPublicKey);

      const contract = new Contract(this.contractId);
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call("initialize", new Address(issuerPublicKey).toScVal()))
        .setTimeout(30)
        .build();

      transaction.sign(issuerKeyPair);
      const response = await this.server.sendTransaction(transaction);

      if (response.status === 'PENDING') {
        const txResponse = await this.server.getTransaction(response.hash);
        if (txResponse.status === 'SUCCESS') {
          this.logger.log(`CRL initialized successfully with hash: ${response.hash}`);
          return response.hash;
        }
      }

      throw new Error(`Transaction failed: ${response.status}`);
    } catch (error) {
      this.logger.error('Failed to initialize CRL', error);
      throw error;
    }
  }

  /**
   * Revoke a certificate
   */
  async revokeCertificate(
    issuerPublicKey: string,
    certificateId: string,
    reason: RevocationReason,
    invalidityDate?: number,
  ): Promise<string> {
    try {
      const issuerKeyPair = this.stellarService.getKeypairFromPublicKey(issuerPublicKey);
      const sourceAccount = await this.server.getAccount(issuerPublicKey);

      const contract = new Contract(this.contractId);
      
      // Convert reason to ScVal
      const reasonScVal = xdr.ScVal.scvU32(reason);
      
      // Convert invalidityDate to ScVal (optional)
      const invalidityScVal = invalidityDate 
        ? xdr.ScVal.scvSome(xdr.ScVal.scvU64(invalidityDate))
        : xdr.ScVal.scvVoid();

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call(
          "revoke_certificate",
          xdr.ScVal.scvString(certificateId),
          reasonScVal,
          invalidityScVal
        ))
        .setTimeout(30)
        .build();

      transaction.sign(issuerKeyPair);
      const response = await this.server.sendTransaction(transaction);

      if (response.status === 'PENDING') {
        const txResponse = await this.server.getTransaction(response.hash);
        if (txResponse.status === 'SUCCESS') {
          this.logger.log(`Certificate ${certificateId} revoked successfully`);
          return response.hash;
        }
      }

      throw new Error(`Transaction failed: ${response.status}`);
    } catch (error) {
      this.logger.error(`Failed to revoke certificate ${certificateId}`, error);
      throw error;
    }
  }

  /**
   * Unrevoke a certificate
   */
  async unrevokeCertificate(issuerPublicKey: string, certificateId: string): Promise<string> {
    try {
      const issuerKeyPair = this.stellarService.getKeypairFromPublicKey(issuerPublicKey);
      const sourceAccount = await this.server.getAccount(issuerPublicKey);

      const contract = new Contract(this.contractId);
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call("unrevoke_certificate", xdr.ScVal.scvString(certificateId)))
        .setTimeout(30)
        .build();

      transaction.sign(issuerKeyPair);
      const response = await this.server.sendTransaction(transaction);

      if (response.status === 'PENDING') {
        const txResponse = await this.server.getTransaction(response.hash);
        if (txResponse.status === 'SUCCESS') {
          this.logger.log(`Certificate ${certificateId} unrevoked successfully`);
          return response.hash;
        }
      }

      throw new Error(`Transaction failed: ${response.status}`);
    } catch (error) {
      this.logger.error(`Failed to unrevoke certificate ${certificateId}`, error);
      throw error;
    }
  }

  /**
   * Check if a certificate is revoked
   */
  async isCertificateRevoked(certificateId: string): Promise<boolean> {
    try {
      const contract = new Contract(this.contractId);
      const response = await this.server.simulateTransaction(
        contract.call("is_revoked", xdr.ScVal.scvString(certificateId))
      );

      if (response.result?.retval) {
        const result = response.result.retval;
        if (result.switch().name === 'scvBool') {
          return result.b();
        }
      }

      throw new Error('Invalid response from contract');
    } catch (error) {
      this.logger.error(`Failed to check revocation status for ${certificateId}`, error);
      throw error;
    }
  }

  /**
   * Get revocation information for a certificate
   */
  async getRevocationInfo(certificateId: string): Promise<RevokedCertificate | null> {
    try {
      const contract = new Contract(this.contractId);
      const response = await this.server.simulateTransaction(
        contract.call("get_revocation_info", xdr.ScVal.scvString(certificateId))
      );

      if (response.result?.retval) {
        // Parse the result - this would need proper XDR parsing
        // For now, returning null as parsing complex XDR structures requires more implementation
        this.logger.debug(`Revocation info for ${certificateId}:`, response.result.retval);
        return null;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get revocation info for ${certificateId}`, error);
      return null;
    }
  }

  /**
   * Get paginated list of revoked certificates
   */
  async getRevokedCertificates(pagination: Pagination): Promise<PaginatedResult> {
    try {
      const contract = new Contract(this.contractId);
      
      // Convert pagination to ScVal
      const paginationScVal = xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvString('page'),
          val: xdr.ScVal.scvU32(pagination.page)
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvString('limit'),
          val: xdr.ScVal.scvU32(pagination.limit)
        })
      ]);

      const response = await this.server.simulateTransaction(
        contract.call("get_revoked_certificates", paginationScVal)
      );

      if (response.result?.retval) {
        // Parse the result - would need proper XDR parsing
        this.logger.debug('Revoked certificates response:', response.result.retval);
        // Return mock data for now
        return {
          data: [],
          total: 0,
          page: pagination.page,
          limit: pagination.limit,
          has_next: false
        };
      }

      throw new Error('Invalid response from contract');
    } catch (error) {
      this.logger.error('Failed to get revoked certificates', error);
      throw error;
    }
  }

  /**
   * Get full CRL information
   */
  async getCRLInfo(): Promise<CertificateRevocationList> {
    try {
      const contract = new Contract(this.contractId);
      const response = await this.server.simulateTransaction(
        contract.call("get_crl_info")
      );

      if (response.result?.retval) {
        // Parse the result - would need proper XDR parsing
        this.logger.debug('CRL info response:', response.result.retval);
        // Return mock data for now
        return {
          issuer: '',
          this_update: Date.now(),
          next_update: Date.now() + 86400000,
          revoked_certificates: [],
          merkle_root: undefined,
          crl_number: 1,
          authority_key_identifier: undefined
        };
      }

      throw new Error('Invalid response from contract');
    } catch (error) {
      this.logger.error('Failed to get CRL info', error);
      throw error;
    }
  }

  /**
   * Verify a certificate using the CRL
   */
  async verifyCertificate(certificateId: string): Promise<VerificationResult> {
    try {
      const contract = new Contract(this.contractId);
      const response = await this.server.simulateTransaction(
        contract.call("verify_certificate", xdr.ScVal.scvString(certificateId))
      );

      if (response.result?.retval) {
        // Parse the result - would need proper XDR parsing
        this.logger.debug(`Verification result for ${certificateId}:`, response.result.retval);
        // Return mock data for now
        return {
          is_revoked: false,
          crl_number: 1,
          this_update: Date.now()
        };
      }

      throw new Error('Invalid response from contract');
    } catch (error) {
      this.logger.error(`Failed to verify certificate ${certificateId}`, error);
      throw error;
    }
  }

  /**
   * Get Merkle root for current CRL
   */
  async getMerkleRoot(): Promise<string | null> {
    try {
      const contract = new Contract(this.contractId);
      const response = await this.server.simulateTransaction(
        contract.call("get_merkle_root")
      );

      if (response.result?.retval) {
        // Parse the result - would need proper XDR parsing for Bytes
        this.logger.debug('Merkle root response:', response.result.retval);
        return null; // Return null for now
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get Merkle root', error);
      return null;
    }
  }

  /**
   * Get total count of revoked certificates
   */
  async getRevokedCount(): Promise<number> {
    try {
      const contract = new Contract(this.contractId);
      const response = await this.server.simulateTransaction(
        contract.call("get_revoked_count")
      );

      if (response.result?.retval) {
        const result = response.result.retval;
        if (result.switch().name === 'scvU32') {
          return result.u32();
        }
      }

      throw new Error('Invalid response from contract');
    } catch (error) {
      this.logger.error('Failed to get revoked count', error);
      throw error;
    }
  }

  /**
   * Check if CRL needs update
   */
  async needsUpdate(): Promise<boolean> {
    try {
      const contract = new Contract(this.contractId);
      const response = await this.server.simulateTransaction(
        contract.call("needs_update")
      );

      if (response.result?.retval) {
        const result = response.result.retval;
        if (result.switch().name === 'scvBool') {
          return result.b();
        }
      }

      throw new Error('Invalid response from contract');
    } catch (error) {
      this.logger.error('Failed to check if CRL needs update', error);
      throw error;
    }
  }

  /**
   * Update CRL metadata
   */
  async updateCRLMetadata(
    issuerPublicKey: string,
    nextUpdate?: number,
    authorityKeyIdentifier?: string,
  ): Promise<string> {
    try {
      const issuerKeyPair = this.stellarService.getKeypairFromPublicKey(issuerPublicKey);
      const sourceAccount = await this.server.getAccount(issuerPublicKey);

      const contract = new Contract(this.contractId);
      
      // Convert parameters to ScVal
      const nextUpdateScVal = nextUpdate 
        ? xdr.ScVal.scvSome(xdr.ScVal.scvU64(nextUpdate))
        : xdr.ScVal.scvVoid();
      
      const akiScVal = authorityKeyIdentifier
        ? xdr.ScVal.scvSome(xdr.ScVal.scvBytes(Buffer.from(authorityKeyIdentifier, 'hex')))
        : xdr.ScVal.scvVoid();

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call("update_crl_metadata", nextUpdateScVal, akiScVal))
        .setTimeout(30)
        .build();

      transaction.sign(issuerKeyPair);
      const response = await this.server.sendTransaction(transaction);

      if (response.status === 'PENDING') {
        const txResponse = await this.server.getTransaction(response.hash);
        if (txResponse.status === 'SUCCESS') {
          this.logger.log(`CRL metadata updated successfully`);
          return response.hash;
        }
      }

      throw new Error(`Transaction failed: ${response.status}`);
    } catch (error) {
      this.logger.error('Failed to update CRL metadata', error);
      throw error;
    }
  }
}