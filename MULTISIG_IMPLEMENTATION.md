# Multi-signature Certificate Issuance System

## Overview

This document describes the implementation of the multi-signature (multi-sig) certificate issuance system for StellarCert, a decentralized certificate management system built on the Stellar blockchain.

## Architecture

The multi-sig system consists of three main components:

1. **Smart Contract Layer** - Soroban-based multi-sig contract
2. **Backend Service Layer** - NestJS service for multi-sig operations
3. **Frontend Interface** - React components for multi-sig management

## Smart Contract Implementation

### File: `stellar-contracts/src/multisig.rs`

The multi-sig smart contract provides the following functionality:

### Core Data Structures

```rust
// Multi-sig configuration for an issuer
pub struct MultisigConfig {
    pub threshold: u32,        // Number of signatures required
    pub signers: Vec<Address>, // List of authorized signers
    pub max_signers: u32,     // Maximum number of allowed signers
}

// Pending certificate issuance request
pub struct PendingRequest {
    pub id: String,
    pub issuer: Address,
    pub recipient: Address,
    pub metadata: String,
    pub proposer: Address,     // The address that initiated the request
    pub approvals: Vec<Address>, // Addresses that have approved
    pub rejections: Vec<Address>, // Addresses that have rejected
    pub created_at: u64,       // Timestamp when request was created
    pub expires_at: u64,       // Timestamp when request expires
    pub status: RequestStatus,
}

// Status of a pending request
pub enum RequestStatus {
    Pending,
    Approved,
    Rejected,
    Expired,
    Issued,
}

// Action taken by a signer
pub enum SignatureAction {
    Approved,
    Rejected,
}
```

### Key Functions

#### `init_multisig_config(issuer: Address, threshold: u32, signers: Vec<Address>, max_signers: u32, admin: Address)`
- Initializes the multi-sig configuration for an issuer
- Sets up the required number of signatures and authorized signers

#### `update_multisig_config(issuer: Address, new_threshold: Option<u32>, new_signers: Option<Vec<Address>>, new_max_signers: Option<u32>)`
- Updates the multi-sig configuration for an issuer
- Allows modification of signers and thresholds

#### `propose_certificate(request_id: String, issuer: Address, recipient: Address, metadata: String, expiration_days: u32) -> PendingRequest`
- Creates a new certificate issuance request
- Requires a unique request ID and expiration period

#### `approve_request(request_id: String, approver: Address) -> SignatureResult`
- Adds an approval to a pending certificate request
- Updates the request status when threshold is reached

#### `reject_request(request_id: String, rejector: Address, reason: Option<String>) -> SignatureResult`
- Adds a rejection to a pending certificate request
- May change status to Rejected if insufficient approvals remain possible

#### `issue_approved_certificate(request_id: String) -> bool`
- Finalizes the certificate issuance after sufficient approvals
- Creates the actual certificate on the blockchain

#### `cancel_request(request_id: String, requester: Address) -> bool`
- Cancels a pending request (only proposer can cancel)

#### `is_expired(request_id: String) -> bool`
- Checks if a request has exceeded its expiration time

### Multi-sig Logic

The system implements the following multi-sig workflow:

1. **Configuration Phase**:
   - Admin sets up issuer with threshold and authorized signers
   - Threshold determines minimum signatures required

2. **Proposal Phase**:
   - Certificate request is proposed with metadata
   - Request has expiration time to prevent indefinite pending states

3. **Approval Phase**:
   - Authorized signers can approve or reject requests
   - Once threshold approvals are met, request becomes approved

4. **Issuance Phase**:
   - Approved requests can be issued as certificates
   - Rejected requests cannot be issued

### Security Features

- **Authorization**: Only authorized signers can approve/reject requests
- **Threshold Enforcement**: Minimum signatures required for approval
- **Expiration**: Requests automatically expire to prevent indefinite pending states
- **Non-repudiation**: All actions are recorded on-chain with timestamps
- **Immutable History**: Approval/rejection records stored permanently

## Backend Integration

### File: `backend/src/modules/multisig/multisig.service.ts`

The backend service provides a clean interface to the multi-sig smart contract:

### Key Methods

#### `initMultisigConfig(adminPublicKey: string, issuer: string, threshold: number, signers: string[], maxSigners: number)`
- Creates and submits initialization transaction to Stellar
- Handles authentication and error management

#### `proposeCertificate(requesterPublicKey: string, requestId: string, issuer: string, recipient: string, metadata: string, expirationDays: number)`
- Submits a new certificate proposal to the blockchain
- Returns the pending request details

#### `approveRequest(approverPublicKey: string, requestId: string)`
- Submits an approval for a pending request
- Updates request status based on threshold

#### `rejectRequest(rejectorPublicKey: string, requestId: string, reason?: string)`
- Submits a rejection for a pending request
- Updates request status accordingly

#### `issueApprovedCertificate(requesterPublicKey: string, requestId: string)`
- Finalizes the certificate issuance for approved requests
- Creates the certificate on the blockchain

### Error Handling

The service includes comprehensive error handling:
- Transaction failures
- Network connectivity issues
- Invalid parameters
- Authentication failures
- Authorization issues

## Frontend Components

### Multi-sig Dashboard Integration

The multi-sig functionality is integrated into the main dashboard:

1. **Configuration Panel** - Set up multi-sig parameters
2. **Request Management** - View and manage pending requests
3. **Action Buttons** - Approve/reject/cancel requests
4. **Status Indicators** - Visual cues for request status

