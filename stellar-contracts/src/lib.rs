#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, String, Vec,
};

const MAX_BATCH_SIZE: u32 = 50;
const BASE_VERIFICATION_COST: u64 = 10;
const COST_PER_CERTIFICATE: u64 = 5;
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, symbol_short};

// Soroban event emission - topics must be a tuple of up to 4 elements
// We'll emit events using env.events().publish()

/// Certificate version information
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CertificateVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pub build: Option<String>,
}

/// Upgrade path validation rule
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpgradeRule {
    pub from_version: CertificateVersion,
    pub to_version: CertificateVersion,
    pub allowed: bool,
    pub requires_issuer_approval: bool,
    pub migration_script_hash: Option<String>, // IPFS hash of migration script
}

/// Archived certificate version
#[contracttype]
#[derive(Clone, Debug)]
pub struct ArchivedCertificate {
    pub certificate_id: String,
    pub version: CertificateVersion,
    pub archived_at: u64,
    pub archived_by: Address,
    pub original_data: String, // Serialized original certificate data
    pub reason: String,        // Reason for archiving
}

/// Certificate upgrade request
#[contracttype]
#[derive(Clone, Debug)]
pub struct UpgradeRequest {
    pub id: String,              // Unique upgrade request ID
    pub certificate_id: String,  // Certificate to upgrade
    pub from_version: CertificateVersion,
    pub to_version: CertificateVersion,
    pub requested_by: Address,   // Who requested the upgrade
    pub approved_by: Option<Address>, // Who approved (if required)
    pub requested_at: u64,
    pub approved_at: Option<u64>,
    pub completed_at: Option<u64>,
    pub status: UpgradeStatus,
    pub migration_data: Option<String>, // Additional migration data
    pub notes: Option<String>,   // Optional notes about the upgrade
}

/// Upgrade status enum
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum UpgradeStatus {
    Pending,      // Upgrade requested, waiting for approval
    Approved,     // Upgrade approved, ready to execute
    InProgress,   // Upgrade is being executed
    Completed,    // Upgrade completed successfully
    Failed,       // Upgrade failed
    Cancelled,    // Upgrade cancelled
}

/// Version compatibility matrix
#[contracttype]
#[derive(Clone, Debug)]
pub struct CompatibilityMatrix {
    pub version: CertificateVersion,
    pub compatible_versions: Vec<CertificateVersion>,
    pub backward_compatible: bool,
    pub forward_compatible: bool,
}

mod crl;
mod crl_test;
mod multisig;
mod multisig_test;

pub use crl::{
    CRLContract,
    CRLContractClient,
    RevocationReason,
    RevokedCertificate,
    CertificateRevocationList,
    Pagination,
    PaginatedResult,
    VerificationResult,
};

pub use multisig::{
    MultisigCertificateContract,
    MultisigCertificateContractClient,
    MultisigConfig,
    PendingRequest,
    RequestStatus,
    SignatureAction,
    SignatureRecord,
    SignatureResult,
    MultisigEvent,
    PaginatedResult as MultisigPaginatedResult,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Certificate {
    pub id: String,
    pub issuer: Address,
    pub owner: Address,
    pub metadata_uri: String,
    pub issued_at: u64,
    pub revoked: bool,
    pub revocation_reason: Option<String>,
    pub revoked_at: Option<u64>,
    pub revoked_by: Option<Address>,
    // Upgrade-related fields
    pub version: CertificateVersion,           // Current version
    pub parent_certificate_id: Option<String>, // Points to previous version
    pub child_certificate_id: Option<String>,  // Points to next version
    pub is_upgradable: bool,                   // Whether this certificate can be upgraded
    pub upgrade_rules: Vec<UpgradeRule>,       // Valid upgrade paths
    pub compatibility_matrix: CompatibilityMatrix, // Version compatibility info
    // Freeze-related fields
    pub frozen: bool,                          // Whether the certificate is frozen
    pub freeze_info: Option<FrozenCertificateInfo>, // Freeze details
}

/// Transfer status enum
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TransferStatus {
    Pending,      // Transfer initiated, waiting for acceptance
    Accepted,     // Transfer accepted by recipient
    Rejected,     // Transfer rejected by recipient
    Cancelled,    // Transfer cancelled by sender
    Completed,    // Transfer completed successfully
}

/// Transfer request structure
#[contracttype]
#[derive(Clone, Debug)]
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

/// Transfer history entry
#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferHistory {
    pub transfer_id: String,
    pub certificate_id: String,
    pub from_address: Address,
    pub to_address: Address,
    pub transferred_at: u64,
    pub transfer_fee: u64,
    pub memo: Option<String>,
}

