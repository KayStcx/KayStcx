# Certificate Upgrade Mechanism

## Overview

This smart contract implements a professional certificate upgrade mechanism that allows certificates to be upgraded to newer versions while maintaining backward compatibility and proper version tracking.

## Features Implemented

### 1. Version Tracking
- **Semantic Versioning**: Uses MAJOR.MINOR.PATCH format
- **Version Chain**: Maintains complete history of certificate versions
- **Parent-Child Relationships**: Links certificate versions in a chain
- **Version Comparison**: Built-in version comparison utilities

### 2. Upgrade Path Validation
- **Rule-based Validation**: Configurable upgrade rules
- **Approval Requirements**: Flexible approval workflows
- **Version Compatibility**: Automatic compatibility checking
- **Migration Script Support**: Optional migration script references

### 3. Old Version Archiving
- **Immutable Archiving**: Old versions are archived, not deleted
- **Complete Data Preservation**: Original certificate data is preserved
- **Archival Reason Tracking**: Reasons for archiving are recorded
- **Version Chain Maintenance**: Complete version history is maintained

### 4. Backward Compatibility
- **Compatibility Matrix**: Configurable version compatibility
- **Forward/Backward Compatibility Flags**: Flexible compatibility settings
- **Version Interoperability**: Support for cross-version operations

### 5. Upgrade Events
- **UpgradeRequestedEvent**: When an upgrade is requested
- **UpgradeApprovedEvent**: When an upgrade is approved
- **UpgradeCompletedEvent**: When an upgrade is completed
- **CertificateUpgradedEvent**: When a certificate is upgraded
- **CertificateArchivedEvent**: When a version is archived

### 6. Version Migration Helpers
- **Migration Data Support**: Optional migration data for complex upgrades
- **Upgrade Notes**: Additional context for upgrade operations
- **Version Comparison Utilities**: Helper functions for version operations
- **Compatibility Checking**: Built-in compatibility validation

## Data Structures

### CertificateVersion
```rust
pub struct CertificateVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pub build: Option<String>,
}
```

### UpgradeRule
```rust
pub struct UpgradeRule {
    pub from_version: CertificateVersion,
    pub to_version: CertificateVersion,
    pub allowed: bool,
    pub requires_issuer_approval: bool,
    pub migration_script_hash: Option<String>,
}
```

### UpgradeRequest
```rust
pub struct UpgradeRequest {
    pub id: String,
    pub certificate_id: String,
    pub from_version: CertificateVersion,
    pub to_version: CertificateVersion,
    pub requested_by: Address,
    pub approved_by: Option<Address>,
    pub requested_at: u64,
    pub approved_at: Option<u64>,
    pub completed_at: Option<u64>,
    pub status: UpgradeStatus,
    pub migration_data: Option<String>,
    pub notes: Option<String>,
}
```

### UpgradeStatus
```rust
pub enum UpgradeStatus {
    Pending,      // Upgrade requested, waiting for approval
    Approved,     // Upgrade approved, ready to execute
    InProgress,   // Upgrade is being executed
    Completed,    // Upgrade completed successfully
    Failed,       // Upgrade failed
    Cancelled,    // Upgrade cancelled
}
```

### CompatibilityMatrix
```rust
pub struct CompatibilityMatrix {
    pub version: CertificateVersion,
    pub compatible_versions: Vec<CertificateVersion>,
    pub backward_compatible: bool,
    pub forward_compatible: bool,
}
```

## Core Functions

### Upgrade Management

#### `request_upgrade`
Requests an upgrade for a certificate to a new version.

**Parameters:**
- `upgrade_id`: Unique identifier for the upgrade request
- `certificate_id`: ID of the certificate to upgrade
- `to_version`: Target version for the upgrade
- `requester`: Address requesting the upgrade
- `migration_data`: Optional migration data
- `notes`: Optional notes about the upgrade

**Returns:** `Result<(), CertificateError>`

#### `approve_upgrade`
Approves a pending upgrade request.

**Parameters:**
- `upgrade_id`: ID of the upgrade request
- `approver`: Address approving the upgrade (must be issuer)

**Returns:** `Result<(), CertificateError>`

#### `execute_upgrade`
Executes an approved upgrade and creates the new certificate version.

**Parameters:**
- `upgrade_id`: ID of the upgrade request
- `executor`: Address executing the upgrade (owner or issuer)

**Returns:** `Result<String, CertificateError>` (new certificate ID)

### Query Functions

#### `get_upgrade_request`
Retrieves an upgrade request by ID.

**Parameters:**
- `upgrade_id`: ID of the upgrade request

**Returns:** `Result<UpgradeRequest, CertificateError>`

#### `get_upgrade_history`
Gets the complete upgrade history for a certificate.

**Parameters:**
- `certificate_id`: ID of the certificate

**Returns:** `Vec<UpgradeRequest>`

#### `get_pending_upgrades`
Gets pending upgrades requiring approval for an issuer.

**Parameters:**
- `issuer`: Issuer address

**Returns:** `Vec<String>` (upgrade IDs)

#### `get_archived_certificate`
Retrieves an archived certificate version.

**Parameters:**
- `certificate_id`: Certificate ID
- `version`: Version to retrieve

**Returns:** `Result<ArchivedCertificate, CertificateError>`

#### `get_version_chain`
Gets the complete version chain for a certificate.

**Parameters:**
- `certificate_id`: Certificate ID

**Returns:** `Vec<CertificateVersion>`

#### `get_compatibility_matrix`
Retrieves compatibility information for a version.

**Parameters:**
- `version`: Version to check compatibility for

**Returns:** `Result<CompatibilityMatrix, CertificateError>`

### Helper Functions

#### `compare_versions`
Compares two certificate versions.

