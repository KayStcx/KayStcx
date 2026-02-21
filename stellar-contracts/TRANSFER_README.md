# Certificate Transferability Smart Contract

## Overview

This smart contract implements professional certificate transferability functionality for the Stellar blockchain. Certificate holders can securely transfer their certificates to other Stellar addresses with recipient acceptance required.

## Features Implemented

### 1. Transfer Ownership Function
- **initiate_transfer**: Allows certificate owners to initiate transfers to other addresses
- Requires authentication from the current owner
- Validates that the recipient is different from the sender
- Ensures the certificate is not already revoked

### 2. Recipient Acceptance Required
- **accept_transfer**: Recipients must explicitly accept pending transfers
- Only the intended recipient can accept the transfer
- Transfer status changes from `Pending` to `Accepted`
- Authentication required from the recipient

### 3. Transfer History Tracking
- **get_transfer_history**: Retrieve complete transfer history for any certificate
- Tracks all transfers with timestamps, parties involved, and fees
- Maintains immutable record of ownership changes

### 4. Revocation on Transfer Option
- **require_revocation** parameter in transfer initiation
- Optional revocation of the original certificate when transferred
- Useful for limited-use certificates or when the issuer wants to maintain control

### 5. Transfer Fees (Optional)
- **transfer_fee** parameter supports optional fees for transfers
- Can be set to 0 for free transfers
- Fees are recorded in transfer history for auditing

### 6. Comprehensive Events
All transfer operations emit events for blockchain indexing:
- `TransferInitiatedEvent`: When a transfer is initiated
- `TransferAcceptedEvent`: When a transfer is accepted
- `TransferCompletedEvent`: When a transfer is finalized
- `TransferRejectedEvent`: When a transfer is rejected
- `TransferCancelledEvent`: When a transfer is cancelled

## Data Structures

### TransferStatus
```rust
pub enum TransferStatus {
    Pending,      // Transfer initiated, waiting for acceptance
    Accepted,     // Transfer accepted by recipient
    Rejected,     // Transfer rejected by recipient
    Cancelled,    // Transfer cancelled by sender
    Completed,    // Transfer completed successfully
}
```

### TransferRequest
```rust
pub struct TransferRequest {
    pub id: String,           // Unique transfer ID
    pub certificate_id: String, // Certificate being transferred
    pub from_address: Address,   // Current owner
    pub to_address: Address,     // New owner
    pub initiated_at: u64,       // When transfer was initiated
    pub accepted_at: Option<u64>, // When transfer was accepted
    pub completed_at: Option<u64>, // When transfer was completed
    pub status: TransferStatus,   // Current status
    pub require_revocation: bool, // Whether to revoke on transfer
    pub transfer_fee: u64,        // Transfer fee (0 for no fee)
    pub memo: Option<String>,     // Optional memo for transfer
}
```

### TransferHistory
```rust
pub struct TransferHistory {
    pub transfer_id: String,
    pub certificate_id: String,
    pub from_address: Address,
    pub to_address: Address,
    pub transferred_at: u64,
    pub transfer_fee: u64,
    pub memo: Option<String>,
}
```

## Functions

### Core Transfer Functions

#### `initiate_transfer`
Initiates a certificate transfer from one address to another.

**Parameters:**
- `transfer_id`: Unique identifier for this transfer
- `certificate_id`: ID of the certificate to transfer
- `from_address`: Current owner (must authenticate)
- `to_address`: New owner
- `require_revocation`: Whether to revoke the certificate on transfer
- `transfer_fee`: Optional fee for the transfer
- `memo`: Optional memo for the transfer

**Returns:** `Result<(), CertificateError>`

#### `accept_transfer`
Accepts a pending transfer request.

**Parameters:**
- `transfer_id`: ID of the transfer to accept
- `recipient`: Intended recipient (must authenticate)

**Returns:** `Result<(), CertificateError>`

#### `complete_transfer`
Finalizes an accepted transfer and updates certificate ownership.

**Parameters:**
- `transfer_id`: ID of the transfer to complete
- `executor`: Address executing the completion (sender, recipient, or issuer)

