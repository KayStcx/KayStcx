#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Bytes, BytesN, Env, Vec};

#[test]
fn test_issue_and_revoke() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let id = String::from_str(&env, "cert-123");
    let metadata_uri = String::from_str(&env, "ipfs://Qm...");

    env.mock_all_auths();
    client.issue_certificate(&id, &issuer, &owner, &metadata_uri);

    let cert = client.get_certificate(&id);
    assert_eq!(cert.id, id);
    assert_eq!(cert.revoked, false);

    let reason = String::from_str(&env, "Violation of terms");
    client.revoke_certificate(&id, &reason);

    let revoked = client.is_revoked(&id);
    assert!(revoked);

    let cert_revoked = client.get_certificate(&id);
    assert_eq!(cert_revoked.revoked, true);
    assert_eq!(cert_revoked.revocation_reason, Some(reason));
}

#[test]
fn test_batch_verify_certificates_partial_failure_and_cost() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);

    let id1 = String::from_str(&env, "cert-1");
    let id2 = String::from_str(&env, "cert-2");
    let id3 = String::from_str(&env, "cert-3");
    let missing_id = String::from_str(&env, "missing-cert");
    let metadata_uri = String::from_str(&env, "ipfs://meta");

    env.mock_all_auths();

    client.issue_certificate(&id1, &issuer, &owner, &metadata_uri);
    client.issue_certificate(&id2, &issuer, &owner, &metadata_uri);
    client.issue_certificate(&id3, &issuer, &owner, &metadata_uri);

    let revoke_reason = String::from_str(&env, "policy");
    client.revoke_certificate(&id2, &revoke_reason);

    let mut ids = Vec::<String>::new(&env);
    ids.push_back(id1.clone());
    ids.push_back(id2.clone());
    ids.push_back(id3.clone());
    ids.push_back(missing_id.clone());

    let report = client.batch_verify_certificates(&ids);

    assert_eq!(report.total, 4);
    assert_eq!(report.successful, 2);
    assert_eq!(report.failed, 2);
    assert_eq!(
        report.total_cost,
        BASE_VERIFICATION_COST + (COST_PER_CERTIFICATE * 4)
    );

    assert_eq!(report.results.len(), 4);

    let r1 = report.results.get(0).unwrap();
    assert_eq!(r1.id, id1);
    assert!(r1.exists);
    assert!(!r1.revoked);

    let r2 = report.results.get(1).unwrap();
    assert_eq!(r2.id, id2);
    assert!(r2.exists);
    assert!(r2.revoked);

    let r3 = report.results.get(2).unwrap();
    assert_eq!(r3.id, id3);
    assert!(r3.exists);
    assert!(!r3.revoked);

    let r4 = report.results.get(3).unwrap();
    assert_eq!(r4.id, missing_id);
    assert!(!r4.exists);
}

#[test]
fn test_verify_merkle_batch_with_partial_success() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let leaf1 = env.crypto().sha256(&Bytes::from_slice(&env, b"leaf-1"));
    let leaf2 = env.crypto().sha256(&Bytes::from_slice(&env, b"leaf-2"));

    let root = leaf1.clone();

    let siblings_empty: Vec<BytesN<32>> = Vec::new(&env);

    let mut proofs = Vec::<MerkleProof>::new(&env);
    proofs.push_back(MerkleProof {
        leaf: leaf1.clone(),
        siblings: siblings_empty.clone(),
    });
    proofs.push_back(MerkleProof {
        leaf: leaf2.clone(),
        siblings: siblings_empty,
    });

    let results = client.verify_merkle_batch(&root, &proofs);

    assert_eq!(results.len(), 2);

    let res1 = results.get(0).unwrap();
    assert_eq!(res1.leaf, leaf1);
    assert!(res1.is_valid);

    let res2 = results.get(1).unwrap();
    assert_eq!(res2.leaf, leaf2);
    assert!(!res2.is_valid);
}
