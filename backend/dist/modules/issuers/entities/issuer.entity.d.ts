import { IssuerTier } from '../../../common/rate-limiting/rate-limit.service';
export declare class Issuer {
    id: string;
    name: string;
    publicKey: string;
    description?: string;
    isActive: boolean;
    website?: string;
    contactEmail?: string;
    tier: IssuerTier;
    apiKeyHash?: string;
    createdAt: Date;
    updatedAt: Date;
}
