// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library CertificateLib {
    enum CertificateStatus {
        Active,
        GracePeriod,
        Expired,
        Revoked,
        Renewed
    }

    struct Certificate {
        uint256 id;
        address owner;
        string metadataURI;       // IPFS/Arweave URI for cert details
        uint256 issuedAt;
        uint256 expiresAt;
        uint256 gracePeriodEnd;   // expiresAt + gracePeriod
        CertificateStatus status;
        uint256 renewalCount;
        address issuer;
    }
}