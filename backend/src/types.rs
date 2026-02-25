use soroban_sdk::{contracttype, Address, String, Vec};

/// Certificate status enum
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CertificateStatus {
    Active,
    Revoked,
    Expired,
    Suspended,
}

/// Certificate metadata structure
#[contracttype]
#[derive(Clone, Debug)]
pub struct CertificateMetadata {
    pub title: String,
    pub description: String,
    pub course_name: String,
    pub completion_date: u64,
    pub valid_until: u64, // 0 for no expiration
    pub ipfs_hash: String, // For storing additional data off-chain
}

/// Main Certificate structure
#[contracttype]
#[derive(Clone, Debug)]
pub struct Certificate {
    pub id: String,
    pub issuer: Address,
    pub recipient: Address,
    pub metadata: CertificateMetadata,
    pub issued_at: u64,
    pub status: CertificateStatus,
}

/// Verification result structure
#[contracttype]
#[derive(Clone, Debug)]
pub struct VerificationResult {
    pub is_valid: bool,
    pub status: CertificateStatus,
    pub message: String,
    pub verified_at: u64,
}

/// Event for certificate verification
#[contracttype]
#[derive(Clone, Debug)]
pub struct CertificateVerifiedEvent {
    pub id: String,
    pub verifier: Address,
    pub result: VerificationResult,
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
    InvalidStatusTransition,
}

/// Certificate status transition helper
pub struct StatusTransition;

impl StatusTransition {
    /// Check if a status transition is valid
    /// Valid transitions:
    /// - Active -> Revoked
    /// - Active -> Expired
    /// - Active -> Suspended
    /// - Suspended -> Active (unsuspend)
    /// - Suspended -> Revoked
    /// - Expired -> Revoked
    pub fn is_valid_transition(from: &CertificateStatus, to: &CertificateStatus) -> bool {
        match (from, to) {
            // Active can transition to Revoked, Expired, or Suspended
            (CertificateStatus::Active, CertificateStatus::Revoked) => true,
            (CertificateStatus::Active, CertificateStatus::Expired) => true,
            (CertificateStatus::Active, CertificateStatus::Suspended) => true,
            
            // Suspended can transition back to Active or to Revoked
            (CertificateStatus::Suspended, CertificateStatus::Active) => true,
            (CertificateStatus::Suspended, CertificateStatus::Revoked) => true,
            
            // Expired can transition to Revoked
            (CertificateStatus::Expired, CertificateStatus::Revoked) => true,
            
            // Any status to itself (no change) - but we treat as invalid for transitions
            // Terminal states cannot transition
            (CertificateStatus::Revoked, _) => false,
            
            // From Expired, can only go to Revoked (not back to Active or Suspended)
            (CertificateStatus::Expired, CertificateStatus::Active) => false,
            (CertificateStatus::Expired, CertificateStatus::Suspended) => false,
            
            // From Suspended, cannot go to Expired
            (CertificateStatus::Suspended, CertificateStatus::Expired) => false,
            
            // From Active to Active is not a transition
            (CertificateStatus::Active, CertificateStatus::Active) => false,
        }
    }

    /// Attempt to transition status, returns error if invalid
    pub fn try_transition(
        current: &CertificateStatus,
        new: &CertificateStatus,
    ) -> Result<CertificateStatus, CertificateError> {
        if !Self::is_valid_transition(current, new) {
            return Err(CertificateError::InvalidStatusTransition);
        }
        Ok(new.clone())
    }

    /// Check if a status is terminal (no further transitions possible)
    pub fn is_terminal(status: &CertificateStatus) -> bool {
        matches!(status, CertificateStatus::Revoked)
    }

    /// Check if a status is active (certificate is currently valid)
    pub fn is_active(status: &CertificateStatus) -> bool {
        matches!(status, CertificateStatus::Active)
    }
}