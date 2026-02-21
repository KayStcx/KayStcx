# Certificate Revocation List (CRL) Implementation

## Overview

This document describes the implementation of the Certificate Revocation List (CRL) system for StellarCert, a decentralized certificate management system built on the Stellar blockchain.

## Architecture

The CRL system consists of three main components:

1. **Smart Contract Layer** - Soroban-based CRL contract
2. **Backend Service Layer** - NestJS service for CRL operations
3. **Frontend Interface** - React components for CRL management

## Smart Contract Implementation

### File: `stellar-contracts/src/crl.rs`

The CRL smart contract provides the following functionality:

### Core Data Structures

```rust
// Revocation reasons matching RFC 5280 standards
pub enum RevocationReason {
    KeyCompromise,
    CACompromise,
    AffiliationChanged,
    Superseded,
    CessationOfOperation,
    CertificateHold,
    RemoveFromCRL,
    PrivilegeWithdrawn,
    AACompromise,
    Other(String),
}

// Revoked certificate entry
pub struct RevokedCertificate {
    pub certificate_id: String,
    pub issuer: Address,
    pub revocation_date: u64,
    pub reason: RevocationReason,
    pub invalidity_date: Option<u64>,
}

// Main CRL structure
pub struct CertificateRevocationList {
    pub issuer: Address,
    pub this_update: u64,
    pub next_update: u64,
    pub revoked_certificates: Vec<RevokedCertificate>,
    pub merkle_root: Option<Bytes>,
    pub crl_number: u64,
    pub authority_key_identifier: Option<Bytes>,
}
```

### Key Functions

#### `initialize(issuer: Address)`
- Initializes the CRL contract with the specified issuer
- Sets up initial metadata and timestamps

#### `revoke_certificate(certificate_id: String, reason: RevocationReason, invalidity_date: Option<u64>)`
- Adds a certificate to the revocation list
- Updates Merkle root for efficient verification
- Increments CRL number for versioning

#### `unrevoke_certificate(certificate_id: String)`
- Removes a certificate from the revocation list
- Updates Merkle root accordingly

#### `is_revoked(certificate_id: String) -> bool`
- Checks if a certificate is in the revocation list
- Returns boolean result for quick verification

#### `get_revoked_certificates(pagination: Pagination) -> PaginatedResult`
- Retrieves paginated list of revoked certificates
- Supports efficient browsing of large revocation lists

#### `verify_certificate(certificate_id: String) -> VerificationResult`
- Comprehensive verification with revocation details
- Returns full verification information

#### `get_merkle_root() -> Option<Bytes>`
- Returns current Merkle tree root for the CRL
- Enables efficient proof verification

### Merkle Tree Implementation

The CRL includes an optimized Merkle tree for efficient verification:

```rust
fn build_merkle_root(certificates: &Vec<RevokedCertificate>) -> Bytes {
    // Convert certificates to leaf nodes
    let mut leaves = Vec::new();
    for cert in certificates.iter() {
        let data = cert.certificate_id.to_bytes();
        let hash = env.crypto().sha256(&data);
        leaves.push_back(hash);
    }
    
    // Build balanced Merkle tree
    build_merkle_tree(&leaves)
}
```

Benefits:
- **Efficient Verification**: O(log n) proof verification
- **Space Optimization**: Compact root hash representation
- **Tamper Detection**: Any modification breaks the tree structure

## Backend Integration

### File: `backend/src/modules/crl/crl.service.ts`

The backend service provides a clean interface to the CRL smart contract:

### Key Methods

#### `revokeCertificate(issuerPublicKey: string, certificateId: string, reason: RevocationReason)`
- Creates and submits revocation transaction to Stellar
- Handles authentication and error management

#### `isCertificateRevoked(certificateId: string)`
- Queries the smart contract for revocation status
- Returns boolean result for quick checks

#### `getRevokedCertificates(pagination: Pagination)`
- Fetches paginated revoked certificate list
- Handles XDR parsing and data transformation

#### `verifyCertificate(certificateId: string)`
- Performs comprehensive certificate verification
- Returns detailed verification information

### Error Handling

The service includes comprehensive error handling:
- Transaction failures
- Network connectivity issues
- Invalid parameters
- Authentication failures

## Frontend Components

### Dashboard Integration

The CRL functionality is integrated into the main dashboard:

1. **Revoked Certificates Counter** - Shows current count of revoked certificates
2. **CRL Status Indicator** - Displays active status with visual cues
3. **Quick Actions** - Direct links to revocation management

### Revoke Certificate Page

Enhanced revocation interface with:
- Reason selection dropdown (RFC 5280 compliant)
- Invalidity date specification
- Transaction confirmation
- Real-time status updates

