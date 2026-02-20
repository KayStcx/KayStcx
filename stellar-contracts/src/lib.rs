#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, String, Vec,
};

const MAX_BATCH_SIZE: u32 = 50;
const BASE_VERIFICATION_COST: u64 = 10;
const COST_PER_CERTIFICATE: u64 = 5;

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
}

#[cfg(test)]
mod test;
