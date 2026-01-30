export declare class Certificate {
    id: string;
    certificateId: string;
    title: string;
    description?: string;
    content?: string;
    issuerName: string;
    recipientEmail: string;
    recipientPublicKey?: string;
    issuedAt?: Date;
    expiresAt?: Date;
    isRevoked: boolean;
    revocationReason?: string;
    revokedAt?: Date;
    revokedBy?: string;
    blockchainTxHash?: string;
    createdAt: Date;
    updatedAt: Date;
}