## API Endpoints

### Public Endpoints

- `GET /api/crl/verify/:certificateId` - Verify certificate status
- `GET /api/crl/revoked/:certificateId` - Check revocation status
- `GET /api/crl/revoked-certificates` - Get paginated revoked list
- `GET /api/crl/info` - Get CRL metadata
- `GET /api/crl/count` - Get revoked certificate count
- `GET /api/crl/merkle-root` - Get current Merkle root
- `GET /api/crl/needs-update` - Check if CRL needs refresh

### Protected Endpoints

- `POST /api/crl/initialize` - Initialize CRL (Admin only)
- `POST /api/crl/revoke` - Revoke certificate (Issuer/Admin)
- `DELETE /api/crl/revoke/:certificateId` - Unrevoke certificate (Issuer/Admin)
- `POST /api/crl/update-metadata` - Update CRL metadata (Admin only)

## Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin/Issuer/User)
- Stellar address verification

### Data Integrity
- On-chain storage ensures immutability
- Merkle tree verification prevents tampering
- Transaction-based operations with proper signing

### Audit Trail
- All revocation operations are recorded on-chain
- Timestamps for all actions
- Issuer identification for accountability

## Performance Optimizations

### Smart Contract Level
- Efficient data structures for storage
- Merkle tree for fast verification
- Pagination for large datasets

### Backend Level
- Caching of frequently accessed data
- Connection pooling for Stellar RPC
- Asynchronous processing where appropriate

### Frontend Level
- Loading states and skeleton screens
- Pagination for large result sets
- Optimistic UI updates

## Testing

### Smart Contract Tests
Located in `stellar-contracts/src/crl_test.rs`:
- Initialization tests
- Revocation/unrevocation functionality
- Pagination verification
- Merkle tree integrity tests
- Error condition handling

### Backend Tests
- Service method testing
- Integration with Stellar network
- Error handling scenarios
- Performance benchmarks

### Frontend Tests
- Component rendering tests
- User interaction flows
- Error state handling
- Responsive design verification

## Deployment Configuration

### Environment Variables

```env
# CRL Configuration
CRL_CONTRACT_ID=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHK3M
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

### Smart Contract Deployment

1. Build the contract:
```bash
cd stellar-contracts
cargo build --target wasm32-unknown-unknown --release
```

2. Deploy using Stellar CLI:
```bash
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/certificate_revocation.wasm
```

## Usage Examples

### Revoking a Certificate

```javascript
// Frontend usage
const response = await axios.post('/api/crl/revoke', {
  certificateId: 'CERT-123',
  reason: RevocationReason.KeyCompromise,
  invalidityDate: Math.floor(Date.now() / 1000)
});

console.log('Revoked with transaction:', response.data.transactionHash);
```

### Checking Revocation Status

```javascript
// Quick check
const status = await axios.get('/api/crl/revoked/CERT-123');
console.log('Is revoked:', status.data.isRevoked);

// Detailed verification
const verification = await axios.get('/api/crl/verify/CERT-123');
console.log('Verification result:', verification.data);
```

### Getting CRL Information

```javascript
// Get CRL metadata
const crlInfo = await axios.get('/api/crl/info');
console.log('CRL Number:', crlInfo.data.crl_number);
console.log('Last Update:', new Date(crlInfo.data.this_update * 1000));

// Get Merkle root for verification
const merkleRoot = await axios.get('/api/crl/merkle-root');
console.log('Merkle Root:', merkleRoot.data.merkleRoot);
```

## Future Enhancements

### Planned Features
- CRL distribution via IPFS
- Automated CRL updates
- Integration with certificate expiration
- Advanced analytics and reporting
- Multi-signature revocation support

### Performance Improvements
- CRL caching mechanisms
- Batch revocation operations
- Off-chain verification proxies
- Database indexing optimizations

## Troubleshooting

### Common Issues

1. **Transaction Failures**
   - Check Stellar network connectivity
   - Verify issuer account has sufficient funds
   - Ensure proper authentication

2. **Merkle Tree Verification Failures**
   - Verify CRL contract is properly deployed
   - Check certificate ID format
   - Ensure timestamps are synchronized

3. **Pagination Issues**
   - Verify page/limit parameters
   - Check for network timeouts
   - Ensure proper error handling

### Debugging Steps

1. Check Stellar network status
2. Verify contract deployment
3. Review transaction logs
4. Test with sample data
5. Validate authentication tokens

## Support

For issues or questions regarding the CRL implementation:
- Check the Stellar documentation
- Review the smart contract source code
- Examine backend service logs
- Test with the provided examples