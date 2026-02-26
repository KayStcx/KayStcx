# Certificate Status State Machine

## Overview

This document describes the formal status state machine implemented in the Kaystcx smart contract for managing certificate lifecycle states and valid transitions.

## Status States

The contract defines four distinct certificate statuses:

### 1. Active
- **Description**: Certificate is valid, active, and can be used for verification
- **Characteristics**:
  - Can be verified successfully
  - Can be transferred (if transferable)
  - Can be upgraded (if upgradable)
  - Can be frozen during disputes

### 2. Revoked
- **Description**: Certificate has been permanently revoked by the issuer
- **Characteristics**:
  - Cannot be used for verification
  - Cannot be transferred
  - Cannot be upgraded
  - Cannot be reactivated
  - **Terminal state** - no further transitions allowed

### 3. Expired
- **Description**: Certificate has passed its expiration date
- **Characteristics**:
  - Cannot be used for verification
  - Cannot be transferred
  - Cannot be upgraded
  - Can be revoked (transition to Revoked)
  - **Mostly terminal** - only Revoked transition allowed

### 4. Suspended
- **Description**: Certificate is temporarily suspended
- **Characteristics**:
  - Cannot be used for verification while suspended
  - Cannot be transferred
  - Cannot be upgraded
  - Can be reactivated (transition to Active)
  - Can be revoked (transition to Revoked)
  - Can expire (transition to Expired)

## State Machine Transitions

### Valid Transitions

```
┌─────────┐     revoke      ┌──────────┐
│         │ ──────────────> │          │
│  Active │                 │ Revoked  │
│         │ ──┐             │ (Terminal)
└────┬────┘   │             └──────────┘
     │        │ suspend
     │        └────────┐
     │ expire          ▼
     │           ┌───────────┐
     └─────────> │ Suspended │
                 │           │ ──> revoke ──> Revoked
                 └─────┬─────┘
                       │
                       │ reactivate
                       ▼
                 ┌───────────┐
                 │   Active  │
                 └───────────┘
```

### Transition Matrix

| From \ To | Active | Revoked | Expired | Suspended |
|-----------|--------|---------|---------|-----------|
| **Active** | ✗ | ✓ | ✓ | ✓ |
| **Revoked** | ✗ | ✗ | ✗ | ✗ |
| **Expired** | ✗ | ✓ | ✗ | ✗ |
| **Suspended** | ✓ | ✓ | ✓ | ✗ |

### Detailed Transition Rules

#### Active → Revoked
- **Trigger**: Issuer revokes the certificate
- **Function**: `revoke_certificate`
- **Authorization**: Issuer only
- **Event**: `CertificateRevokedEvent`, `CertificateStatusChangedEvent`

#### Active → Expired
- **Trigger**: Certificate passes expiration date
- **Function**: `expire_certificate`
- **Authorization**: Issuer or automated process
- **Event**: `CertificateExpiredEvent`, `CertificateStatusChangedEvent`

#### Active → Suspended
- **Trigger**: Issuer suspends the certificate temporarily
- **Function**: `suspend_certificate`
- **Authorization**: Issuer only
- **Event**: `CertificateSuspendedEvent`, `CertificateStatusChangedEvent`

#### Suspended → Active
- **Trigger**: Issuer reactivates the certificate
- **Function**: `reactivate_certificate`
- **Authorization**: Issuer only
- **Event**: `CertificateReactivatedEvent`, `CertificateStatusChangedEvent`

#### Suspended → Revoked
- **Trigger**: Issuer revokes while suspended
- **Function**: `revoke_certificate`
- **Authorization**: Issuer only
- **Event**: `CertificateRevokedEvent`, `CertificateStatusChangedEvent`

#### Suspended → Expired
- **Trigger**: Certificate passes expiration date while suspended
- **Function**: `expire_certificate`
- **Authorization**: Issuer or automated process
- **Event**: `CertificateExpiredEvent`, `CertificateStatusChangedEvent`

#### Expired → Revoked
- **Trigger**: Issuer revokes expired certificate
- **Function**: `revoke_certificate`
- **Authorization**: Issuer only
- **Event**: `CertificateRevokedEvent`, `CertificateStatusChangedEvent`

### Invalid Transitions (Rejected with Errors)

| Invalid Transition | Error |
|-------------------|-------|
| Revoked → Any | `CertificateAlreadyRevoked` |
| Expired → Active | `InvalidStatusTransition` |
| Expired → Suspended | `InvalidStatusTransition` |
| Active → Active | `InvalidStatusTransition` |
| Suspended → Suspended | `InvalidStatusTransition` |
| Expired → Expired | `InvalidStatusTransition` |

## Contract Functions

### Status Management Functions

#### `get_status`
Retrieves the current status of a certificate.

**Parameters:**
- `id`: Certificate ID

**Returns:** `Result<CertificateStatus, CertificateError>`

**Example:**
```rust
let status = contract.get_status(&certificate_id)?;
match status {
    CertificateStatus::Active => println!("Certificate is valid"),
    CertificateStatus::Revoked => println!("Certificate is revoked"),
    CertificateStatus::Expired => println!("Certificate has expired"),
    CertificateStatus::Suspended => println!("Certificate is suspended"),
}
```

#### `is_active`
Checks if a certificate is active and valid for use.