**Parameters:**
- `version1`: First version
- `version2`: Second version

**Returns:** `i32` (negative if v1 < v2, positive if v1 > v2, 0 if equal)

#### `is_upgrade_allowed`
Checks if an upgrade path is allowed.

**Parameters:**
- `from_version`: Current version
- `to_version`: Target version
- `upgrade_rules`: Upgrade rules to validate against

**Returns:** `bool`

## Version Management

### Version Comparison Logic
- **Major Version**: Breaking changes, requires explicit approval
- **Minor Version**: New features, backward compatible (auto-approved by default)
- **Patch Version**: Bug fixes, backward compatible (auto-approved by default)

### Upgrade Path Validation
1. **Version Direction**: Target version must be greater than current version
2. **Rule Validation**: Check specific upgrade rules if defined
3. **Default Policy**: Major changes require explicit rules, minor/patch allowed by default
4. **Compatibility Check**: Validate version compatibility before execution

### Archiving Process
1. **Data Preservation**: Original certificate data is serialized and stored
2. **Chain Linking**: Parent-child relationships are maintained
3. **Reason Recording**: Archival reason is documented
4. **Event Emission**: Archival event is emitted for tracking

## Security Features

### Authentication & Authorization
- **Requester Auth**: Upgrade requester must authenticate
- **Approver Auth**: Only certificate issuer can approve upgrades
- **Executor Auth**: Only owner or issuer can execute upgrades
- **Role-based Access**: Different permissions for different operations

### Validation & Safety
- **State Validation**: Comprehensive state machine validation
- **Version Validation**: Strict version comparison and validation
- **Compatibility Checking**: Pre-execution compatibility validation
- **Duplicate Prevention**: Prevents duplicate upgrade requests

## Error Handling

### Upgrade Errors
```rust
pub enum CertificateError {
    // ... existing errors ...
    UpgradeNotAllowed,
    UpgradePathInvalid,
    UpgradeNotApproved,
    UpgradeAlreadyExists,
    VersionConflict,
    InvalidVersionFormat,
    IncompatibleVersions,
    CertificateNotUpgradable,
    UpgradeInProgress,
    ParentVersionNotFound,
}
```

## Upgrade Workflow

### Standard Upgrade Flow
1. **Request**: Owner requests upgrade with target version
2. **Validation**: System validates upgrade path and compatibility
3. **Approval**: Issuer approval required for major versions
4. **Execution**: Owner or issuer executes the upgrade
5. **Archiving**: Old version is archived
6. **Creation**: New version certificate is created
7. **Linking**: Parent-child relationships are established

### Auto-Approved Upgrades
- Minor version upgrades (1.0.0 → 1.1.0)
- Patch version upgrades (1.0.0 → 1.0.1)
- Configurable through upgrade rules

### Approval-Required Upgrades
- Major version upgrades (1.0.0 → 2.0.0)
- Custom upgrade paths requiring approval
- Security-sensitive upgrades

## Testing

### Comprehensive Test Coverage
The implementation includes 8 test cases covering:

1. **Basic Upgrade Flow**: Complete upgrade from request to completion
2. **Approval Workflow**: Upgrades requiring issuer approval
3. **Version Comparison**: Version comparison utilities
4. **Upgrade Validation**: Path validation and rule checking
5. **Archived Certificates**: Certificate archiving functionality
6. **Upgrade Counting**: Tracking total upgrade operations
7. **Error Handling**: Various error scenarios
8. **Integration**: Full workflow integration testing

## Storage Architecture

### Storage Keys
```rust
pub enum DataKey {
    // ... existing keys ...
    UpgradeRequest(String),   // Upgrade ID -> UpgradeRequest
    UpgradeHistory(String),   // Certificate ID -> Vec<UpgradeRequest>
    ArchivedCertificate(String, CertificateVersion), // Certificate + Version -> ArchivedCertificate
    VersionChain(String),     // Certificate ID -> Vec<CertificateVersion>
    CompatibilityMatrix(CertificateVersion), // Version -> CompatibilityMatrix
    UpgradeRules,             // Global upgrade rules
    UpgradeCount,             // Total number of upgrades
    PendingUpgrades(Address), // Issuer -> Vec<UpgradeID>
}
```

## Events Reference

All upgrade operations emit blockchain events:

- `upgrade_request`: Upgrade requested
- `upgrade_approve`: Upgrade approved
- `upgrade_complete`: Upgrade completed
- `cert_upgrade`: Certificate upgraded
- `cert_archive`: Certificate version archived

## Best Practices

### Version Management
1. **Semantic Versioning**: Follow MAJOR.MINOR.PATCH conventions
2. **Backward Compatibility**: Maintain backward compatibility when possible
3. **Clear Upgrade Paths**: Define explicit upgrade rules for major changes
4. **Migration Planning**: Include migration data for complex upgrades

### Security
1. **Approval Workflows**: Use appropriate approval requirements
2. **Access Control**: Implement proper role-based access
3. **Audit Trail**: Maintain complete upgrade history
4. **Data Preservation**: Never lose certificate data during upgrades

### Performance
1. **Efficient Storage**: Use appropriate data structures
2. **Event Optimization**: Emit only necessary events
3. **Validation Caching**: Cache compatibility matrices
4. **Batch Operations**: Support batch upgrade operations

## Integration

### Client Interface
All functions are exposed through the contract client interface and ready for:
- Frontend upgrade management UI
- Backend service integration
- Automated upgrade workflows
- Third-party certificate management systems

### Event Monitoring
Applications can monitor blockchain events for:
- Real-time upgrade status updates
- Audit trail generation
- Compliance reporting
- Automated workflow triggers

This implementation provides a robust, secure, and professional certificate upgrade system suitable for production use on the Stellar network.