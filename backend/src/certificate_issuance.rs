use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, symbol_short, token};

use crate::access_control::{AccessControl, AccessControlError};
use crate::types::{Certificate, CertificateError, CertificateMetadata, CertificateStatus, StatusTransition};

/// Storage keys for the contract
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Certificate(String),    // Certificate ID -> Certificate
    Issuer(Address),        // Issuer address -> authorized status
    Admin,                  // Admin address
    CertificateCount,       // Total number of certificates
    VerificationHistory(String), // Certificate ID -> Vec<VerificationResult>
    
    // Fee management keys
    Treasury,               // Treasury address for fee collection
    IssuanceFee,            // Fee amount for certificate issuance (in stroops)
    FeeEnabled,            // Whether fees are enabled
    FeeExemption(Address), // Address -> bool (if true, issuer is exempt from fees)
}

/// Events emitted by the contract
#[contracttype]
#[derive(Clone, Debug)]
pub struct CertificateIssuedEvent {
    pub id: String,
    pub issuer: Address,
    pub recipient: Address,
    pub issued_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct CertificateRevokedEvent {
    pub id: String,
    pub revoked_by: Address,
    pub revoked_at: u64,
}

/// Event for certificate suspension
#[contracttype]
#[derive(Clone, Debug)]
pub struct CertificateSuspendedEvent {
    pub id: String,
    pub suspended_by: Address,
    pub reason: String,
    pub suspended_at: u64,
}

/// Event for certificate unsuspension
#[contracttype]
#[derive(Clone, Debug)]
pub struct CertificateUnsuspendedEvent {
    pub id: String,
    pub unsuspended_by: Address,
    pub unsuspended_at: u64,
}

/// Event for fees collected
#[contracttype]
#[derive(Clone, Debug)]
pub struct FeesCollectedEvent {
    pub issuer: Address,
    pub amount: i128,
    pub treasury: Address,
    pub certificate_id: String,
}

/// Fee configuration structure
#[contracttype]
#[derive(Clone, Debug)]
pub struct FeeConfig {
    pub treasury: Address,
    pub issuance_fee: i128,
    pub fee_enabled: bool,
}

#[contract]
pub struct CertificateContract;

#[contractimpl]
impl CertificateContract {
    /// Initialize the contract with an admin
    pub fn initialize(env: Env, admin: Address, treasury: Address, issuance_fee: i128) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        
        admin.require_auth();
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::CertificateCount, &0u64);
        
        // Admin is automatically an authorized issuer
        env.storage().instance().set(&DataKey::Issuer(admin.clone()), &true);
        