**Parameters:**
- `id`: Certificate ID

**Returns:** `bool`

**Note:** Returns `false` if certificate is not Active or is frozen.

#### `revoke_certificate`
Revokes a certificate (Active or Suspended → Revoked).

**Parameters:**
- `id`: Certificate ID
- `reason`: Reason for revocation

**Returns:** `Result<(), CertificateError>`

**Authorization:** Issuer only

#### `suspend_certificate`
Suspends a certificate temporarily (Active → Suspended).

**Parameters:**
- `id`: Certificate ID
- `reason`: Reason for suspension

**Returns:** `Result<(), CertificateError>`

**Authorization:** Issuer only

#### `reactivate_certificate`
Reactivates a suspended certificate (Suspended → Active).

**Parameters:**
- `id`: Certificate ID
- `reason`: Reason for reactivation

**Returns:** `Result<(), CertificateError>`

**Authorization:** Issuer only

#### `expire_certificate`
Expires a certificate (Active or Suspended → Expired).

**Parameters:**
- `id`: Certificate ID

**Returns:** `Result<(), CertificateError>`

**Authorization:** Issuer or automated process

#### `set_expiration`
Sets an expiration date for a certificate.

**Parameters:**
- `id`: Certificate ID
- `expires_at`: Expiration timestamp (Unix timestamp)

**Returns:** `Result<(), CertificateError>`

**Authorization:** Issuer only

### Verification Functions

#### `is_valid`
Checks if a certificate is valid (Active and not expired).

**Parameters:**
- `certificate_id`: Certificate ID

**Returns:** `bool`

#### `is_revoked`
Checks if a certificate is revoked.

**Parameters:**
- `id`: Certificate ID

**Returns:** `bool`

#### `batch_verify_certificates`
Verifies multiple certificates in a batch operation.

**Parameters:**
- `ids`: Vector of certificate IDs

**Returns:** `BatchVerificationResult`

## Events

### CertificateStatusChangedEvent
Emitted whenever a certificate's status changes.

```rust
pub struct CertificateStatusChangedEvent {
    pub certificate_id: String,
    pub from_status: CertificateStatus,
    pub to_status: CertificateStatus,
    pub changed_by: Address,
    pub changed_at: u64,
    pub reason: Option<String>,
}
```

### CertificateSuspendedEvent
Emitted when a certificate is suspended.

```rust
pub struct CertificateSuspendedEvent {
    pub certificate_id: String,
    pub suspended_by: Address,
    pub suspended_at: u64,
    pub reason: String,
}
```

### CertificateReactivatedEvent
Emitted when a certificate is reactivated.

```rust
pub struct CertificateReactivatedEvent {
    pub certificate_id: String,
    pub reactivated_by: Address,
    pub reactivated_at: u64,
    pub reason: String,
}
```

### CertificateRevokedEvent
Emitted when a certificate is revoked.

```rust
pub struct CertificateRevokedEvent {
    pub certificate_id: String,
    pub revoked_by: Address,
    pub revoked_at: u64,
    pub reason: String,
}
```

### CertificateExpiredEvent
Emitted when a certificate expires.

```rust
pub struct CertificateExpiredEvent {
    pub certificate_id: String,
    pub expired_at: u64,
    pub issuer: Address,
}
```

## Error Types

### InvalidStatusTransition
Returned when attempting an invalid status transition.

### CertificateNotActive
Returned when an operation requires an Active certificate but the certificate is in a different state.

### CertificateAlreadyRevoked
Returned when attempting to transition from a Revoked certificate.

### CertificateExpired
Returned when an operation cannot be performed on an expired certificate.

### CertificateSuspended
Returned when an operation cannot be performed on a suspended certificate.

## Integration Examples

### Suspending a Certificate

```rust
// Suspend a certificate for investigation
contract.suspend_certificate(
    &certificate_id,
    &String::from_str(&env, "Under investigation for potential fraud"),
)?;
```

### Reactivating a Certificate

```rust
// Reactivate after investigation clears
contract.reactivate_certificate(
    &certificate_id,
    &String::from_str(&env, "Investigation completed - certificate cleared"),
)?;
```

### Checking Status Before Operations

```rust
// Always check status before critical operations
if contract.is_active(&certificate_id) {
    // Perform operation
} else {
    let status = contract.get_status(&certificate_id)?;
    // Handle non-active status appropriately
}
```

### Handling Expiration

```rust
// Set expiration date
let expiration_time = current_time + (365 * 24 * 60 * 60); // 1 year
contract.set_expiration(&certificate_id, &expiration_time)?;

// Later, check and expire if needed
if contract.is_expired(&certificate_id) {
    contract.expire_certificate(&certificate_id)?;
}
```

## Security Considerations

1. **Authorization**: All status-changing operations require issuer authentication
2. **Atomic Updates**: Status changes are atomic with storage updates and event emission
3. **Validation**: All transitions are validated against the state machine rules
4. **Immutability**: Revoked certificates cannot be reactivated (terminal state)
5. **Audit Trail**: All status changes emit events for complete auditability

## Backward Compatibility

The `revoked` field in the Certificate struct is maintained for backward compatibility but is now derived from the `status` field:
- `revoked = true` when `status == CertificateStatus::Revoked`
- `revoked = false` otherwise

New code should use the `status` field and `get_status()` function for status checks.
