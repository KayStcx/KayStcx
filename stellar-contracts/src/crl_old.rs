use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RevocationReason {
    KeyCompromise,
    CACompromise,
    AffiliationChanged,
    Superseded,
    CessationOfOperation,
    CertificateHold,
    PrivilegeWithdrawn,
    AACompromise,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RevocationInfo {
    pub certificate_id: String,
    pub reason: RevocationReason,
    pub issuer: Address,
    pub revocation_date: u64,
    pub revoked_by: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CRLInfo {
    pub issuer: Address,
    pub revoked_count: u32,
    pub crl_number: u64,
    pub this_update: u64,
    pub next_update: u64,
    pub merkle_root: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Pagination {
    pub page: u32,
    pub limit: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerificationResult {
    pub is_revoked: bool,
    pub crl_number: u64,
}

#[contract]
pub struct CRLContract;

#[contractimpl]
impl CRLContract {
    /// Initialize the CRL contract with an issuer
    pub fn initialize(env: Env, issuer: Address) {
        // Check if already initialized
        if env.storage().instance().has(&(&b"CRL_ISSUER"[..])) {
            panic!("CRL already initialized");
        }
        
        // Store issuer
        env.storage().instance().set(&(&b"CRL_ISSUER"[..]), &issuer);
        
        // Initialize CRL
        let crl_info = CRLInfo {
            issuer: issuer.clone(),
            revoked_count: 0,
            crl_number: 1,
            this_update: env.ledger().timestamp(),
            next_update: env.ledger().timestamp() + (7 * 24 * 60 * 60), // 7 days from now
            merkle_root: String::from_str(&env, "initial_root"),
        };
        
        env.storage().instance().set(&(&b"CRL_INFO"[..]), &crl_info);
    }

    /// Revoke a certificate
    pub fn revoke_certificate(
        env: Env,
        certificate_id: String,
        reason: RevocationReason,
        _serial_number: Option<String>,
    ) {
        let issuer: Address = env.storage().instance()
            .get(&(&b"CRL_ISSUER"[..]))
            .expect("CRL not initialized");
        
        // Check if already revoked
        if env.storage().instance().has(&(&certificate_id.clone().into_bytes()[..])) {
            panic!("Certificate already revoked");
        }
        
        let mut crl_info: CRLInfo = env.storage().instance()
            .get(&(&b"CRL_INFO"[..]))
            .expect("CRL info not found");
        
        // Create revocation info
        let revocation_info = RevocationInfo {
            certificate_id: certificate_id.clone(),
            reason: reason.clone(),
            issuer: issuer.clone(),
            revocation_date: env.ledger().timestamp(),
            revoked_by: issuer.clone(),
        };
        
        // Store individual revocation info for quick lookup
        env.storage().instance().set(&(&certificate_id.into_bytes()[..]), &revocation_info);
        
        // Update CRL info
        crl_info.revoked_count += 1;
        crl_info.crl_number += 1;
        crl_info.this_update = env.ledger().timestamp();
        
        // Update merkle root (simplified)
        crl_info.merkle_root = String::from_str(&env, &format!("root_{}", crl_info.crl_number));
        
        // Store updated CRL info
        env.storage().instance().set(&(&b"CRL_INFO"[..]), &crl_info);
    }

    /// Unrevoke (remove) a certificate from the CRL
    pub fn unrevoke_certificate(env: Env, certificate_id: String) {
        let issuer: Address = env.storage().instance()
            .get(&(&b"CRL_ISSUER"[..]))
            .expect("CRL not initialized");
        
        // Check if certificate exists in revocation list
        let revocation_info: RevocationInfo = env.storage().instance()
            .get(&(&certificate_id.clone().into_bytes()[..]))
            .expect("Certificate not found in revocation list");
        
        // Verify issuer
        if revocation_info.issuer != issuer {
            panic!("Only the original issuer can unrevoke");
        }
        
        let mut crl_info: CRLInfo = env.storage().instance()
            .get(&(&b"CRL_INFO"[..]))
            .expect("CRL info not found");
        
        // Update CRL info
        crl_info.revoked_count -= 1;
        crl_info.crl_number += 1;
        crl_info.this_update = env.ledger().timestamp();
        
        // Update merkle root
        crl_info.merkle_root = String::from_str(&env, &format!("root_{}", crl_info.crl_number));
        
        // Store updated CRL info
        env.storage().instance().set(&(&b"CRL_INFO"[..]), &crl_info);
        
        // Remove individual revocation info
        env.storage().instance().remove(&(&certificate_id.into_bytes()[..]));
    }

    /// Check if a certificate is revoked
    pub fn is_revoked(env: Env, certificate_id: String) -> bool {
        env.storage().instance().has(&(&certificate_id.into_bytes()[..]))
    }

    /// Get revocation info for a specific certificate
    pub fn get_revocation_info(env: Env, certificate_id: String) -> Option<RevocationInfo> {
        env.storage().instance()
            .get(&(&certificate_id.into_bytes()[..]))
    }

    /// Get total number of revoked certificates
    pub fn get_revoked_count(env: Env) -> u32 {
        let crl_info: CRLInfo = env.storage().instance()
            .get(&(&b"CRL_INFO"[..]))
            .expect("CRL info not found");
        crl_info.revoked_count
    }

    /// Get CRL information
    pub fn get_crl_info(env: Env) -> CRLInfo {
        env.storage().instance()
            .get(&(&b"CRL_INFO"[..]))
            .expect("CRL info not found")
    }

    /// Get paginated list of revoked certificates (simplified)
    pub fn get_revoked_certificates(env: Env, pagination: Pagination) -> Vec<RevocationInfo> {
        // Simplified implementation - return empty vector
        // In a real implementation, this would return paginated results
        Vec::new(&env)
    }

    /// Verify a certificate (check if it's revoked)
    pub fn verify_certificate(env: Env, certificate_id: String) -> VerificationResult {
        let crl_info: CRLInfo = env.storage().instance()
            .get(&(&b"CRL_INFO"[..]))
            .expect("CRL info not found");
        
        let is_revoked = env.storage().instance().has(&(&certificate_id.into_bytes()[..]));
        
        VerificationResult {
            is_revoked,
            crl_number: crl_info.crl_number,
        }
    }

    /// Get the current Merkle root
    pub fn get_merkle_root(env: Env) -> String {
        let crl_info: CRLInfo = env.storage().instance()
            .get(&(&b"CRL_INFO"[..]))
            .expect("CRL info not found");
        crl_info.merkle_root
    }

    /// Update CRL metadata (like next_update time)
    pub fn update_crl_metadata(env: Env, next_update: Option<u64>, _issuer: Option<Address>) {
        let mut crl_info: CRLInfo = env.storage().instance()
            .get(&(&b"CRL_INFO"[..]))
            .expect("CRL info not found");
        
        if let Some(new_next_update) = next_update {
            crl_info.next_update = new_next_update;
        }
        
        // Update CRL number and timestamp
        crl_info.crl_number += 1;
        crl_info.this_update = env.ledger().timestamp();
        
        // Update merkle root
        crl_info.merkle_root = String::from_str(&env, &format!("root_{}", crl_info.crl_number));
        
        // Store updated CRL info
        env.storage().instance().set(&(&b"CRL_INFO"[..]), &crl_info);
    }

    /// Check if CRL needs updating (based on next_update)
    pub fn needs_update(env: Env) -> bool {
        let crl_info: CRLInfo = env.storage().instance()
            .get(&(&b"CRL_INFO"[..]))
            .expect("CRL info not found");
        
        env.ledger().timestamp() >= crl_info.next_update
    }
}
