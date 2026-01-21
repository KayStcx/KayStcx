"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StellarService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StellarService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const StellarSdk = __importStar(require("@stellar/stellar-sdk"));
let StellarService = StellarService_1 = class StellarService {
    configService;
    logger = new common_1.Logger(StellarService_1.name);
    server;
    networkPassphrase;
    constructor(configService) {
        this.configService = configService;
        this.networkPassphrase =
            configService.get('STELLAR_NETWORK') === 'testnet'
                ? StellarSdk.Networks.TESTNET
                : StellarSdk.Networks.PUBLIC;
        this.server = new StellarSdk.Horizon.Server(configService.get('STELLAR_HORIZON_URL') || 'https://horizon-testnet.stellar.org');
    }
    async verifyTransaction(txHash) {
        try {
            const transaction = await this.server.transactions().transaction(txHash).call();
            return !!transaction;
        }
        catch (error) {
            this.logger.error(`Transaction verification failed for hash: ${txHash}`, error);
            return false;
        }
    }
    async verifyAccount(accountId) {
        try {
            const account = await this.server.accounts().accountId(accountId).call();
            return !!account;
        }
        catch (error) {
            this.logger.error(`Account verification failed for: ${accountId}`, error);
            return false;
        }
    }
    static getPublicKeyFromSecret(secretKey) {
        const keypair = StellarSdk.Keypair.fromSecret(secretKey);
        return keypair.publicKey();
    }
    static isValidPublicKey(publicKey) {
        try {
            StellarSdk.StrKey.decodeEd25519PublicKey(publicKey);
            return true;
        }
        catch {
            return false;
        }
    }
    static isValidSecretKey(secretKey) {
        try {
            StellarSdk.Keypair.fromSecret(secretKey);
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.StellarService = StellarService;
exports.StellarService = StellarService = StellarService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StellarService);
//# sourceMappingURL=stellar.service.js.map