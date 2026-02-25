import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
export declare class StellarService {
    private configService;
    private readonly logger;
    private server;
    private networkPassphrase;
    constructor(configService: ConfigService);
    verifyTransaction(txHash: string): Promise<boolean>;
    verifyAccount(accountId: string): Promise<boolean>;
    static getPublicKeyFromSecret(secretKey: string): string;
    getKeypairFromPublicKey(publicKey: string): StellarSdk.Keypair;
    static isValidPublicKey(publicKey: string): boolean;
    static isValidSecretKey(secretKey: string): boolean;
    checkNetworkHealth(): Promise<boolean>;
    getNetworkInfo(): {
        network: string;
        horizon: string;
    };
}
