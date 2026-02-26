// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CertificateStorage.sol";

contract CertificateManager is CertificateStorage {

    constructor(uint256 _gracePeriod)
        CertificateStorage(_gracePeriod)
    {}

    function issueCertificate(
        address holder,
        uint256 validityPeriod
    ) external override returns (uint256) {
        require(holder != address(0), "Invalid holder");
        require(validityPeriod > 0, "Invalid validity");

        _certificateCounter++;
        uint256 expiry = block.timestamp + validityPeriod;

        certificates[_certificateCounter] = Certificate({
            id: _certificateCounter,
            holder: holder,
            issuedAt: block.timestamp,
            expiryTimestamp: expiry,
            status: Status.Active
        });

        emit CertificateIssued(_certificateCounter, holder, expiry);

        return _certificateCounter;
    }

    function checkExpiry(uint256 certificateId) public override {
        Certificate storage cert = certificates[certificateId];

        require(cert.id != 0, "Certificate not found");

        if (
            cert.status == Status.Active &&
            block.timestamp > cert.expiryTimestamp + gracePeriod
        ) {
            cert.status = Status.Expired;
            emit CertificateExpired(certificateId);
        }
    }

    function renewCertificate(
        uint256 certificateId,
        uint256 additionalValidity
    ) external override {
        Certificate storage cert = certificates[certificateId];

        require(cert.id != 0, "Certificate not found");

        checkExpiry(certificateId);

        require(
            cert.status == Status.Active ||
            cert.status == Status.Expired,
            "Cannot renew"
        );

        require(additionalValidity > 0, "Invalid validity");

        cert.expiryTimestamp =
            block.timestamp + additionalValidity;

        cert.status = Status.Active;

        emit CertificateRenewed(
            certificateId,
            cert.expiryTimestamp
        );
    }

    function updateGracePeriod(uint256 _newGrace)
        external
    {
        gracePeriod = _newGrace;
        emit GracePeriodUpdated(_newGrace);
    }

    function getCertificate(uint256 certificateId)
        external
        view
        override
        returns (Certificate memory)
    {
        Certificate memory cert = certificates[certificateId];

        if (
            cert.status == Status.Active &&
            block.timestamp > cert.expiryTimestamp + gracePeriod
        ) {
            cert.status = Status.Expired;
        }

        return cert;
    }
}
