import { ConfigService } from '@nestjs/config';
export declare class StellarService {
    private configService;
    private readonly logger;
    private server;
    private networkPassphrase;
    constructor(configService: ConfigService);
    verifyTransaction(txHash: string): Promise<boolean>;
    verifyAccount(accountId: string): Promise<boolean>;
    static getPublicKeyFromSecret(secretKey: string): string;
    static isValidPublicKey(publicKey: string): boolean;
    static isValidSecretKey(secretKey: string): boolean;
}