/// Events for certificate transfers
#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferInitiatedEvent {
    pub transfer_id: String,
    pub certificate_id: String,
    pub from_address: Address,
    pub to_address: Address,
    pub initiated_at: u64,
    pub transfer_fee: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferAcceptedEvent {
    pub transfer_id: String,
    pub accepted_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferCompletedEvent {
    pub transfer_id: String,
    pub certificate_id: String,
    pub from_address: Address,
    pub to_address: Address,
    pub completed_at: u64,
    pub transfer_fee: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferRejectedEvent {
    pub transfer_id: String,
    pub rejected_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferCancelledEvent {
    pub transfer_id: String,
    pub cancelled_at: u64,
}

/// Upgrade events
#[contracttype]
#[derive(Clone, Debug)]
pub struct CertificateUpgradedEvent {
    pub certificate_id: String,
    pub from_version: CertificateVersion,
    pub to_version: CertificateVersion,
    pub upgraded_by: Address,
    pub upgraded_at: u64,
    pub parent_certificate_id: Option<String>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct UpgradeRequestedEvent {
    pub upgrade_id: String,
    pub certificate_id: String,
    pub from_version: CertificateVersion,
    pub to_version: CertificateVersion,
    pub requested_by: Address,
    pub requested_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct UpgradeApprovedEvent {
    pub upgrade_id: String,
    pub approved_by: Address,
    pub approved_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct UpgradeCompletedEvent {
    pub upgrade_id: String,
    pub certificate_id: String,
    pub from_version: CertificateVersion,
    pub to_version: CertificateVersion,
    pub completed_at: u64,
    pub new_certificate_id: String,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct CertificateArchivedEvent {
    pub certificate_id: String,
    pub version: CertificateVersion,
    pub archived_by: Address,
    pub archived_at: u64,
    pub reason: String,
}

/// Freeze information for a certificate
#[contracttype]
#[derive(Clone, Debug)]
pub struct FrozenCertificateInfo {
    pub certificate_id: String,
    pub frozen_at: u64,                    // Timestamp when the certificate was frozen
    pub unfreeze_at: Option<u64>,          // Optional timestamp for automatic unfreeze
    pub frozen_by: Address,                // Who froze the certificate
    pub reason: String,                    // Reason for freezing
    pub is_permanent: bool,                 // Whether the freeze is permanent (no auto-unfreeze)
}

/// Freeze event for history tracking
#[contracttype]
#[derive(Clone, Debug)]
pub struct FreezeEvent {
    pub certificate_id: String,
    pub event_type: FreezeEventType,
    pub timestamp: u64,
    pub performed_by: Address,
    pub reason: String,
    pub unfreeze_time: Option<u64>,
}

/// Freeze event types
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum FreezeEventType {
    Frozen,           // Certificate was frozen
    Unfrozen,         // Certificate was unfrozen
    AutoUnfrozen,     // Certificate was automatically unfrozen
    OverrideUnfrozen, // Admin overrode the freeze
}

/// Certificate frozen event
#[contracttype]
#[derive(Clone, Debug)]
pub struct CertificateFrozenEvent {
    pub certificate_id: String,
    pub frozen_by: Address,
    pub frozen_at: u64,
    pub unfreeze_at: Option<u64>,
    pub reason: String,
    pub is_permanent: bool,
}

/// Certificate unfrozen event
#[contracttype]
#[derive(Clone, Debug)]
pub struct CertificateUnfrozenEvent {
    pub certificate_id: String,
    pub unfrozen_by: Address,
    pub unfrozen_at: u64,
    pub reason: String,
    pub was_auto_unfreeze: bool,
}

/// Error types for the contract
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
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
    // Upgrade errors
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
    // Freeze errors
    AlreadyFrozen,
    NotFrozen,
    FreezeDurationExceeded,
    FreezeDurationInvalid,
    FreezeNotExpired,
}

/// Storage keys for the contract
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Certificate(String),      // Certificate ID -> Certificate
    TransferRequest(String),  // Transfer ID -> TransferRequest
    TransferHistory(String),  // Certificate ID -> Vec<TransferHistory>
    PendingTransfers(Address), // Address -> Vec<TransferID> (transfers pending acceptance)
    TransferCount,            // Total number of transfers
    // Upgrade-related storage
    UpgradeRequest(String),   // Upgrade ID -> UpgradeRequest
    UpgradeHistory(String),   // Certificate ID -> Vec<UpgradeRequest>
    ArchivedCertificate(String, CertificateVersion), // Certificate ID + Version -> ArchivedCertificate
    VersionChain(String),     // Certificate ID -> Vec<CertificateVersion> (version history)
    CompatibilityMatrix(CertificateVersion), // Version -> CompatibilityMatrix
    UpgradeRules,             // Global upgrade rules
    UpgradeCount,             // Total number of upgrades
    PendingUpgrades(Address), // Address -> Vec<UpgradeID> (upgrades pending approval)
    // Freeze-related storage
    FrozenCertificate(String), // Certificate ID -> FrozenCertificateInfo
    FreezeHistory(String),    // Certificate ID -> Vec<FreezeEvent>
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SingleVerificationResult {
    pub id: String,
    pub exists: bool,
    pub revoked: bool,
    pub message: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BatchVerificationResult {
    pub results: Vec<SingleVerificationResult>,
    pub total: u32,
    pub successful: u32,
    pub failed: u32,
    pub total_cost: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerkleProof {
    pub leaf: BytesN<32>,
    pub siblings: Vec<BytesN<32>>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerkleVerificationResult {
    pub leaf: BytesN<32>,
    pub is_valid: bool,
}

#[contract]
pub struct CertificateContract;

impl CertificateVersion {
    /// Compare two versions
    pub fn compare(&self, other: &CertificateVersion) -> i32 {
        if self.major != other.major {
            return self.major as i32 - other.major as i32;
        }
        if self.minor != other.minor {
            return self.minor as i32 - other.minor as i32;
        }
        if self.patch != other.patch {
            return self.patch as i32 - other.patch as i32;
        }
        0 // Versions are equal
    }
    
    /// Check if this version is greater than another
    pub fn is_greater_than(&self, other: &CertificateVersion) -> bool {
        self.compare(other) > 0
    }
    
    /// Check if this version is less than another
    pub fn is_less_than(&self, other: &CertificateVersion) -> bool {
        self.compare(other) < 0
    }
    
    /// Check if this version is equal to another
    pub fn is_equal(&self, other: &CertificateVersion) -> bool {
        self.compare(other) == 0
    }
    
    /// Get version as string (e.g., "1.2.3")
    pub fn to_string(&self, env: &Env) -> String {
        let mut version_str = String::from_str(env, &format!("{}.{}.", self.major, self.minor));
        version_str.push_str(&self.patch.to_string());
        if let Some(build) = &self.build {
            version_str.push_str(&format!("-{}", build));
        }
        version_str
    }
}

impl CertificateContract {
    /// Validate upgrade path
    fn validate_upgrade_path(
        env: &Env,
        from_version: &CertificateVersion,
        to_version: &CertificateVersion,
        upgrade_rules: &Vec<UpgradeRule>,
    ) -> Result<Option<UpgradeRule>, CertificateError> {
        // Check if it's actually an upgrade (to_version > from_version)
        if !to_version.is_greater_than(from_version) {
            return Err(CertificateError::VersionConflict);
        }
        
        // Check specific upgrade rules
        for rule in upgrade_rules.iter() {
            if rule.from_version.is_equal(from_version) && rule.to_version.is_equal(to_version) {
                if !rule.allowed {
                    return Err(CertificateError::UpgradeNotAllowed);
                }
                return Ok(Some(rule.clone()));
            }
        }
        
        // Default validation: major version changes require explicit rules
        if to_version.major > from_version.major {
            return Err(CertificateError::UpgradePathInvalid);
        }
        
        // Minor and patch upgrades are allowed by default
        Ok(None)
    }
    
    /// Check version compatibility
    fn check_compatibility(
        env: &Env,
        version: &CertificateVersion,
        target_version: &CertificateVersion,
    ) -> Result<bool, CertificateError> {
        let compatibility_key = DataKey::CompatibilityMatrix(version.clone());
        if let Some(matrix) = env.storage().instance().get::<DataKey, CompatibilityMatrix>(&compatibility_key) {
            // Check if target version is in compatible list
            for compatible_version in matrix.compatible_versions.iter() {
                if compatible_version.is_equal(target_version) {
                    return Ok(true);
                }
            }
            return Ok(false);
        }
        
        // Default compatibility: same major version is compatible
        Ok(version.major == target_version.major)
    }
    
    /// Archive a certificate version
    fn archive_certificate_version(
        env: &mut Env,
        certificate_id: String,
        version: CertificateVersion,
        archiver: Address,
        reason: String,
    ) -> Result<(), CertificateError> {
        // Get the certificate to archive
        let cert_key = DataKey::Certificate(certificate_id.clone());
        let certificate: Certificate = env
            .storage()
            .instance()
            .get(&cert_key)
            .ok_or(CertificateError::NotFound)?;
        
        // Verify version matches
        if !certificate.version.is_equal(&version) {
            return Err(CertificateError::VersionConflict);
        }
        
        // Serialize certificate data (simplified representation)
        let original_data = certificate.metadata_uri; // Using metadata as data representation
        
        // Create archived certificate
        let archived = ArchivedCertificate {
            certificate_id: certificate_id.clone(),
            version: version.clone(),
            archived_at: env.ledger().timestamp(),
            archived_by: archiver,
            original_data,
            reason: String::from_str(env, &reason),
        };
        
        // Store archived certificate
        let archive_key = DataKey::ArchivedCertificate(certificate_id.clone(), version);
        env.storage().instance().set(&archive_key, &archived);
        
        // Add to version chain
        let chain_key = DataKey::VersionChain(certificate_id);
        let mut version_chain: Vec<CertificateVersion> = env
            .storage()
            .instance()
            .get(&chain_key)
            .unwrap_or(Vec::new(env));
        version_chain.push_back(version.clone());
        env.storage().instance().set(&chain_key, &version_chain);
        
        // Emit archived event
        env.events().publish(
            (symbol_short!("cert_archive"),),
            CertificateArchivedEvent {
                certificate_id: archived.certificate_id,
                version: archived.version,
                archived_by: archived.archived_by,
                archived_at: archived.archived_at,
                reason: archived.reason,
            },
        );
        
        Ok(())
    }
}

#[contractimpl]
impl CertificateContract {
    pub fn issue_certificate(
        env: Env,
        id: String,
        issuer: Address,
        owner: Address,
        metadata_uri: String,
    ) {
        issuer.require_auth();

        if env.storage().instance().has(&id) {
            panic!("Certificate already exists");
        }

        let cert = Certificate {
            id: id.clone(),
            issuer,
            owner,
            metadata_uri,
            issued_at: env.ledger().timestamp(),
            revoked: false,
            revocation_reason: None,
            revoked_at: None,
            revoked_by: None,
            // Initialize upgrade fields
            version: CertificateVersion {
                major: 1,
                minor: 0,
                patch: 0,
                build: None,
            },
            parent_certificate_id: None,
            child_certificate_id: None,
            is_upgradable: false,
            upgrade_rules: Vec::new(&env),
            compatibility_matrix: CompatibilityMatrix {
                version: CertificateVersion {
                    major: 1,
                    minor: 0,
                    patch: 0,
                    build: None,
                },
                compatible_versions: Vec::new(&env),
                backward_compatible: true,
                forward_compatible: true,
            },
            // Initialize freeze fields
            frozen: false,
            freeze_info: None,
        };

        env.storage().instance().set(&id, &cert);
    }

    pub fn revoke_certificate(env: Env, id: String, reason: String) {
        let mut cert: Certificate = env
            .storage()
            .instance()
            .get(&id)
            .expect("Certificate not found");

        cert.issuer.require_auth();

        if cert.revoked {
            panic!("Certificate already revoked");
        }

        cert.revoked = true;
        cert.revocation_reason = Some(reason);
        cert.revoked_at = Some(env.ledger().timestamp());
        cert.revoked_by = Some(cert.issuer.clone());

        env.storage().instance().set(&id, &cert);
    }

    /// Freeze a certificate temporarily during a dispute
    /// 
    /// # Arguments
    /// * `id` - Certificate ID to freeze
    /// * `admin` - Admin address that has authority to freeze
    /// * `reason` - Reason for freezing the certificate
    /// * `duration_days` - Number of days to freeze (0 for permanent freeze, max 90 days)
    /// 
    /// # Returns
    /// * `CertificateFrozenEvent` - Event emitted when certificate is frozen
    pub fn freeze_certificate(
        env: Env,
        id: String,
        admin: Address,
        reason: String,
        duration_days: u32,
    ) -> CertificateFrozenEvent {
        admin.require_auth();

        let mut cert: Certificate = env
            .storage()
            .instance()
            .get(&id)
            .expect("Certificate not found");

        // Check if already frozen
        if cert.frozen {
            panic!("Certificate is already frozen");
        }

        // Check if certificate is revoked
        if cert.revoked {
            panic!("Cannot freeze a revoked certificate");
        }

        // Validate duration
        if duration_days > 90 {
            panic!("Freeze duration cannot exceed 90 days");
        }

        let current_time = env.ledger().timestamp();
        let unfreeze_at = if duration_days > 0 {
            // Calculate unfreeze time (duration_days * 24 * 60 * 60 seconds)
            Some(current_time + (duration_days as u64) * 24 * 60 * 60)
        } else {
            // Permanent freeze
            None
        };

        let is_permanent = duration_days == 0;

        // Create freeze info
        let freeze_info = FrozenCertificateInfo {
            certificate_id: id.clone(),
            frozen_at: current_time,
            unfreeze_at,
            frozen_by: admin.clone(),
            reason: reason.clone(),
            is_permanent,
        };

        // Update certificate
        cert.frozen = true;
        cert.freeze_info = Some(freeze_info.clone());

        env.storage().instance().set(&id, &cert);

        // Store freeze info in separate key for history
        let freeze_key = DataKey::FrozenCertificate(id.clone());
        env.storage().instance().set(&freeze_key, &freeze_info);

        // Emit event
        let event = CertificateFrozenEvent {
            certificate_id: id.clone(),
            frozen_by: admin,
            frozen_at: current_time,
            unfreeze_at,
            reason,
            is_permanent,
        };

        env.events().publish(
            (symbol_short!("CertFrz"),),
            event.clone(),
        );

        event
    }

    /// Unfreeze a certificate
    /// 
    /// # Arguments
    /// * `id` - Certificate ID to unfreeze
    /// * `admin` - Admin address that has authority to unfreeze
    /// * `reason` - Reason for unfreezing
    /// 
    /// # Returns
    /// * `CertificateUnfrozenEvent` - Event emitted when certificate is unfrozen
    pub fn unfreeze_certificate(
        env: Env,
        id: String,
        admin: Address,
        reason: String,
    ) -> CertificateUnfrozenEvent {
        admin.require_auth();

        let mut cert: Certificate = env
            .storage()
            .instance()
            .get(&id)
            .expect("Certificate not found");

        // Check if frozen
        if !cert.frozen {
            panic!("Certificate is not frozen");
        }

        let current_time = env.ledger().timestamp();
        let was_auto_unfreeze = false;

        // Update certificate
        cert.frozen = false;
        cert.freeze_info = None;

        env.storage().instance().set(&id, &cert);

        // Remove freeze info from storage
        let freeze_key = DataKey::FrozenCertificate(id.clone());
        env.storage().instance().remove(&freeze_key);

        // Emit event
        let event = CertificateUnfrozenEvent {
            certificate_id: id.clone(),
            unfrozen_by: admin,
            unfrozen_at: current_time,
            reason,
            was_auto_unfreeze,
        };

        env.events().publish(
            (symbol_short!("CertUnfrz"),),
            event.clone(),
        );

        event
    }

    /// Check if a certificate is frozen and should be auto-unfrozen
    /// This function can be called periodically to auto-unfreeze expired freezes
    /// 
    /// # Returns
    /// * `u32` - Number of certificates that were auto-unfrozen
    pub fn process_auto_unfreeze(env: Env) -> u32 {
        // This would require iterating through all certificates
        // For efficiency, in production you'd maintain a separate index of frozen certificates
        // For now, return 0 as this requires more complex storage management
        0
    }

    /// Check if a certificate is currently frozen
    pub fn is_frozen(env: Env, id: String) -> bool {
        let cert: Certificate = env
            .storage()
            .instance()
            .get(&id)
            .expect("Certificate not found");
        cert.frozen
    }

    /// Get freeze information for a certificate
    pub fn get_freeze_info(env: Env, id: String) -> Option<FrozenCertificateInfo> {
        let cert: Certificate = env
            .storage()
            .instance()
            .get(&id)
            .expect("Certificate not found");
        cert.freeze_info
    }

    /// Override unfreeze - allows admin to unfreeze even before the freeze period ends
    /// This is useful for resolving disputes quickly
    pub fn admin_override_unfreeze(
        env: Env,
        id: String,
        admin: Address,
        reason: String,
    ) -> CertificateUnfrozenEvent {
        admin.require_auth();

        let mut cert: Certificate = env
            .storage()
            .instance()
            .get(&id)
            .expect("Certificate not found");

        // Check if frozen
        if !cert.frozen {
            panic!("Certificate is not frozen");
        }

        let current_time = env.ledger().timestamp();
        let was_auto_unfreeze = false;

        // Update certificate
        cert.frozen = false;
        cert.freeze_info = None;

        env.storage().instance().set(&id, &cert);

        // Remove freeze info from storage
        let freeze_key = DataKey::FrozenCertificate(id.clone());
        env.storage().instance().remove(&freeze_key);

        // Emit override event (reusing the unfrozen event with was_auto_unfreeze = false)
        let event = CertificateUnfrozenEvent {
            certificate_id: id.clone(),
            unfrozen_by: admin,
            unfrozen_at: current_time,
            reason,
            was_auto_unfreeze,
        };

        env.events().publish(
            (symbol_short!("CertUnfrz"),),
            event.clone(),
        );

        event
    }

    pub fn is_revoked(env: Env, id: String) -> bool {
        let cert: Certificate = env
            .storage()
            .instance()
            .get(&id)
            .expect("Certificate not found");
        cert.revoked
    }

    pub fn get_certificate(env: Env, id: String) -> Certificate {
        env.storage()
            .instance()
            .get(&id)
            .expect("Certificate not found")
    }

    pub fn batch_verify_certificates(env: Env, ids: Vec<String>) -> BatchVerificationResult {
        let count = ids.len();
        if count == 0 {
            let empty_results: Vec<SingleVerificationResult> = Vec::new(&env);
            return BatchVerificationResult {
                results: empty_results,
                total: 0,
                successful: 0,
                failed: 0,
                total_cost: 0,
            };
        }

        if count > MAX_BATCH_SIZE {
            panic!("Batch size exceeds maximum supported certificates");
        }

        let mut results: Vec<SingleVerificationResult> = Vec::new(&env);
        let mut successful: u32 = 0;
        let mut failed: u32 = 0;

        for i in 0..count {
            let id = ids.get(i).unwrap();

            let exists = env.storage().instance().has(&id);

            if !exists {
                let result = SingleVerificationResult {
                    id,
                    exists: false,
                    revoked: false,
                    message: String::from_str(&env, "Certificate not found"),
                };
                failed += 1;
                results.push_back(result);
                continue;
            }

            let cert: Certificate = env
                .storage()
                .instance()
                .get(&id)
                .expect("Certificate should exist");
            let revoked = cert.revoked;

            if revoked {
                let result = SingleVerificationResult {
                    id,
                    exists: true,
                    revoked: true,
                    message: String::from_str(&env, "Certificate is revoked"),
                };
                failed += 1;
                results.push_back(result);
            } else {
                let result = SingleVerificationResult {
                    id,
                    exists: true,
                    revoked: false,
                    message: String::from_str(&env, "Certificate is valid"),
                };
                successful += 1;
                results.push_back(result);
            }
        }

        let total_cost =
            BASE_VERIFICATION_COST + (COST_PER_CERTIFICATE * (count as u64));

        BatchVerificationResult {
            results,
            total: count,
            successful,
            failed,
            total_cost,
        }
    }

    pub fn verify_merkle_batch(
        env: Env,
        root: BytesN<32>,
        proofs: Vec<MerkleProof>,
    ) -> Vec<MerkleVerificationResult> {
        let count = proofs.len();

        if count == 0 {
            return Vec::new(&env);
        }

        if count > MAX_BATCH_SIZE {
            panic!("Batch size exceeds maximum supported proofs");
        }

        let mut results: Vec<MerkleVerificationResult> = Vec::new(&env);

        for i in 0..count {
            let proof = proofs.get(i).unwrap();
            let is_valid = Self::verify_single_merkle_proof(
                &env,
                &root,
                &proof.leaf,
                &proof.siblings,
            );

            let result = MerkleVerificationResult {
                leaf: proof.leaf.clone(),
                is_valid,
            };
            results.push_back(result);
        }

        results
    }

    fn verify_single_merkle_proof(
        env: &Env,
        root: &BytesN<32>,
        leaf: &BytesN<32>,
        siblings: &Vec<BytesN<32>>,
    ) -> bool {
        let mut hash = leaf.clone();
        let count = siblings.len();

        for i in 0..count {
            let sibling = siblings.get(i).unwrap();
            let mut data = Bytes::new(env);
            data.append(&hash);
            data.append(&sibling);
            hash = env.crypto().sha256(&data);
        }

        hash == *root
    }

    // Request a certificate upgrade
    pub fn request_upgrade(
        env: Env,
        upgrade_id: String,
        certificate_id: String,
        to_version: CertificateVersion,
        requester: Address,
        migration_data: Option<String>,
        notes: Option<String>,
    ) -> Result<(), CertificateError> {
        // Authenticate requester
        requester.require_auth();
        
        // Check if upgrade request already exists
        let upgrade_key = DataKey::UpgradeRequest(upgrade_id.clone());
        if env.storage().instance().has(&upgrade_key) {
            return Err(CertificateError::UpgradeAlreadyExists);
        }
        
        // Get the certificate
        let certificate: Certificate = env
            .storage()
            .instance()
            .get(&certificate_id)
            .ok_or(CertificateError::NotFound)?;
        
        // Check if certificate is revoked
        if certificate.revoked {
            return Err(CertificateError::AlreadyRevoked);
        }
        
        // Check if certificate is upgradable
        if !certificate.is_upgradable {
            return Err(CertificateError::CertificateNotUpgradable);
        }
        
        // Check if there's already an upgrade in progress
        let history_key = DataKey::UpgradeHistory(certificate_id.clone());
        let upgrade_history: Vec<UpgradeRequest> = env
            .storage()
            .instance()
            .get(&history_key)
            .unwrap_or(Vec::new(&env));
        
        for upgrade in upgrade_history.iter() {
            if upgrade.status == UpgradeStatus::Pending 
                || upgrade.status == UpgradeStatus::Approved 
                || upgrade.status == UpgradeStatus::InProgress {
                return Err(CertificateError::UpgradeInProgress);
            }
        }
        
        // Validate upgrade path
        let upgrade_rule = Self::validate_upgrade_path(
            &env,
            &certificate.version,
            &to_version,
            &certificate.upgrade_rules,
        )?;
        
        // Check if issuer approval is required
        let requires_approval = if let Some(rule) = upgrade_rule {
            rule.requires_issuer_approval
        } else {
            // Default: major version changes require issuer approval
            to_version.major > certificate.version.major
        };
        
        // Create upgrade request
        let upgrade_request = UpgradeRequest {
            id: upgrade_id.clone(),
            certificate_id: certificate_id.clone(),
            from_version: certificate.version.clone(),
            to_version: to_version.clone(),
            requested_by: requester.clone(),
            approved_by: if requires_approval { None } else { Some(requester.clone()) },
            requested_at: env.ledger().timestamp(),
            approved_at: if requires_approval { None } else { Some(env.ledger().timestamp()) },
            completed_at: None,
            status: if requires_approval { UpgradeStatus::Pending } else { UpgradeStatus::Approved },
            migration_data,
            notes,
        };
        
        // Store upgrade request
        env.storage().instance().set(&upgrade_key, &upgrade_request);
        
        // Add to upgrade history
        let mut history = upgrade_history;
        history.push_back(upgrade_request.clone());
        env.storage().instance().set(&history_key, &history);
        
        // If approval required, add to issuer's pending upgrades
        if requires_approval {
            let pending_key = DataKey::PendingUpgrades(certificate.issuer.clone());
            let mut pending_upgrades: Vec<String> = env
                .storage()
                .instance()
                .get(&pending_key)
                .unwrap_or(Vec::new(&env));
            pending_upgrades.push_back(upgrade_id.clone());
            env.storage().instance().set(&pending_key, &pending_upgrades);
        }
        
        // Update upgrade count
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::UpgradeCount)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::UpgradeCount, &(count + 1));
        
        // Emit upgrade requested event
        env.events().publish(
            (symbol_short!("upgrade_request"),),
            UpgradeRequestedEvent {
                upgrade_id: upgrade_id.clone(),
                certificate_id,
                from_version: upgrade_request.from_version,
                to_version: upgrade_request.to_version,
                requested_by: requester,
                requested_at: upgrade_request.requested_at,
            },
        );
        
        // If auto-approved, emit approval event
        if !requires_approval {
            env.events().publish(
                (symbol_short!("upgrade_approve"),),
                UpgradeApprovedEvent {
                    upgrade_id,
                    approved_by: requester,
                    approved_at: upgrade_request.approved_at.unwrap(),
                },
            );
        }
        
        Ok(())
    }

    // Initiates a certificate transfer
    pub fn initiate_transfer(
        env: Env,
        transfer_id: String,
        certificate_id: String,
        from_address: Address,
        to_address: Address,
        require_revocation: bool,
        transfer_fee: u64,
        memo: Option<String>,
    ) -> Result<(), CertificateError> {
        // Authenticate the current owner
        from_address.require_auth();
        
        // Check if transfer already exists
        let transfer_key = DataKey::TransferRequest(transfer_id.clone());
        if env.storage().instance().has(&transfer_key) {
            return Err(CertificateError::AlreadyExists);
        }
        
        // Get the certificate
        let mut cert: Certificate = env.storage().instance().get(&certificate_id).ok_or(CertificateError::NotFound)?;
        
        // Verify the sender is the current owner
        if cert.owner != from_address {
            return Err(CertificateError::Unauthorized);
        }
        
        // Check if certificate is revoked
        if cert.revoked {
            return Err(CertificateError::AlreadyRevoked);
        }
        
        // Check if recipient is different from sender
        if from_address == to_address {
            return Err(CertificateError::InvalidData);
        }
        
        // Create transfer request
        let transfer = TransferRequest {
            id: transfer_id.clone(),
            certificate_id: certificate_id.clone(),
            from_address: from_address.clone(),
            to_address: to_address.clone(),
            initiated_at: env.ledger().timestamp(),
            accepted_at: None,
            completed_at: None,
            status: TransferStatus::Pending,
            require_revocation,
            transfer_fee,
            memo,
        };
        
        // Store the transfer request
        env.storage().instance().set(&transfer_key, &transfer);
        
        // Add to recipient's pending transfers
        let pending_key = DataKey::PendingTransfers(to_address.clone());
        let mut pending_transfers: Vec<String> = env
            .storage()
            .instance()
            .get(&pending_key)
            .unwrap_or(Vec::new(&env));
        pending_transfers.push_back(transfer_id.clone());
        env.storage().instance().set(&pending_key, &pending_transfers);
        
        // Update transfer count
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TransferCount)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::TransferCount, &(count + 1));
        
        // Emit transfer initiated event
        env.events().publish(
            (symbol_short!("transfer_init"),),
            TransferInitiatedEvent {
                transfer_id: transfer_id.clone(),
                certificate_id,
                from_address,
                to_address,
                initiated_at: transfer.initiated_at,
                transfer_fee,
            },
        );
        
        Ok(())
    }

    // Approve a certificate upgrade
    pub fn approve_upgrade(
        env: Env,
        upgrade_id: String,
        approver: Address,
    ) -> Result<(), CertificateError> {
        // Authenticate approver
        approver.require_auth();
        
        // Get the upgrade request
        let upgrade_key = DataKey::UpgradeRequest(upgrade_id.clone());
        let mut upgrade_request: UpgradeRequest = env
            .storage()
            .instance()
            .get(&upgrade_key)
            .ok_or(CertificateError::NotFound)?;
        
        // Check if upgrade is pending approval
        if upgrade_request.status != UpgradeStatus::Pending {
            return Err(CertificateError::UpgradeNotApproved);
        }
        
        // Get the certificate
        let certificate: Certificate = env
            .storage()
            .instance()
            .get(&upgrade_request.certificate_id)
            .ok_or(CertificateError::NotFound)?;
        
        // Verify approver is authorized (issuer)
        if approver != certificate.issuer {
            return Err(CertificateError::Unauthorized);
        }
        
        // Update upgrade request
        upgrade_request.status = UpgradeStatus::Approved;
        upgrade_request.approved_by = Some(approver.clone());
        upgrade_request.approved_at = Some(env.ledger().timestamp());
        env.storage().instance().set(&upgrade_key, &upgrade_request);
        
        // Remove from pending upgrades
        let pending_key = DataKey::PendingUpgrades(approver);
        let mut pending_upgrades: Vec<String> = env
            .storage()
            .instance()
            .get(&pending_key)
            .unwrap_or(Vec::new(&env));
        
        let mut new_pending = Vec::new(&env);
        for pending_id in pending_upgrades.iter() {
            if pending_id != &upgrade_id {
                new_pending.push_back(pending_id.clone());
            }
        }
        env.storage().instance().set(&pending_key, &new_pending);
        
        // Emit upgrade approved event
        env.events().publish(
            (symbol_short!("upgrade_approve"),),
            UpgradeApprovedEvent {
                upgrade_id,
                approved_by: approver,
                approved_at: upgrade_request.approved_at.unwrap(),
            },
        );
        
        Ok(())
    }

    // Execute a certificate upgrade
    pub fn execute_upgrade(
        env: Env,
        upgrade_id: String,
        executor: Address,
    ) -> Result<String, CertificateError> {
        // Authenticate executor
        executor.require_auth();
        
        // Get the upgrade request
        let upgrade_key = DataKey::UpgradeRequest(upgrade_id.clone());
        let mut upgrade_request: UpgradeRequest = env
            .storage()
            .instance()
            .get(&upgrade_key)
            .ok_or(CertificateError::NotFound)?;
        
        // Check if upgrade is approved
        if upgrade_request.status != UpgradeStatus::Approved {
            return Err(CertificateError::UpgradeNotApproved);
        }
        
        // Get the certificate
        let mut certificate: Certificate = env
            .storage()
            .instance()
            .get(&upgrade_request.certificate_id)
            .ok_or(CertificateError::NotFound)?;
        
        // Verify executor is authorized (owner or issuer)
        if executor != certificate.owner && executor != certificate.issuer {
            return Err(CertificateError::Unauthorized);
        }
        
        // Check version compatibility
        if !Self::check_compatibility(
            &env,
            &certificate.version,
            &upgrade_request.to_version,
        )? {
            return Err(CertificateError::IncompatibleVersions);
        }
        
        // Update upgrade request status
        upgrade_request.status = UpgradeStatus::InProgress;
        env.storage().instance().set(&upgrade_key, &upgrade_request);
        
        // Archive the current version
        Self::archive_certificate_version(
            &mut env,
            certificate.id.clone(),
            certificate.version.clone(),
            executor.clone(),
            String::from_str(&env, "Upgraded to newer version"),
        )?;
        
        // Create new certificate with upgraded version
        let new_certificate_id = String::from_str(&env, &format!("{}_v{}", certificate.id, 
            upgrade_request.to_version.to_string(&env)));
        
        let new_certificate = Certificate {
            id: new_certificate_id.clone(),
            issuer: certificate.issuer.clone(),
            owner: certificate.owner.clone(),
            metadata_uri: certificate.metadata_uri.clone(),
            issued_at: env.ledger().timestamp(),
            revoked: false,
            revocation_reason: None,
            revoked_at: None,
            revoked_by: None,
            version: upgrade_request.to_version.clone(),
            parent_certificate_id: Some(certificate.id.clone()),
            child_certificate_id: None,
            is_upgradable: certificate.is_upgradable,
            upgrade_rules: certificate.upgrade_rules.clone(),
            compatibility_matrix: certificate.compatibility_matrix.clone(),
        };
        
        // Store new certificate
        let new_cert_key = DataKey::Certificate(new_certificate_id.clone());
        env.storage().instance().set(&new_cert_key, &new_certificate);
        
        // Update parent certificate's child reference
        certificate.child_certificate_id = Some(new_certificate_id.clone());
        let old_cert_key = DataKey::Certificate(certificate.id.clone());
        env.storage().instance().set(&old_cert_key, &certificate);
        
        // Complete upgrade request
        upgrade_request.status = UpgradeStatus::Completed;
        upgrade_request.completed_at = Some(env.ledger().timestamp());
        env.storage().instance().set(&upgrade_key, &upgrade_request);
        
        // Emit upgrade completed event
        env.events().publish(
            (symbol_short!("upgrade_complete"),),
            UpgradeCompletedEvent {
                upgrade_id: upgrade_id.clone(),
                certificate_id: certificate.id,
                from_version: upgrade_request.from_version,
                to_version: upgrade_request.to_version,
                completed_at: upgrade_request.completed_at.unwrap(),
                new_certificate_id: new_certificate_id.clone(),
            },
        );
        
        // Emit certificate upgraded event
        env.events().publish(
            (symbol_short!("cert_upgrade"),),
            CertificateUpgradedEvent {
                certificate_id: new_certificate_id.clone(),
                from_version: upgrade_request.from_version,
                to_version: upgrade_request.to_version,
                upgraded_by: executor,
                upgraded_at: upgrade_request.completed_at.unwrap(),
                parent_certificate_id: Some(certificate.id),
            },
        );
        
        Ok(new_certificate_id)
    }

    // Accepts a certificate transfer
    pub fn accept_transfer(
        env: Env,
        transfer_id: String,
        recipient: Address,
    ) -> Result<(), CertificateError> {
        // Authenticate the recipient
        recipient.require_auth();
        
        // Get the transfer request
        let transfer_key = DataKey::TransferRequest(transfer_id.clone());
        let mut transfer: TransferRequest = env
            .storage()
            .instance()
            .get(&transfer_key)
            .ok_or(CertificateError::TransferNotFound)?;
        
        // Verify the recipient is the intended recipient
        if transfer.to_address != recipient {
            return Err(CertificateError::Unauthorized);
        }
        
        // Check if transfer is still pending
        if transfer.status != TransferStatus::Pending {
            return Err(CertificateError::TransferNotPending);
        }
        
        // Update transfer status
        transfer.status = TransferStatus::Accepted;
        transfer.accepted_at = Some(env.ledger().timestamp());
        env.storage().instance().set(&transfer_key, &transfer);
        
        // Remove from pending transfers
        let pending_key = DataKey::PendingTransfers(recipient.clone());
        let mut pending_transfers: Vec<String> = env
            .storage()
            .instance()
            .get(&pending_key)
            .unwrap_or(Vec::new(&env));
        
        // Remove this transfer from pending list
        let mut new_pending = Vec::new(&env);
        for pending_id in pending_transfers.iter() {
            if pending_id != &transfer_id {
                new_pending.push_back(pending_id.clone());
            }
        }
        env.storage().instance().set(&pending_key, &new_pending);
        
        // Emit transfer accepted event
        env.events().publish(
            (symbol_short!("transfer_accept"),),
            TransferAcceptedEvent {
                transfer_id: transfer_id.clone(),
                accepted_at: transfer.accepted_at.unwrap(),
            },
        );
        
        Ok(())
    }

    // Completes a certificate transfer (called after acceptance)
    pub fn complete_transfer(
        env: Env,
        transfer_id: String,
        executor: Address,
    ) -> Result<(), CertificateError> {
        // Authenticate the executor (can be sender, recipient, or admin)
        executor.require_auth();
        
        // Get the transfer request
        let transfer_key = DataKey::TransferRequest(transfer_id.clone());
        let mut transfer: TransferRequest = env
            .storage()
            .instance()
            .get(&transfer_key)
            .ok_or(CertificateError::TransferNotFound)?;
        
        // Check if transfer is accepted
        if transfer.status != TransferStatus::Accepted {
            return Err(CertificateError::InvalidTransferStatus);
        }
        
        // Get the certificate
        let mut cert: Certificate = env
            .storage()
            .instance()
            .get(&transfer.certificate_id)
            .ok_or(CertificateError::NotFound)?;
        
        // Verify authorization (sender, recipient, or issuer can complete)
        if executor != transfer.from_address 
            && executor != transfer.to_address 
            && executor != cert.issuer {
            return Err(CertificateError::Unauthorized);
        }
        
        // Revoke certificate if required
        if transfer.require_revocation {
            cert.revoked = true;
            cert.revocation_reason = Some(String::from_str(&env, "Transferred to new owner"));
            cert.revoked_at = Some(env.ledger().timestamp());
            cert.revoked_by = Some(transfer.from_address.clone());
            env.storage().instance().set(&transfer.certificate_id, &cert);
        }
        
        // Update certificate owner
        cert.owner = transfer.to_address.clone();
        env.storage().instance().set(&transfer.certificate_id, &cert);
        
        // Update transfer status to completed
        transfer.status = TransferStatus::Completed;
        transfer.completed_at = Some(env.ledger().timestamp());
        env.storage().instance().set(&transfer_key, &transfer);
        
        // Add to transfer history
        let history_key = DataKey::TransferHistory(transfer.certificate_id.clone());
        let mut history: Vec<TransferHistory> = env
            .storage()
            .instance()
            .get(&history_key)
            .unwrap_or(Vec::new(&env));
        
        let transfer_history = TransferHistory {
            transfer_id: transfer_id.clone(),
            certificate_id: transfer.certificate_id.clone(),
            from_address: transfer.from_address.clone(),
            to_address: transfer.to_address.clone(),
            transferred_at: transfer.completed_at.unwrap(),
            transfer_fee: transfer.transfer_fee,
            memo: transfer.memo.clone(),
        };
        
        history.push_back(transfer_history);
        env.storage().instance().set(&history_key, &history);
        
        // Emit transfer completed event
        env.events().publish(
            (symbol_short!("transfer_complete"),),
            TransferCompletedEvent {
                transfer_id: transfer_id.clone(),
                certificate_id: transfer.certificate_id,
                from_address: transfer.from_address,
                to_address: transfer.to_address,
                completed_at: transfer.completed_at.unwrap(),
                transfer_fee: transfer.transfer_fee,
            },
        );
        
        Ok(())
    }

    // Rejects a certificate transfer
    pub fn reject_transfer(
        env: Env,
        transfer_id: String,
        recipient: Address,
    ) -> Result<(), CertificateError> {
        // Authenticate the recipient
        recipient.require_auth();
        
        // Get the transfer request
        let transfer_key = DataKey::TransferRequest(transfer_id.clone());
        let mut transfer: TransferRequest = env
            .storage()
            .instance()
            .get(&transfer_key)
            .ok_or(CertificateError::TransferNotFound)?;
        
        // Verify the recipient is the intended recipient
        if transfer.to_address != recipient {
            return Err(CertificateError::Unauthorized);
        }
        
        // Check if transfer is still pending
        if transfer.status != TransferStatus::Pending {
            return Err(CertificateError::TransferNotPending);
        }
        
        // Update transfer status
        transfer.status = TransferStatus::Rejected;
        env.storage().instance().set(&transfer_key, &transfer);
        
        // Remove from pending transfers
        let pending_key = DataKey::PendingTransfers(recipient);
        let mut pending_transfers: Vec<String> = env
            .storage()
            .instance()
            .get(&pending_key)
            .unwrap_or(Vec::new(&env));
        
        let mut new_pending = Vec::new(&env);
        for pending_id in pending_transfers.iter() {
            if pending_id != &transfer_id {
                new_pending.push_back(pending_id.clone());
            }
        }
        env.storage().instance().set(&pending_key, &new_pending);
        
        // Emit transfer rejected event
        env.events().publish(
            (symbol_short!("transfer_reject"),),
            TransferRejectedEvent {
                transfer_id,
                rejected_at: env.ledger().timestamp(),
            },
        );
        
        Ok(())
    }

    // Cancels a certificate transfer
    pub fn cancel_transfer(
        env: Env,
        transfer_id: String,
        sender: Address,
    ) -> Result<(), CertificateError> {
        // Authenticate the sender
        sender.require_auth();
        
        // Get the transfer request
        let transfer_key = DataKey::TransferRequest(transfer_id.clone());
        let mut transfer: TransferRequest = env
            .storage()
            .instance()
            .get(&transfer_key)
            .ok_or(CertificateError::TransferNotFound)?;
        
        // Verify the sender is the one who initiated the transfer
        if transfer.from_address != sender {
            return Err(CertificateError::Unauthorized);
        }
        
        // Check if transfer is still pending
        if transfer.status != TransferStatus::Pending {
            return Err(CertificateError::TransferNotPending);
        }
        
        // Update transfer status
        transfer.status = TransferStatus::Cancelled;
        env.storage().instance().set(&transfer_key, &transfer);
        
        // Remove from pending transfers
        let pending_key = DataKey::PendingTransfers(transfer.to_address);
        let mut pending_transfers: Vec<String> = env
            .storage()
            .instance()
            .get(&pending_key)
            .unwrap_or(Vec::new(&env));
        
        let mut new_pending = Vec::new(&env);
        for pending_id in pending_transfers.iter() {
            if pending_id != &transfer_id {
                new_pending.push_back(pending_id.clone());
            }
        }
        env.storage().instance().set(&pending_key, &new_pending);
        
        // Emit transfer cancelled event
        env.events().publish(
            (symbol_short!("transfer_cancel"),),
            TransferCancelledEvent {
                transfer_id,
                cancelled_at: env.ledger().timestamp(),
            },
        );
        
        Ok(())
    }

    // Query functions
    
    // Get a transfer request by ID
    pub fn get_transfer(env: Env, transfer_id: String) -> Result<TransferRequest, CertificateError> {
        let transfer_key = DataKey::TransferRequest(transfer_id);
        env.storage()
            .instance()
            .get(&transfer_key)
            .ok_or(CertificateError::TransferNotFound)
    }

    // Get pending transfers for an address
    pub fn get_pending_transfers(env: Env, address: Address) -> Vec<String> {
        let pending_key = DataKey::PendingTransfers(address);
        env.storage()
            .instance()
            .get(&pending_key)
            .unwrap_or(Vec::new(&env))
    }

    // Get transfer history for a certificate
    pub fn get_transfer_history(env: Env, certificate_id: String) -> Vec<TransferHistory> {
        let history_key = DataKey::TransferHistory(certificate_id);
        env.storage()
            .instance()
            .get(&history_key)
            .unwrap_or(Vec::new(&env))
    }

    // Get total number of transfers
    pub fn get_transfer_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TransferCount)
            .unwrap_or(0)
    }

    // Query functions for upgrades
    
    // Get an upgrade request by ID
    pub fn get_upgrade_request(env: Env, upgrade_id: String) -> Result<UpgradeRequest, CertificateError> {
        let upgrade_key = DataKey::UpgradeRequest(upgrade_id);
        env.storage()
            .instance()
            .get(&upgrade_key)
            .ok_or(CertificateError::NotFound)
    }

    // Get upgrade history for a certificate
    pub fn get_upgrade_history(env: Env, certificate_id: String) -> Vec<UpgradeRequest> {
        let history_key = DataKey::UpgradeHistory(certificate_id);
        env.storage()
            .instance()
            .get(&history_key)
            .unwrap_or(Vec::new(&env))
    }

    // Get pending upgrades for an issuer
    pub fn get_pending_upgrades(env: Env, issuer: Address) -> Vec<String> {
        let pending_key = DataKey::PendingUpgrades(issuer);
        env.storage()
            .instance()
            .get(&pending_key)
            .unwrap_or(Vec::new(&env))
    }

    // Get archived certificate version
    pub fn get_archived_certificate(
        env: Env,
        certificate_id: String,
        version: CertificateVersion,
    ) -> Result<ArchivedCertificate, CertificateError> {
        let archive_key = DataKey::ArchivedCertificate(certificate_id, version);
        env.storage()
            .instance()
            .get(&archive_key)
            .ok_or(CertificateError::NotFound)
    }

    // Get version chain for a certificate
    pub fn get_version_chain(env: Env, certificate_id: String) -> Vec<CertificateVersion> {
        let chain_key = DataKey::VersionChain(certificate_id);
        env.storage()
            .instance()
            .get(&chain_key)
            .unwrap_or(Vec::new(&env))
    }

    // Get compatibility matrix for a version
    pub fn get_compatibility_matrix(
        env: Env,
        version: CertificateVersion,
    ) -> Result<CompatibilityMatrix, CertificateError> {
        let compatibility_key = DataKey::CompatibilityMatrix(version);
        env.storage()
            .instance()
            .get(&compatibility_key)
            .ok_or(CertificateError::NotFound)
    }

    // Get total number of upgrades
    pub fn get_upgrade_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::UpgradeCount)
            .unwrap_or(0)
    }

    // Helper function to compare versions
    pub fn compare_versions(
        env: Env,
        version1: CertificateVersion,
        version2: CertificateVersion,
    ) -> i32 {
        version1.compare(&version2)
    }

    // Helper function to check if upgrade is allowed
    pub fn is_upgrade_allowed(
        env: Env,
        from_version: CertificateVersion,
        to_version: CertificateVersion,
        upgrade_rules: Vec<UpgradeRule>,
    ) -> bool {
        Self::validate_upgrade_path(&env, &from_version, &to_version, &upgrade_rules).is_ok()
    }
}

#[cfg(test)]
mod test;

#[cfg(test)]
pub use crl_test::*;

#[cfg(test)]
pub use multisig_test::*;
