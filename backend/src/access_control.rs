use soroban_sdk::{contracttype, Address, Env};

use crate::certificate_issuance::DataKey;
use crate::types::CertificateError;

/// Role constants for the contract
pub const ROLE_ADMIN: &str = "ADMIN";
pub const ROLE_ISSUER: &str = "ISSUER";
pub const ROLE_CERTIFICATE_OWNER: &str = "CERTIFICATE_OWNER";

/// Access control errors
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AccessControlError {
    /// Caller is not the admin
    NotAdmin,
    /// Caller is not an authorized issuer
    NotAuthorizedIssuer,
    /// Caller is not the certificate owner
    NotCertificateOwner,
    /// Caller is not the certificate issuer
    NotCertificateIssuer,
    /// Generic unauthorized error
    Unauthorized,
}

/// Access control helper functions
pub struct AccessControl;

impl AccessControl {
    /// Check if an address is the contract admin
    pub fn is_admin(env: &Env, address: &Address) -> bool {
        if let Some(admin) = env.storage().instance().get::<DataKey, Address>(&DataKey::Admin) {
            return admin == *address;
        }
        false
    }

    /// Check if an address is an authorized issuer
    pub fn is_authorized_issuer(env: &Env, address: &Address) -> bool {
        env.storage()
            .instance()
            .get::<DataKey, bool>(&DataKey::Issuer(address.clone()))
            .unwrap_or(false)
    }

    /// Require caller to be admin - panics with AccessControlError::NotAdmin if not
    pub fn require_admin(env: &Env, caller: &Address) -> Result<(), AccessControlError> {
        if !Self::is_admin(env, caller) {
            return Err(AccessControlError::NotAdmin);
        }
        Ok(())
    }

    /// Require caller to be an authorized issuer - panics with AccessControlError::NotAuthorizedIssuer if not
    pub fn require_authorized_issuer(env: &Env, caller: &Address) -> Result<(), AccessControlError> {
        if !Self::is_authorized_issuer(env, caller) {
            return Err(AccessControlError::NotAuthorizedIssuer);
        }
        Ok(())
    }

    /// Require caller to be the certificate owner - panics with AccessControlError::NotCertificateOwner if not
    pub fn require_certificate_owner(
        env: &Env,
        caller: &Address,
        certificate_owner: &Address,
    ) -> Result<(), AccessControlError> {
        if *caller != *certificate_owner {
            return Err(AccessControlError::NotCertificateOwner);
        }
        Ok(())
    }

    /// Require caller to be the certificate issuer - panics with AccessControlError::NotCertificateIssuer if not
    pub fn require_certificate_issuer(
        env: &Env,
        caller: &Address,
        certificate_issuer: &Address,
    ) -> Result<(), AccessControlError> {
        if *caller != *certificate_issuer {
            return Err(AccessControlError::NotCertificateIssuer);
        }
        Ok(())
    }

    /// Check if caller is either admin or authorized issuer
    pub fn is_admin_or_issuer(env: &Env, address: &Address) -> bool {
        Self::is_admin(env, address) || Self::is_authorized_issuer(env, address)
    }

    /// Require caller to be either admin or authorized issuer
    pub fn require_admin_or_issuer(env: &Env, caller: &Address) -> Result<(), AccessControlError> {
        if !Self::is_admin_or_issuer(env, caller) {
            return Err(AccessControlError::NotAuthorizedIssuer);
        }
        Ok(())
    }

    /// Require caller to be admin, issuer of the certificate, or the certificate owner
    pub fn require_authorized_for_certificate(
        env: &Env,
        caller: &Address,
        certificate_issuer: &Address,
        certificate_owner: &Address,
    ) -> Result<(), AccessControlError> {
        let admin = env.storage().instance().get::<DataKey, Address>(&DataKey::Admin);
        
        if *caller == admin.unwrap() || *caller == *certificate_issuer || *caller == *certificate_owner {
            Ok(())
        } else {
            Err(AccessControlError::Unauthorized)
        }
    }
}

/// Helper trait to convert AccessControlError to CertificateError
impl From<AccessControlError> for CertificateError {
    fn from(err: AccessControlError) -> Self {
        match err {
            AccessControlError::NotAdmin => CertificateError::Unauthorized,
            AccessControlError::NotAuthorizedIssuer => CertificateError::Unauthorized,
            AccessControlError::NotCertificateOwner => CertificateError::Unauthorized,
            AccessControlError::NotCertificateIssuer => CertificateError::Unauthorized,
        }
    }
}