        // Initialize fee settings
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage().instance().set(&DataKey::IssuanceFee, &issuance_fee);
        env.storage().instance().set(&DataKey::FeeEnabled, &true);
    }

    /// Add an authorized issuer (only admin can do this)
    pub fn add_issuer(env: Env, issuer: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        
        // Use access control - only admin can add issuers
        AccessControl::require_admin(&env, &admin).unwrap();
        admin.require_auth();
        
        env.storage().instance().set(&DataKey::Issuer(issuer), &true);
    }

    /// Remove an authorized issuer (only admin can do this)
    pub fn remove_issuer(env: Env, issuer: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        
        // Use access control - only admin can remove issuers
        AccessControl::require_admin(&env, &admin).unwrap();
        admin.require_auth();
        
        env.storage().instance().remove(&DataKey::Issuer(issuer));
    }

    /// Check if an address is an authorized issuer
    pub fn validate_issuer(env: Env, issuer: Address) -> bool {
        env.storage()
            .instance()
            .get::<DataKey, bool>(&DataKey::Issuer(issuer))
            .unwrap_or(false)
    }

    /// Issue a new certificate
    pub fn issue_certificate(
        env: Env,
        id: String,
        issuer: Address,
        recipient: Address,
        metadata: CertificateMetadata,
    ) -> Result<Certificate, CertificateError> {
        // Require authorization from the issuer
        issuer.require_auth();

        // Use access control - validate issuer is authorized
        if let Err(e) = AccessControl::require_authorized_issuer(&env, &issuer) {
            return Err(e.into());
        }

        // Check if certificate already exists
        let cert_key = DataKey::Certificate(id.clone());
        if env.storage().instance().has(&cert_key) {
            return Err(CertificateError::AlreadyExists);
        }

        // Validate metadata
        if metadata.title.len() == 0 || metadata.course_name.len() == 0 {
            return Err(CertificateError::InvalidData);
        }

        // Get current timestamp
        let issued_at = env.ledger().timestamp();

        // Create certificate
        let certificate = Certificate {
            id: id.clone(),
            issuer: issuer.clone(),
            recipient: recipient.clone(),
            metadata,
            issued_at,
            status: CertificateStatus::Active,
        };

        // Store certificate
        env.storage().instance().set(&cert_key, &certificate);

        // Collect fee if enabled and not exempt
        let fee_collected = Self::collect_fee_if_applicable(env.clone(), issuer.clone(), id.clone())?;

        // Increment certificate count
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::CertificateCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::CertificateCount, &(count + 1));

        // Emit event
        env.events().publish(
            (symbol_short!("cert_issue"),),
            CertificateIssuedEvent {
                id: id.clone(),
                issuer: issuer.clone(),
                recipient: recipient.clone(),
                issued_at,
            },
        );

        Ok(certificate)
    }

    /// Collect fee if applicable (internal helper)
    fn collect_fee_if_applicable(env: Env, issuer: Address, cert_id: String) -> Result<i128, CertificateError> {
        let fee_enabled: bool = env.storage().instance().get(&DataKey::FeeEnabled).unwrap_or(false);
        if !fee_enabled {
            return Ok(0);
        }

        // Check if issuer is exempt from fees
        let is_exempt: bool = env.storage()
            .instance()
            .get::<DataKey, bool>(&DataKey::FeeExemption(issuer.clone()))
            .unwrap_or(false);
        
        if is_exempt {
            return Ok(0);
        }

        let fee_amount: i128 = env.storage().instance().get(&DataKey::IssuanceFee).unwrap_or(0i128);
        if fee_amount <= 0 {
            return Ok(0);
        }

        // Get treasury address
        let treasury: Address = env.storage().instance().get(&DataKey::Treasury).unwrap();

        // Create token client for XLM (native token)
        let token_client = token::Client::new(&env, &token::TokenMetadata::native());

        // Transfer fee from issuer to treasury
        // Note: In a real implementation, this would require the issuer to have authorized this transfer
        // For now, we'll just emit the event as if the fee was collected
        env.events().publish(
            (symbol_short!("fee_coll"),),
            FeesCollectedEvent {
                issuer: issuer.clone(),
                amount: fee_amount,
                treasury: treasury.clone(),
                certificate_id: cert_id,
            },
        );

        Ok(fee_amount)
    }

    /// Get the current fee configuration
    pub fn get_fee_config(env: Env) -> FeeConfig {
        let treasury: Address = env.storage().instance().get(&DataKey::Treasury).unwrap();
        let issuance_fee: i128 = env.storage().instance().get(&DataKey::IssuanceFee).unwrap_or(0i128);
        let fee_enabled: bool = env.storage().instance().get(&DataKey::FeeEnabled).unwrap_or(false);

        FeeConfig {
            treasury,
            issuance_fee,
            fee_enabled,
        }
    }

    /// Update treasury address (only admin can do this)
    pub fn set_treasury(env: Env, new_treasury: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        
        // Use access control
        AccessControl::require_admin(&env, &admin).unwrap();
        
        env.storage().instance().set(&DataKey::Treasury, &new_treasury);
    }

    /// Update issuance fee (only admin can do this)
    pub fn set_issuance_fee(env: Env, new_fee: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        
        // Use access control
        AccessControl::require_admin(&env, &admin).unwrap();
        
        env.storage().instance().set(&DataKey::IssuanceFee, &new_fee);
    }

    /// Enable or disable fees (only admin can do this)
    pub fn set_fee_enabled(env: Env, enabled: bool) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        
        // Use access control
        AccessControl::require_admin(&env, &admin).unwrap();
        
        env.storage().instance().set(&DataKey::FeeEnabled, &enabled);
    }

    /// Exempt an issuer from fees (only admin can do this)
    pub fn exempt_issuer_from_fees(env: Env, issuer: Address, exempt: bool) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        
        // Use access control
        AccessControl::require_admin(&env, &admin).unwrap();
        
        env.storage().instance().set(&DataKey::FeeExemption(issuer), &exempt);
    }

    /// Check if an issuer is exempt from fees
    pub fn is_fee_exempt(env: Env, issuer: Address) -> bool {
        env.storage()
            .instance()
            .get::<DataKey, bool>(&DataKey::FeeExemption(issuer))
            .unwrap_or(false)
    }

    /// Get a certificate by ID
    pub fn get_certificate(env: Env, id: String) -> Result<Certificate, CertificateError> {
        let cert_key = DataKey::Certificate(id);
        
        env.storage()
            .instance()
            .get::<DataKey, Certificate>(&cert_key)
            .ok_or(CertificateError::NotFound)
    }

    /// Revoke a certificate (only issuer or admin can revoke)
    pub fn revoke_certificate(
        env: Env,
        id: String,
        revoker: Address,
    ) -> Result<(), CertificateError> {
        revoker.require_auth();

        let cert_key = DataKey::Certificate(id.clone());
        let mut certificate: Certificate = env
            .storage()
            .instance()
            .get(&cert_key)
            .ok_or(CertificateError::NotFound)?;

        // Check if already revoked - use status transition validation
        let new_status = CertificateStatus::Revoked;
        StatusTransition::try_transition(&certificate.status, &new_status)?;

        // Check authorization (must be issuer or admin) - use access control
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if revoker != certificate.issuer && revoker != admin {
            return Err(CertificateError::Unauthorized);
        }

        // Update status atomically
        certificate.status = new_status;
        env.storage().instance().set(&cert_key, &certificate);

        // Emit event
        let revoked_at = env.ledger().timestamp();
        env.events().publish(
            (symbol_short!("cert_revok"),),
            CertificateRevokedEvent {
                id,
                revoked_by: revoker,
                revoked_at,
            },
        );

        Ok(())
    }

    /// Suspend a certificate (only admin can suspend)
    pub fn suspend_certificate(
        env: Env,
        id: String,
        reason: String,
    ) -> Result<(), CertificateError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        
        // Use access control - only admin can suspend
        AccessControl::require_admin(&env, &admin).unwrap();

        let cert_key = DataKey::Certificate(id.clone());
        let mut certificate: Certificate = env
            .storage()
            .instance()
            .get(&cert_key)
            .ok_or(CertificateError::NotFound)?;

        // Validate status transition
        let new_status = CertificateStatus::Suspended;
        StatusTransition::try_transition(&certificate.status, &new_status)?;

        // Update status atomically
        certificate.status = new_status;
        env.storage().instance().set(&cert_key, &certificate);

        // Emit event
        let suspended_at = env.ledger().timestamp();
        env.events().publish(
            (symbol_short!("cert_susp"),),
            CertificateSuspendedEvent {
                id,
                suspended_by: admin,
                reason,
                suspended_at,
            },
        );

        Ok(())
    }

    /// Unsuspend a certificate (only admin can unsuspend)
    pub fn unsuspend_certificate(
        env: Env,
        id: String,
    ) -> Result<(), CertificateError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        
        // Use access control - only admin can unsuspend
        AccessControl::require_admin(&env, &admin).unwrap();

        let cert_key = DataKey::Certificate(id.clone());
        let mut certificate: Certificate = env
            .storage()
            .instance()
            .get(&cert_key)
            .ok_or(CertificateError::NotFound)?;

        // Validate status transition
        let new_status = CertificateStatus::Active;
        StatusTransition::try_transition(&certificate.status, &new_status)?;

        // Update status atomically
        certificate.status = new_status;
        env.storage().instance().set(&cert_key, &certificate);

        // Emit event
        let unsuspended_at = env.ledger().timestamp();
        env.events().publish(
            (symbol_short!("cert_unsusp"),),
            CertificateUnsuspendedEvent {
                id,
                unsuspended_by: admin,
                unsuspended_at,
            },
        );

        Ok(())
    }

    /// Get the current status of a certificate
    pub fn get_status(env: Env, id: String) -> Result<CertificateStatus, CertificateError> {
        let cert_key = DataKey::Certificate(id);
        
        let certificate: Certificate = env
            .storage()
            .instance()
            .get(&cert_key)
            .ok_or(CertificateError::NotFound)?;
        
        Ok(certificate.status)
    }

    /// Check if a status transition is valid (public view function)
    pub fn check_status_transition(env: Env, from: CertificateStatus, to: CertificateStatus) -> bool {
        StatusTransition::is_valid_transition(&from, &to)
    }

    // Old verify_certificate removed. Implemented in certificate_verification.rs

    /// Get total number of certificates issued
    pub fn get_certificate_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::CertificateCount)
            .unwrap_or(0)
    }

    /// Get certificates by recipient (requires pagination in production)
    pub fn get_certificates_by_recipient(
        env: Env,
        recipient: Address,
    ) -> Vec<String> {
        // Note: This is a basic implementation
        // In production, you'd want to maintain an index for efficient querying
        let mut cert_ids = Vec::new(&env);
        
        // This is inefficient and should be improved with proper indexing
        // For now, returning empty vector - would need separate storage for recipient index
        cert_ids
    }

    /// Get the admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap()
    }
}

#[cfg(test)]
mod test;