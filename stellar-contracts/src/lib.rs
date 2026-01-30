#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

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
}

#[contract]
pub struct CertificateContract;

#[contractimpl]
impl CertificateContract {
    
    // Issues a new certificate
    pub fn issue_certificate(
        env: Env,
        id: String,
        issuer: Address,
        owner: Address,
        metadata_uri: String,
    ) {
        // Authenticate the issuer
        issuer.require_auth();

        // Check if certificate already exists
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
        };

        env.storage().instance().set(&id, &cert);
    }

    // Revokes a certificate
    pub fn revoke_certificate(env: Env, id: String, reason: String) {
        let mut cert: Certificate = env.storage().instance().get(&id).expect("Certificate not found");
        
        // Only the issuer can revoke
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

    // Checks if a certificate is revoked
    pub fn is_revoked(env: Env, id: String) -> bool {
        let cert: Certificate = env.storage().instance().get(&id).expect("Certificate not found");
        cert.revoked
    }

    // Retrieves certificate details
    pub fn get_certificate(env: Env, id: String) -> Certificate {
        env.storage().instance().get(&id).expect("Certificate not found")
    }
}

#[cfg(test)]
mod test;
