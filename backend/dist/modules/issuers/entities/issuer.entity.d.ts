import { IssuerTier } from '../../../common/rate-limiting/rate-limit.types';
export declare class Issuer {
    id: string;
    name: string;
    stellarPublicKey: string;
    description?: string;
    isActive: boolean;
    website?: string;
    contactEmail?: string;
    tier: IssuerTier;
    apiKeyHash?: string;
    certificateCount: number;
    createdAt: Date;
    updatedAt: Date;
}
