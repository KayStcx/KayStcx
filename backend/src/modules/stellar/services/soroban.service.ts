import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Contract,
  TransactionBuilder,
  Networks,
  Keypair,
  Address,
  rpc,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';
import { LoggingService } from '../../../common/logging/logging.service';
import {
  SorobanConfigurationException,
  SorobanNetworkException,
  SorobanNotFoundException,
  SorobanTransactionException,
  SorobanException,
} from '../exceptions/soroban.exception';

export interface ContractDeploymentResult {
  contractId: string;
  transactionHash: string;
  successful: boolean;
}

export interface CertificateContractData {
  id: string;
  issuer: string;
  owner: string;
  status: string;
  metadataUri: string;
  issuedAt: number;
  expiresAt?: number;
}

export interface MultisigRequest {
  id: string;
  issuer: string;
  recipient: string;
  metadata: string;
  proposer: string;
  approvals: string[];
  rejections: string[];
  createdAt: number;
  expiresAt: number;
  status: string;
}

@Injectable()
export class SorobanService implements OnModuleInit {
  private server!: rpc.Server;
  private networkPassphrase!: string;
  private adminKeypair!: Keypair;
  private certificateContractId = '';
  private multisigContractId = '';
  private crlContractId = '';

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggingService,
  ) {}

  onModuleInit() {
    this.initializeSoroban();
  }

  private initializeSoroban() {
    const rpcUrl = this.configService.get<string>('SOROBAN_RPC_URL');
    const network = this.configService.get<string>('STELLAR_NETWORK');
    const adminSecret = this.configService.get<string>('SOROBAN_ADMIN_SECRET');
    this.certificateContractId =
      this.configService.get<string>('CERTIFICATE_CONTRACT_ID') || '';
    this.multisigContractId =
      this.configService.get<string>('MULTISIG_CONTRACT_ID') || '';
    this.crlContractId =
      this.configService.get<string>('CRL_CONTRACT_ID') || '';

    if (!rpcUrl || !network || !adminSecret) {
      this.logger.warn(
        'Soroban configuration missing. SorobanService may not function correctly.',
      );
      return;
    }

    this.server = new rpc.Server(rpcUrl, {
      allowHttp: rpcUrl.includes('localhost'),
    });
    this.networkPassphrase =
      network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;

    try {
      this.adminKeypair = Keypair.fromSecret(adminSecret);
    } catch (e) {
      this.logger.error('Invalid Soroban Admin Secret Key provided.');
    }

    this.logger.log(`SorobanService initialized on ${network}`);
  }

  /**
   * Throw a typed configuration error if the service has not been initialized
   * with a reachable RPC server and a valid admin keypair.
   */
  private assertConfigured(): void {
    if (!this.server) {
      throw new SorobanConfigurationException(
        'Soroban is not configured. Set SOROBAN_RPC_URL, STELLAR_NETWORK and SOROBAN_ADMIN_SECRET.',
      );
    }
    if (!this.adminKeypair) {
      throw new SorobanConfigurationException(
        'Soroban admin keypair is not configured.',
      );
    }
  }

  private requireContractId(contractId: string, name: string): string {
    if (!contractId) {
      throw new SorobanConfigurationException(
        `${name} contract ID not configured.`,
      );
    }
    return contractId;
  }

  /**
   * Convert an unknown thrown value into a typed Soroban exception and rethrow.
   * Callers can then distinguish between configuration problems, network
   * failures, and on-chain transaction failures.
   */
  private logAndThrow(operation: string, error: unknown): never {
    if (error instanceof SorobanException) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${operation} failed: ${message}`);
    if (/network|econn|etimedout|timeout|fetch|socket/i.test(message)) {
      throw new SorobanNetworkException(`${operation} failed: ${message}`);
    }
    throw new SorobanTransactionException(`${operation} failed: ${message}`);
  }

  /**
   * Deploy a new contract instance
   */
  async deployContract(wasmHash: string): Promise<ContractDeploymentResult> {
    this.assertConfigured();
    try {
      const sourceAccount = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const contract = new Contract(wasmHash);

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          (contract as any).deploy({
            wasmHash: Buffer.from(wasmHash, 'hex'),
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(this.adminKeypair);

      const result = await this.server.sendTransaction(transaction);

      if (result.status !== 'PENDING') {
        throw new SorobanTransactionException(
          `Transaction failed: ${result.status}`,
        );
      }

      // Poll until the ledger confirms the transaction
      const txResponse = await this.pollTransaction(result.hash);

      if (txResponse.status !== 'SUCCESS') {
        throw new SorobanTransactionException(
          `Transaction failed: ${txResponse.status}`,
        );
      }

      const contractId =
        txResponse.returnValue?._value?._value?.toString('hex');

      return {
        contractId: contractId || '',
        transactionHash: result.hash,
        successful: true,
      };
    } catch (error) {
      this.logAndThrow('Contract deployment', error);
    }
  }

  /**
   * Initialize the certificate contract
   */
  async initializeCertificateContract(adminAddress: string): Promise<boolean> {
    this.assertConfigured();
    try {
      this.requireContractId(this.certificateContractId, 'Certificate');

      const contract = new Contract(this.certificateContractId);
      const admin = Address.fromString(adminAddress);

      const sourceAccount = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call('initialize', nativeToScVal(admin)))
        .setTimeout(30)
        .build();

      transaction.sign(this.adminKeypair);

      const result = await this.server.sendTransaction(transaction);

      if (result.status !== 'PENDING') {
        throw new SorobanTransactionException(
          `Transaction failed: ${result.status}`,
        );
      }

      const txResponse = await this.pollTransaction(result.hash);

      if (txResponse.status !== 'SUCCESS') {
        throw new SorobanTransactionException(
          `Transaction failed: ${txResponse.status}`,
        );
      }

      return true;
    } catch (error) {
      this.logAndThrow('Certificate contract initialization', error);
    }
  }

  /**
   * Add an authorized issuer to the certificate contract
   */
  async addIssuer(issuerAddress: string): Promise<boolean> {
    this.assertConfigured();
    try {
      this.requireContractId(this.certificateContractId, 'Certificate');

      const contract = new Contract(this.certificateContractId);
      const issuer = Address.fromString(issuerAddress);

      const sourceAccount = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call('add_issuer', nativeToScVal(issuer)))
        .setTimeout(30)
        .build();

      transaction.sign(this.adminKeypair);

      const result = await this.server.sendTransaction(transaction);

      if (result.status !== 'PENDING') {
        throw new SorobanTransactionException(
          `Transaction failed: ${result.status}`,
        );
      }

      const txResponse = await this.pollTransaction(result.hash);

      if (txResponse.status !== 'SUCCESS') {
        throw new SorobanTransactionException(
          `Transaction failed: ${txResponse.status}`,
        );
      }

      return true;
    } catch (error) {
      this.logAndThrow('Add issuer', error);
    }
  }

  /**
   * Issue a certificate on-chain. Returns the Stellar transaction hash on
   * success; throws a typed Soroban exception on failure.
   */
  async issueCertificate(
    id: string,
    issuerAddress: string,
    ownerAddress: string,
    metadataUri: string,
    expiresAt?: number,
  ): Promise<string> {
    this.assertConfigured();
    try {
      this.requireContractId(this.certificateContractId, 'Certificate');

      const contract = new Contract(this.certificateContractId);
      const issuer = Address.fromString(issuerAddress);
      const owner = Address.fromString(ownerAddress);

      // Get issuer's keypair for signing (this would need to be passed or retrieved)
      const issuerKeypair = this.getIssuerKeypair(issuerAddress);
      const sourceAccount = await this.server.getAccount(
        issuerKeypair.publicKey(),
      );

      const args = [
        nativeToScVal(id),
        nativeToScVal(issuer),
        nativeToScVal(owner),
        nativeToScVal(metadataUri),
        expiresAt ? nativeToScVal(expiresAt) : nativeToScVal(null),
      ];

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call('issue_certificate', ...args))
        .setTimeout(30)
        .build();

      transaction.sign(issuerKeypair);

      const result = await this.server.sendTransaction(transaction);

      if (result.status !== 'PENDING') {
        throw new SorobanTransactionException(
          `Transaction failed: ${result.status}`,
        );
      }

      const txResponse = await this.pollTransaction(result.hash);

      if (txResponse.status !== 'SUCCESS') {
        throw new SorobanTransactionException(
          `Transaction failed: ${txResponse.status}`,
        );
      }

      return result.hash;
    } catch (error) {
      this.logAndThrow('Certificate issuance', error);
    }
  }

  /**
   * Revoke a certificate on-chain
   */
  async revokeCertificate(
    id: string,
    issuerAddress: string,
    reason: string,
  ): Promise<boolean> {
    this.assertConfigured();
    try {
      this.requireContractId(this.certificateContractId, 'Certificate');

      const contract = new Contract(this.certificateContractId);

      const issuerKeypair = this.getIssuerKeypair(issuerAddress);
      const sourceAccount = await this.server.getAccount(
        issuerKeypair.publicKey(),
      );

      const args = [nativeToScVal(id), nativeToScVal(reason)];

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call('revoke_certificate', ...args))
        .setTimeout(30)
        .build();

      transaction.sign(issuerKeypair);

      const result = await this.server.sendTransaction(transaction);

      if (result.status !== 'PENDING') {
        throw new SorobanTransactionException(
          `Transaction failed: ${result.status}`,
        );
      }

      const txResponse = await this.pollTransaction(result.hash);

      if (txResponse.status !== 'SUCCESS') {
        throw new SorobanTransactionException(
          `Transaction failed: ${txResponse.status}`,
        );
      }

      return true;
    } catch (error) {
      this.logAndThrow('Certificate revocation', error);
    }
  }

  /**
   * Get certificate data from the contract
   */
  async getCertificate(id: string): Promise<CertificateContractData> {
    this.assertConfigured();
    try {
      this.requireContractId(this.certificateContractId, 'Certificate');

      const contract = new Contract(this.certificateContractId);

      const sourceAccount = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call('get_certificate', nativeToScVal(id)))
        .setTimeout(30)
        .build();

      transaction.sign(this.adminKeypair);

      const result = await this.server.sendTransaction(transaction);

      if (result.status !== 'PENDING') {
        throw new SorobanTransactionException(
          `Transaction failed: ${result.status}`,
        );
      }

      const txResponse = await this.pollTransaction(result.hash);

      if (txResponse.status !== 'SUCCESS' || !txResponse.returnValue) {
        throw new SorobanNotFoundException(
          `Certificate ${id} not found on-chain`,
        );
      }

      const certificateData = scValToNative(txResponse.returnValue);

      return {
        id: certificateData.id,
        issuer: certificateData.issuer.toString(),
        owner: certificateData.owner.toString(),
        status: certificateData.status,
        metadataUri: certificateData.metadata_uri,
        issuedAt: certificateData.issued_at,
        expiresAt: certificateData.expires_at,
      };
    } catch (error) {
      this.logAndThrow('Get certificate', error);
    }
  }

  /**
   * Initialize multisig configuration for an issuer
   */
  async initMultisigConfig(
    issuerAddress: string,
    threshold: number,
    signers: string[],
    maxSigners: number,
  ): Promise<boolean> {
    this.assertConfigured();
    try {
      this.requireContractId(this.multisigContractId, 'Multisig');

      const contract = new Contract(this.multisigContractId);
      const issuer = Address.fromString(issuerAddress);
      const admin = Address.fromString(this.adminKeypair.publicKey());
      const signerAddresses = signers.map((s) => Address.fromString(s));

      const sourceAccount = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const args = [
        nativeToScVal(issuer),
        nativeToScVal(threshold),
        nativeToScVal(signerAddresses),
        nativeToScVal(maxSigners),
        nativeToScVal(admin),
      ];

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call('init_multisig_config', ...args))
        .setTimeout(30)
        .build();

      transaction.sign(this.adminKeypair);

      const result = await this.server.sendTransaction(transaction);

      if (result.status !== 'PENDING') {
        throw new SorobanTransactionException(
          `Transaction failed: ${result.status}`,
        );
      }

      const txResponse = await this.pollTransaction(result.hash);

      if (txResponse.status !== 'SUCCESS') {
        throw new SorobanTransactionException(
          `Transaction failed: ${txResponse.status}`,
        );
      }

      return true;
    } catch (error) {
      this.logAndThrow('Multisig config initialization', error);
    }
  }

  /**
   * Helper method to get issuer keypair (this would need proper key management)
   */
  private getIssuerKeypair(issuerAddress: string): Keypair {
    // This is a placeholder - in production, you'd have proper key management
    // For now, we'll assume the admin keypair is used for all operations
    return this.adminKeypair;
  }

  /**
   * Poll getTransaction until the transaction leaves the NOT_FOUND / PENDING
   * state, or until the retry limit is exhausted.
   */
  private async pollTransaction(
    hash: string,
    maxRetries = 10,
    delayMs = 1000,
  ): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const txResponse = await this.server.getTransaction(hash);
      // Normalize to a plain string so the discriminated union does not
      // narrow `txResponse` to `never` inside the branch below.
      const status: string = txResponse.status;

      if (status === 'SUCCESS' || status === 'FAILED') {
        return txResponse;
      }

      if (status !== 'NOT_FOUND' && status !== 'PENDING') {
        throw new SorobanTransactionException(
          `Unexpected transaction status on attempt ${attempt}: ${status}`,
        );
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new SorobanNetworkException(
      `Transaction ${hash} did not settle after ${maxRetries} polling attempts`,
    );
  }

  /**
   * Check if Soroban service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.server && this.adminKeypair && this.certificateContractId);
  }
}
