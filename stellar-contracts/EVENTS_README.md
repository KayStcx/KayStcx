# Kaystcx Contract Events Documentation

## Overview

This document describes the comprehensive event system implemented in the Kaystcx smart contract. Events are emitted for all key certificate lifecycle actions to support off-chain indexing and notification systems.

## Event Structure

All events follow a consistent structure with:
- **Event Name**: Descriptive name indicating the action
- **Topics**: Tuple-based topics for efficient indexing (max 4 elements)
- **Data Fields**: Structured data containing relevant information

## Core Certificate Lifecycle Events

### CertificateIssuedEvent
Emitted when a new certificate is issued.

**Topics**: `("cert_issued", certificate_id)`

**Fields**:
- `certificate_id: String` - Unique identifier of the certificate
- `issuer: Address` - Address of the issuing authority
- `owner: Address` - Address of the certificate owner
- `metadata_uri: String` - URI to certificate metadata
- `issued_at: u64` - Timestamp when certificate was issued
- `version: CertificateVersion` - Version information of the certificate

**Usage Example**:
```rust
// Event is automatically emitted when issue_certificate is called
client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
```

### CertificateRevokedEvent
Emitted when a certificate is revoked.

**Topics**: `("cert_revoked", certificate_id)`

**Fields**:
- `certificate_id: String` - Unique identifier of the revoked certificate
- `revoked_by: Address` - Address that initiated the revocation
- `revoked_at: u64` - Timestamp when certificate was revoked
- `reason: String` - Reason for revocation

**Usage Example**:
```rust
// Event is automatically emitted when revoke_certificate is called
client.revoke_certificate(&cert_id, &reason);
```

### CertificateExpiredEvent
Emitted when a certificate expires (planned for future implementation).

**Topics**: `("cert_expired", certificate_id)`

**Fields**:
- `certificate_id: String` - Unique identifier of the expired certificate
- `expired_at: u64` - Timestamp when certificate expired
- `issuer: Address` - Address of the issuing authority

## Issuer Management Events

### IssuerAddedEvent
Emitted when a new issuer is authorized.

**Topics**: `("issuer_added", issuer_address)`

**Fields**:
- `issuer: Address` - Address of the newly added issuer
- `added_by: Address` - Address of the admin who added the issuer
- `added_at: u64` - Timestamp when issuer was added
- `permissions: Vec<String>` - List of permissions granted to the issuer

**Usage Example**:
```rust
let mut permissions = Vec::new(&env);
permissions.push_back(String::from_str(&env, "issue"));
permissions.push_back(String::from_str(&env, "revoke"));

client.add_issuer(&new_issuer, &permissions, &admin);
```

### IssuerRemovedEvent
Emitted when an issuer is removed.

**Topics**: `("issuer_removed", issuer_address)`

**Fields**:
- `issuer: Address` - Address of the removed issuer
- `removed_by: Address` - Address of the admin who removed the issuer
- `removed_at: u64` - Timestamp when issuer was removed
- `reason: String` - Reason for removal

**Usage Example**:
```rust
client.remove_issuer(&issuer_to_remove, &reason, &admin);
```

### AdminTransferredEvent
Emitted when admin rights are transferred to a new address.

**Topics**: `("admin_transferred",)`

**Fields**:
- `from_admin: Address` - Address of the current admin
- `to_admin: Address` - Address of the new admin
- `transferred_by: Address` - Address that initiated the transfer
- `transferred_at: u64` - Timestamp when transfer occurred

**Usage Example**:
```rust
client.transfer_admin(&new_admin, &current_admin);
```

## Event Naming Conventions

All events follow consistent naming patterns:
- **Action Verbs**: Use past tense (issued, revoked, added, removed, transferred)
- **Subject Nouns**: Clear identification of what was affected
- **Consistent Structure**: All events include actor, timestamp, and relevant IDs

## Event Topics Structure

Topics follow the pattern: `(primary_topic, secondary_identifier)`

Where:
- `primary_topic`: Main event category (e.g., "cert_issued", "issuer_added")
- `secondary_identifier`: Unique identifier for indexing (e.g., certificate_id, address)

## Integration Examples

### JavaScript/TypeScript Integration
```javascript
// Listen for certificate issued events
const certificateIssuedEvents = await server.eventsApiClient.getEvents({
  contractIds: [contractId],
  topics: ['cert_issued'],
  limit: 100
});

// Process events
certificateIssuedEvents.records.forEach(event => {
  console.log('Certificate issued:', event.value.certificate_id);
  console.log('Issuer:', event.value.issuer);
  console.log('Owner:', event.value.owner);
});
```

### Off-chain Indexing
```python
# Python example for indexing events
def process_certificate_events(events):
    for event in events:
        if event.topic[0] == 'cert_issued':
            # Index new certificate
            index_certificate(event.value)
        elif event.topic[0] == 'cert_revoked':
            # Update certificate status
            update_certificate_status(event.value.certificate_id, 'revoked')
```

## Event Guarantees

1. **Atomicity**: Events are emitted within the same transaction as the state change
2. **Ordering**: Events maintain chronological order within the blockchain
3. **Immutability**: Once emitted, events cannot be modified or deleted
4. **Completeness**: Every successful operation emits the corresponding event
5. **Consistency**: Event data matches the on-chain state

## Error Handling

Events are only emitted for successful operations:
- Failed transactions do not emit events
- Authorization failures prevent event emission
- Invalid parameters result in panics without event emission

## Testing Events

The contract includes comprehensive tests that verify:
- Event emission for all operations
- Correct event data structure
- Proper error handling
- Data consistency between events and state

Run tests with:
```bash
cd stellar-contracts
cargo test
```

## Monitoring and Analytics

Events enable various monitoring capabilities:
- **Real-time Notifications**: Push notifications for certificate actions
- **Audit Trails**: Complete history of all certificate operations
- **Analytics**: Usage patterns and statistics
- **Compliance**: Regulatory reporting and compliance tracking
- **Dashboard Integration**: Real-time status updates for UI components

## Performance Considerations

- Events use `symbol_short!` for gas-efficient topic creation
- Structured data minimizes serialization overhead
- Topics enable efficient event filtering and indexing
- Event data is optimized for common query patterns

## Version Compatibility

Events maintain backward compatibility:
- New fields are added as optional parameters
- Existing event structures remain unchanged
- Topic formats are preserved across versions
- Deprecation notices for legacy events

## Security Notes

- Events contain only public information
- No sensitive data is included in event payloads
- Actor addresses are verified on-chain
- Timestamps are derived from ledger time