**Returns:** `Result<(), CertificateError>`

#### `reject_transfer`
Rejects a pending transfer request.

**Parameters:**
- `transfer_id`: ID of the transfer to reject
- `recipient`: Intended recipient (must authenticate)

**Returns:** `Result<(), CertificateError>`

#### `cancel_transfer`
Cancels a pending transfer request.

**Parameters:**
- `transfer_id`: ID of the transfer to cancel
- `sender`: Original sender (must authenticate)

**Returns:** `Result<(), CertificateError>`

### Query Functions

#### `get_transfer`
Retrieves a transfer request by ID.

**Parameters:**
- `transfer_id`: ID of the transfer to retrieve

**Returns:** `Result<TransferRequest, CertificateError>`

#### `get_pending_transfers`
Gets all pending transfers for an address.

**Parameters:**
- `address`: Address to check for pending transfers

**Returns:** `Vec<String>` (transfer IDs)

#### `get_transfer_history`
Retrieves transfer history for a certificate.

**Parameters:**
- `certificate_id`: ID of the certificate

**Returns:** `Vec<TransferHistory>`

#### `get_transfer_count`
Gets the total number of transfers.

**Returns:** `u64`

## Error Handling

The contract defines comprehensive error types:

```rust
pub enum CertificateError {
    AlreadyExists,
    NotFound,
    Unauthorized,
    InvalidData,
    AlreadyRevoked,
    TransferNotFound,
    TransferNotPending,
    TransferNotAuthorized,
    InsufficientBalance,
    InvalidTransferStatus,
}
```

## Security Features

1. **Authentication**: All operations require proper address authentication
2. **Authorization**: Only authorized parties can perform specific actions
3. **State Validation**: Comprehensive state checks prevent invalid operations
4. **Immutable History**: Transfer history cannot be altered once recorded
5. **Event Logging**: All operations emit blockchain events for transparency

## Transfer Flow

1. **Initiation**: Owner initiates transfer with `initiate_transfer`
2. **Pending State**: Transfer is marked as `Pending` and added to recipient's pending list
3. **Acceptance**: Recipient accepts with `accept_transfer`, status becomes `Accepted`
4. **Completion**: Either party can complete with `complete_transfer`, status becomes `Completed`
5. **Ownership Transfer**: Certificate owner is updated to new address
6. **History Recording**: Transfer is recorded in certificate's history

## Testing

The contract includes comprehensive tests covering:
- Basic transfer flow
- Transfer with revocation
- Transfer rejection
- Transfer cancellation
- Transfer with fees
- Authorization checks
- Transfer counting

Run tests with:
```bash
cd stellar-contracts
cargo test
```

## Integration

To integrate this functionality into your application:

1. Deploy the contract to Stellar network
2. Use the client SDK to interact with transfer functions
3. Monitor events for real-time transfer status updates
4. Query transfer history for auditing purposes

## Events Reference

All events use the `symbol_short!` macro for efficient event emission:

- `transfer_init`: Transfer initiated
- `transfer_accept`: Transfer accepted
- `transfer_complete`: Transfer completed
- `transfer_reject`: Transfer rejected
- `transfer_cancel`: Transfer cancelled

## Storage Keys

The contract uses the following storage keys:

```rust
pub enum DataKey {
    Certificate(String),      // Certificate ID -> Certificate
    TransferRequest(String),  // Transfer ID -> TransferRequest
    TransferHistory(String),  // Certificate ID -> Vec<TransferHistory>
    PendingTransfers(Address), // Address -> Vec<TransferID>
    TransferCount,            // Total number of transfers
}
```

## Best Practices

1. **Unique Transfer IDs**: Generate unique IDs for each transfer (UUID recommended)
2. **Fee Management**: Set appropriate fees based on your use case
3. **Memo Usage**: Use memos for additional context about transfers
4. **Event Monitoring**: Monitor events for real-time status updates
5. **History Auditing**: Regularly audit transfer history for compliance
6. **Error Handling**: Always handle errors appropriately in client applications

This implementation provides a robust, secure, and professional certificate transfer system suitable for production use on the Stellar network.