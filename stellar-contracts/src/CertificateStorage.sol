// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/ICertificate.sol";

contract CertificateStorage is ICertificate {
    uint256 internal _certificateCounter;
    uint256 public gracePeriod; // seconds

    mapping(uint256 => Certificate) internal certificates;

    event CertificateIssued(
        uint256 indexed id,
        address indexed holder,
        uint256 expiryTimestamp
    );

    event CertificateExpired(uint256 indexed id);
    event CertificateRenewed(uint256 indexed id, uint256 newExpiry);
    event GracePeriodUpdated(uint256 newGracePeriod);

    constructor(uint256 _gracePeriod) {
        gracePeriod = _gracePeriod;
    }
}
