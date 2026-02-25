pragma solidity ^0.8.20;

interface ICertificate {
    enum Status {
        Active,
        Expired,
        Revoked
    }

    struct Certificate {
        uint256 id;
        address holder;
        uint256 issuedAt;
        uint256 expiryTimestamp;
        Status status;
    }

    function issueCertificate(
        address holder,
        uint256 validityPeriod
    ) external returns (uint256);

    function checkExpiry(uint256 certificateId) external;

    function renewCertificate(
        uint256 certificateId,
        uint256 additionalValidity
    ) external;

    function getCertificate(uint256 certificateId)
        external
        view
        returns (Certificate memory);
}