### Certificate Proposal Interface

Enhanced certificate creation with:
- Multi-sig approval requirements
- Request tracking
- Status updates
- Expiration warnings

## API Endpoints

### Protected Endpoints (require authentication)

- `POST /api/multisig/config/init` - Initialize multi-sig config (Admin/Issuer)
- `PUT /api/multisig/config/update/:issuer` - Update multi-sig config (Admin/Issuer)
- `POST /api/multisig/propose` - Propose certificate (Admin/Issuer)
- `POST /api/multisig/approve/:requestId` - Approve request (Admin/Issuer)
- `POST /api/multisig/reject/:requestId` - Reject request (Admin/Issuer)
- `POST /api/multisig/issue/:requestId` - Issue approved certificate (Admin/Issuer)
- `DELETE /api/multisig/cancel/:requestId` - Cancel request (Admin/Issuer)

### Public Endpoints

- `GET /api/multisig/config/:issuer` - Get multi-sig config
- `GET /api/multisig/request/:requestId` - Get pending request
- `GET /api/multisig/requests/issuer/:issuer` - Get requests for issuer
- `GET /api/multisig/requests/signer/:signer` - Get requests for signer
- `GET /api/multisig/expired/:requestId` - Check if request is expired
- `GET /api/multisig/status/:requestId` - Get request status

## Configuration Options

### Threshold Settings

- Minimum: 1 signature required
- Maximum: Up to number of authorized signers
- Flexible: Can be adjusted per issuer

### Signer Management

- Dynamic addition/removal of authorized signers
- Maximum signer limits for governance
- Individual authorization per issuer

### Expiration Policies

- Configurable expiration periods (days)
- Automatic status updates for expired requests
- Cleanup mechanisms for expired requests

## Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin/Issuer/User)
- Stellar address verification

### Data Integrity
- On-chain storage ensures immutability
- Transaction-based operations with proper signing
- Audit trails for all actions

### Access Control
- Only authorized signers can approve/reject
- Only proposers can cancel requests
- Admin controls for configuration

## Performance Optimizations

### Smart Contract Level
- Efficient data structures for storage
- Minimal computation for approval checks
- Proper indexing for request tracking

### Backend Level
- Connection pooling for Stellar RPC
- Asynchronous processing where appropriate
- Caching of frequently accessed configurations

### Frontend Level
- Loading states and skeleton screens
- Optimistic UI updates
- Efficient request filtering

## Testing

### Smart Contract Tests
Located in `stellar-contracts/src/multisig_test.rs`:
- Configuration initialization tests
- Approval/rejection functionality
- Threshold enforcement verification
- Expiration handling
- Error condition testing
- Authorization checks

### Backend Tests
- Service method testing
- Integration with Stellar network
- Error handling scenarios
- Authentication verification

## Usage Examples

### Initializing Multi-sig Configuration

```javascript
// Initialize with 2-of-3 multi-sig
const response = await axios.post('/api/multisig/config/init', {
  issuer: 'GB...ABC',
  threshold: 2,
  signers: ['GA...DEF', 'GC...GHI', 'GD...JKL'],
  maxSigners: 5
});

console.log('Config initialized:', response.data.transactionHash);
```

### Proposing a Certificate

```javascript
// Propose a certificate with 7-day expiration
const response = await axios.post('/api/multisig/propose', {
  requestId: 'req-123',
  issuer: 'GB...ABC',
  recipient: 'GA...XYZ',
  metadata: 'certificate metadata',
  expirationDays: 7
});

console.log('Certificate proposed:', response.data);
```

### Approving a Request

```javascript
// Approve a pending request
const response = await axios.post('/api/multisig/approve/req-123');
console.log('Approval result:', response.data);
```

### Checking Request Status

```javascript
// Get request details
const request = await axios.get('/api/multisig/request/req-123');
console.log('Request status:', request.data.status);

// Check if expired
const expired = await axios.get('/api/multisig/expired/req-123');
console.log('Is expired:', expired.data.expired);
```

## Best Practices

### Security Recommendations
- Use strong threshold settings (e.g., 2-of-3, 3-of-5)
- Regularly rotate authorized signers
- Monitor pending requests for suspicious activity
- Set appropriate expiration periods

### Operational Guidelines
- Maintain backup signers for emergency situations
- Document approval workflows clearly
- Regularly review and update configurations
- Implement notification systems for pending requests

## Troubleshooting

### Common Issues

1. **Insufficient Approvals**
   - Verify threshold settings match expectations
   - Confirm authorized signers are correct
   - Check for expired requests

2. **Authorization Failures**
   - Verify signer addresses are authorized
   - Check authentication tokens
   - Confirm role permissions

3. **Transaction Failures**
   - Check Stellar network connectivity
   - Verify account balances
   - Ensure proper transaction signing

### Debugging Steps

1. Check request status and approvals
2. Verify multi-sig configuration
3. Review transaction logs
4. Test with sample data
5. Validate authentication tokens

## Future Enhancements

### Planned Features
- Notification system for pending requests
- Delegation capabilities for signers
- Advanced analytics and reporting
- Integration with certificate expiration
- Automated cleanup of expired requests

### Performance Improvements
- More efficient storage patterns
- Batch operations for multiple requests
- Enhanced caching mechanisms
- Database indexing optimizations

## Support

For issues or questions regarding the multi-sig implementation:
- Check the Stellar documentation
- Review the smart contract source code
- Examine backend service logs
- Test with the provided examples