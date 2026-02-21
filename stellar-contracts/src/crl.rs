#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, Bytes, Map};
use soroban_sdk::iter::UnwrappingIter;

// Revocation reason types
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RevocationReason {
    KeyCompromise,
    CACompromise,
    AffiliationChanged,
    Superseded,
    CessationOfOperation,
    CertificateHold,
    RemoveFromCRL,
    PrivilegeWithdrawn,
    AACompromise,
    Other(String),
}

// Revoked certificate entry
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RevokedCertificate {
    pub certificate_id: String,
    pub issuer: Address,
    pub revocation_date: u64,
    pub reason: RevocationReason,
    pub invalidity_date: Option<u64>, // When the cert was actually compromised
}

// CRL entry with Merkle proof components
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CRLEntry {
    pub certificate_id: String,
    pub revocation_date: u64,
    pub reason_code: u32, // Numeric representation of RevocationReason
}

// Merkle tree node
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerkleNode {
    pub hash: Bytes,
    pub left: Option<u32>,
    pub right: Option<u32>,
}

// CRL with Merkle tree root
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CertificateRevocationList {
    pub issuer: Address,
    pub this_update: u64,
    pub next_update: u64,
    pub revoked_certificates: Vec<RevokedCertificate>,
    pub merkle_root: Option<Bytes>, // Root hash of Merkle tree
    pub crl_number: u64, // Incrementing CRL number for versioning
    pub authority_key_identifier: Option<Bytes>, // Optional authority key ID
}

// Pagination parameters
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Pagination {
    pub page: u32,
    pub limit: u32,
}

// Pagination result
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaginatedResult {
    pub data: Vec<RevokedCertificate>,
    pub total: u32,
    pub page: u32,
    pub limit: u32,
    pub has_next: bool,
}

// Verification result
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerificationResult {
    pub is_revoked: bool,
    pub revocation_info: Option<RevokedCertificate>,
    pub crl_number: u64,
    pub this_update: u64,
}

#[contract]
pub struct CRLContract;

#[contractimpl]
impl CRLContract {
    // Initialize the CRL contract
    pub fn initialize(env: Env, issuer: Address) {
        issuer.require_auth();
        
        let crl = CertificateRevocationList {
            issuer: issuer.clone(),
            this_update: env.ledger().timestamp(),
            next_update: env.ledger().timestamp() + 86400, // 24 hours
            revoked_certificates: Vec::new(&env),
            merkle_root: None,
            crl_number: 1,
            authority_key_identifier: None,
        };
        
        env.storage().instance().set(&String::from_str(&env, "CRL"), &crl);
        env.storage().instance().set(&String::from_str(&env, "ISSUER"), &issuer);
    }

    // Add a certificate to the revocation list
    pub fn revoke_certificate(
        env: Env,
        certificate_id: String,
        reason: RevocationReason,
        invalidity_date: Option<u64>,
    ) {
        let issuer: Address = env.storage().instance().get(&String::from_str(&env, "ISSUER"))
            .expect("Contract not initialized");
        issuer.require_auth();

        let mut crl: CertificateRevocationList = env.storage().instance()
            .get(&String::from_str(&env, "CRL"))
            .expect("CRL not found");

        // Check if already revoked
        for revoked in crl.revoked_certificates.iter() {
            if revoked.certificate_id == certificate_id {
                panic!("Certificate already revoked");
            }
        }

        let revoked_cert = RevokedCertificate {
            certificate_id,
            issuer: issuer.clone(),
            revocation_date: env.ledger().timestamp(),
            reason,
            invalidity_date,
        };

        crl.revoked_certificates.push_back(revoked_cert);
        crl.this_update = env.ledger().timestamp();
        crl.crl_number += 1;

        // Update Merkle root
        crl.merkle_root = Some(Self::build_merkle_root(&env, &crl.revoked_certificates));

        env.storage().instance().set(&String::from_str(&env, "CRL"), &crl);
    }

    // Remove a certificate from revocation list (un-revoke)
    pub fn unrevoke_certificate(env: Env, certificate_id: String) {
        let issuer: Address = env.storage().instance().get(&String::from_str(&env, "ISSUER"))
            .expect("Contract not initialized");
        issuer.require_auth();

        let mut crl: CertificateRevocationList = env.storage().instance()
            .get(&String::from_str(&env, "CRL"))
            .expect("CRL not found");

        let mut found = false;
        let mut new_list = Vec::new(&env);
        
        for revoked in crl.revoked_certificates.iter() {
            if revoked.certificate_id != certificate_id {
                new_list.push_back(revoked);
            } else {
                found = true;
            }
        }

        if !found {
            panic!("Certificate not found in revocation list");
        }

        crl.revoked_certificates = new_list;
        crl.this_update = env.ledger().timestamp();
        crl.crl_number += 1;

        // Update Merkle root
        crl.merkle_root = Some(Self::build_merkle_root(&env, &crl.revoked_certificates));

        env.storage().instance().set(&String::from_str(&env, "CRL"), &crl);
    }

    // Check if a certificate is revoked
    pub fn is_revoked(env: Env, certificate_id: String) -> bool {
        let crl: CertificateRevocationList = env.storage().instance()
            .get(&String::from_str(&env, "CRL"))
            .expect("CRL not found");

        for revoked in crl.revoked_certificates.iter() {
            if revoked.certificate_id == certificate_id {
                return true;
            }
        }
        false
    }

