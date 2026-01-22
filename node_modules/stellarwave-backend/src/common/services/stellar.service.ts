import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private server: any;
  private networkPassphrase: string;

  constructor(private configService: ConfigService) {
    this.networkPassphrase = 
      configService.get<string>('STELLAR_NETWORK') === 'testnet'
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;
    
    this.server = new StellarSdk.Horizon.Server(configService.get<string>('STELLAR_HORIZON_URL') || 'https://horizon-testnet.stellar.org');
  }

  /**
   * Verify if a transaction exists on the blockchain
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      const transaction = await this.server.transactions().transaction(txHash).call();
      return !!transaction;
    } catch (error) {
      this.logger.error(`Transaction verification failed for hash: ${txHash}`, error);
      return false;
    }
  }

  /**
   * Verify if an account exists on the blockchain
   */
  async verifyAccount(accountId: string): Promise<boolean> {
    try {
      const account = await this.server.accounts().accountId(accountId).call();
      return !!account;
    } catch (error) {
      this.logger.error(`Account verification failed for: ${accountId}`, error);
      return false;
    }
  }

  /**
   * Get Stellar public key from secret key
   */
  static getPublicKeyFromSecret(secretKey: string): string {
    const keypair = StellarSdk.Keypair.fromSecret(secretKey);
    return keypair.publicKey();
  }

  /**
   * Verify if a public key is valid
   */
  static isValidPublicKey(publicKey: string): boolean {
    try {
      StellarSdk.StrKey.decodeEd25519PublicKey(publicKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify if a secret key is valid
   */
  static isValidSecretKey(secretKey: string): boolean {
    try {
      StellarSdk.Keypair.fromSecret(secretKey);
      return true;
    } catch {
      return false;
    }
  }
}