    // Get revocation information for a certificate
    pub fn get_revocation_info(env: Env, certificate_id: String) -> Option<RevokedCertificate> {
        let crl: CertificateRevocationList = env.storage().instance()
            .get(&String::from_str(&env, "CRL"))
            .expect("CRL not found");

        for revoked in crl.revoked_certificates.iter() {
            if revoked.certificate_id == certificate_id {
                return Some(revoked);
            }
        }
        None
    }

    // Get paginated list of revoked certificates
    pub fn get_revoked_certificates(env: Env, pagination: Pagination) -> PaginatedResult {
        let crl: CertificateRevocationList = env.storage().instance()
            .get(&String::from_str(&env, "CRL"))
            .expect("CRL not found");

        let total = crl.revoked_certificates.len();
        let start = (pagination.page * pagination.limit) as u32;
        let end = core::cmp::min(start + pagination.limit, total);

        let mut page_data = Vec::new(&env);
        if start < total {
            for i in start..end {
                page_data.push_back(crl.revoked_certificates.get(i).unwrap());
            }
        }

        PaginatedResult {
            data: page_data,
            total: total as u32,
            page: pagination.page,
            limit: pagination.limit,
            has_next: end < total,
        }
    }

    // Get full CRL information
    pub fn get_crl_info(env: Env) -> CertificateRevocationList {
        env.storage().instance()
            .get(&String::from_str(&env, "CRL"))
            .expect("CRL not found")
    }

    // Get CRL verification result with Merkle proof capability
    pub fn verify_certificate(env: Env, certificate_id: String) -> VerificationResult {
        let crl: CertificateRevocationList = env.storage().instance()
            .get(&String::from_str(&env, "CRL"))
            .expect("CRL not found");

        let revocation_info = Self::get_revocation_info(env.clone(), certificate_id);
        
        VerificationResult {
            is_revoked: revocation_info.is_some(),
            revocation_info,
            crl_number: crl.crl_number,
            this_update: crl.this_update,
        }
    }

    // Get Merkle root for current CRL
    pub fn get_merkle_root(env: Env) -> Option<Bytes> {
        let crl: CertificateRevocationList = env.storage().instance()
            .get(&String::from_str(&env, "CRL"))
            .expect("CRL not found");
        crl.merkle_root
    }

    // Build Merkle root from revoked certificates
    fn build_merkle_root(env: &Env, certificates: &Vec<RevokedCertificate>) -> Bytes {
        if certificates.len() == 0 {
            // Return hash of empty string for empty list
            return env.crypto().sha256(&Bytes::from_slice(env, b""));
        }

        // Convert certificates to leaf nodes
        let mut leaves = Vec::new(env);
        for cert in certificates.iter() {
            let data = cert.certificate_id.to_bytes();
            let hash = env.crypto().sha256(&data);
            leaves.push_back(hash);
        }

        // Build Merkle tree
        Self::build_merkle_tree(env, &leaves)
    }

    // Build Merkle tree from leaf hashes
    fn build_merkle_tree(env: &Env, leaves: &Vec<Bytes>) -> Bytes {
        if leaves.len() == 0 {
            return env.crypto().sha256(&Bytes::from_slice(env, b""));
        }

        let mut current_level = leaves.clone();
        
        while current_level.len() > 1 {
            let mut next_level = Vec::new(env);
            
            let len = current_level.len();
            let mut i = 0;
            
            while i < len {
                let left = current_level.get(i).unwrap();
                let right = if i + 1 < len {
                    current_level.get(i + 1).unwrap()
                } else {
                    left.clone() // Duplicate last node if odd number
                };
                
                let mut combined = Vec::new(env);
                combined.push_back(left);
                combined.push_back(right);
                let combined_bytes = Self::vec_to_bytes(env, &combined);
                let parent_hash = env.crypto().sha256(&combined_bytes);
                next_level.push_back(parent_hash);
                
                i += 2;
            }
            
            current_level = next_level;
        }
        
        current_level.get(0).unwrap()
    }

    // Helper function to convert Vec<Bytes> to Bytes
    fn vec_to_bytes(env: &Env, vec: &Vec<Bytes>) -> Bytes {
        let mut result = Bytes::new(env);
        for item in vec.iter() {
            result.append(&item);
        }
        result
    }

    // Get total count of revoked certificates
    pub fn get_revoked_count(env: Env) -> u32 {
        let crl: CertificateRevocationList = env.storage().instance()
            .get(&String::from_str(&env, "CRL"))
            .expect("CRL not found");
        crl.revoked_certificates.len() as u32
    }

    // Check if CRL needs update
    pub fn needs_update(env: Env) -> bool {
        let crl: CertificateRevocationList = env.storage().instance()
            .get(&String::from_str(&env, "CRL"))
            .expect("CRL not found");
        env.ledger().timestamp() >= crl.next_update
    }

    // Update CRL metadata
    pub fn update_crl_metadata(
        env: Env,
        next_update: Option<u64>,
        authority_key_identifier: Option<Bytes>,
    ) {
        let issuer: Address = env.storage().instance().get(&String::from_str(&env, "ISSUER"))
            .expect("Contract not initialized");
        issuer.require_auth();

        let mut crl: CertificateRevocationList = env.storage().instance()
            .get(&String::from_str(&env, "CRL"))
            .expect("CRL not found");

        if let Some(next) = next_update {
            crl.next_update = next;
        }

        if let Some(aki) = authority_key_identifier {
            crl.authority_key_identifier = Some(aki);
        }

        crl.this_update = env.ledger().timestamp();
        crl.crl_number += 1;

        env.storage().instance().set(&String::from_str(&env, "CRL"), &crl);
    }
}