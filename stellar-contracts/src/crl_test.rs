#![cfg(test)]

use super::crl::*;
use crate::{
    test_helpers::setup_certificate,
    CertificateContract,
    CertificateContractClient,
    ContractError,
};
use soroban_sdk::{testutils::Address as _, vec, Address, Bytes, BytesN, Env, String};

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn make_client(env: &Env) -> (Address, CRLContractClient) {
    let contract_id = env.register_contract(None, CRLContract);
    let client = CRLContractClient::new(env, &contract_id);
    (contract_id, client)
}

/// Issue a certificate on the CertificateContract so it exists for CRL operations.
fn issue_cert(env: &Env, cert_client: &CertificateContractClient, issuer: &Address, id: &str) {
    cert_client.issue_certificate(
        &String::from_str(env, id),
        issuer,
        issuer,
        &String::from_str(env, "ipfs://meta"),
        &None,
    );
}

fn setup_env() -> (Env, Address, Address) {
    let env = Env::default();
    let (cert_contract, _admin, issuer) = setup_certificate(&env);
    (env, cert_contract, issuer)
}

// ─── Initialization ───────────────────────────────────────────────────────────

#[test]
fn test_crl_initialization() {
    let (env, cert_contract, issuer) = setup_env();
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    let crl = client.get_crl_info();
    assert_eq!(crl.issuer, issuer);
    assert_eq!(crl.revoked_count, 0);
    assert_eq!(crl.crl_number, 1);
    assert_eq!(crl.merkle_root.len(), 64);
}

#[test]
fn test_double_initialize_fails() {
    let (env, cert_contract, issuer) = setup_env();
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);
    assert!(client.try_init_crl(&issuer, &cert_contract).is_err());
}

// ─── Revocation ───────────────────────────────────────────────────────────────

#[test]
fn test_revoke_certificate() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    issue_cert(&env, &cert_client, &issuer, "CERT-001");

    let cert_id = String::from_str(&env, "CERT-001");
    client.revoke(&issuer, &cert_id, &RevocationReason::KeyCompromise, &None);

    assert!(client.is_revoked(&cert_id));

    let info = client.get_revocation_info(&cert_id).unwrap();
    assert_eq!(info.certificate_id, cert_id);
    assert_eq!(info.reason, RevocationReason::KeyCompromise as u32);
    assert_eq!(info.issuer, issuer);

    let crl = client.get_crl_info();
    assert_eq!(crl.revoked_count, 1);
    assert_eq!(crl.crl_number, 2);
}

#[test]
fn test_non_revoked_certificate_returns_false() {
    let (env, cert_contract, issuer) = setup_env();
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    let cert_id = String::from_str(&env, "CERT-999");
    assert!(!client.is_revoked(&cert_id));
    assert!(client.get_revocation_info(&cert_id).is_none());
}

#[test]
fn test_duplicate_revocation_fails() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    issue_cert(&env, &cert_client, &issuer, "CERT-001");

    let cert_id = String::from_str(&env, "CERT-001");
    client.revoke(&issuer, &cert_id, &RevocationReason::KeyCompromise, &None);
    assert!(client.try_revoke(&issuer, &cert_id, &RevocationReason::KeyCompromise, &None)
        .is_err());
}

#[test]
fn test_revoke_multiple_certificates() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    for id in ["CERT-001", "CERT-002", "CERT-003"] {
        issue_cert(&env, &cert_client, &issuer, id);
    }

    client.revoke(
        &issuer,
        &String::from_str(&env, "CERT-001"),
        &RevocationReason::KeyCompromise,
        &None,
    );
    client.revoke(
        &issuer,
        &String::from_str(&env, "CERT-002"),
        &RevocationReason::CACompromise,
        &None,
    );
    client.revoke(
        &issuer,
        &String::from_str(&env, "CERT-003"),
        &RevocationReason::Superseded,
        &None,
    );

    assert_eq!(client.get_revoked_count(), 3);
    assert_eq!(client.get_crl_info().crl_number, 4);
}

// ─── Verification ─────────────────────────────────────────────────────────────

#[test]
fn test_verify_certificate_not_revoked() {
    let (env, cert_contract, issuer) = setup_env();
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    let cert_id = String::from_str(&env, "CERT-001");
    let (is_revoked, crl_number) = client.verify_certificate(&cert_id);
    assert!(!is_revoked);
    assert_eq!(crl_number, 1);
}

#[test]
fn test_verify_certificate_after_revocation() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    issue_cert(&env, &cert_client, &issuer, "CERT-001");

    let cert_id = String::from_str(&env, "CERT-001");
    client.revoke(&issuer, &cert_id, &RevocationReason::KeyCompromise, &None);

    let (is_revoked, crl_number) = client.verify_certificate(&cert_id);
    assert!(is_revoked);
    assert_eq!(crl_number, 2);
}

// ─── Merkle root ─────────────────────────────────────────────────────────────

#[test]
fn test_merkle_root_is_64_hex_chars() {
    let (env, cert_contract, issuer) = setup_env();
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);
    assert_eq!(client.get_merkle_root().len(), 64);
}

#[test]
fn test_merkle_root_changes_on_revocation() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    for id in ["CERT-001", "CERT-002"] {
        issue_cert(&env, &cert_client, &issuer, id);
    }

    let root_before = client.get_merkle_root();

    client.revoke(
        &issuer,
        &String::from_str(&env, "CERT-001"),
        &RevocationReason::KeyCompromise,
        &None,
    );
    let root_after_one = client.get_merkle_root();
    assert_ne!(root_before, root_after_one);

    client.revoke(
        &issuer,
        &String::from_str(&env, "CERT-002"),
        &RevocationReason::KeyCompromise,
        &None,
    );
    let root_after_two = client.get_merkle_root();
    assert_ne!(root_after_one, root_after_two);
}

#[test]
fn test_merkle_root_is_deterministic() {
    let env = Env::default();
    env.mock_all_auths();
    let issuer_a = Address::generate(&env);
    let issuer_b = Address::generate(&env);
    let cert_contract = env.register_contract(None, CertificateContract);
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    cert_client.initialize(&issuer_a);
    cert_client.add_issuer(&issuer_a);
    cert_client.add_issuer(&issuer_b);

    let crl_a_id = env.register_contract(None, CRLContract);
    let client_a = CRLContractClient::new(&env, &crl_a_id);
    client_a.init_crl(&issuer_a, &cert_contract);

    let crl_b_id = env.register_contract(None, CRLContract);
    let client_b = CRLContractClient::new(&env, &crl_b_id);
    client_b.init_crl(&issuer_b, &cert_contract);

    for id in ["ALPHA", "BETA", "GAMMA"] {
        cert_client.issue_certificate(
            &String::from_str(&env, id),
            &issuer_a,
            &issuer_a,
            &String::from_str(&env, "ipfs://meta"),
            &None,
        );
        client_a.revoke(
            &issuer_a,
            &String::from_str(&env, id),
            &RevocationReason::KeyCompromise,
            &None,
        );
        client_b.revoke(
            &issuer_b,
            &String::from_str(&env, id),
            &RevocationReason::KeyCompromise,
            &None,
        );
    }

    assert_eq!(client_a.get_merkle_root(), client_b.get_merkle_root());
}

#[test]
fn test_merkle_root_odd_number_of_leaves() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    for id in ["ID-0", "ID-1", "ID-2"] {
        issue_cert(&env, &cert_client, &issuer, id);
    }

    client.revoke(
        &issuer,
        &String::from_str(&env, "ID-0"),
        &RevocationReason::Superseded,
        &None,
    );
    client.revoke(
        &issuer,
        &String::from_str(&env, "ID-1"),
        &RevocationReason::Superseded,
        &None,
    );
    client.revoke(
        &issuer,
        &String::from_str(&env, "ID-2"),
        &RevocationReason::Superseded,
        &None,
    );
    let root_odd = client.get_merkle_root();
    assert_eq!(root_odd.len(), 64);

    issue_cert(&env, &cert_client, &issuer, "ID-3");
    client.revoke(
        &issuer,
        &String::from_str(&env, "ID-3"),
        &RevocationReason::Superseded,
        &None,
    );
    let root_even = client.get_merkle_root();
    assert_eq!(root_even.len(), 64);
    assert_ne!(root_odd, root_even);
}

// ─── Merkle proof verification (off-chain root + on-chain proof) ─────────────

fn sha256_bytes(env: &Env, data: &[u8]) -> BytesN<32> {
    env.crypto().sha256(&Bytes::from_slice(env, data)).into()
}

fn cert_leaf_hash(env: &Env, id: &str) -> BytesN<32> {
    sha256_bytes(env, id.as_bytes())
}

fn hash_pair(env: &Env, left: &BytesN<32>, right: &BytesN<32>) -> BytesN<32> {
    let mut combined = [0u8; 64];
    combined[..32].copy_from_slice(&left.to_array());
    combined[32..].copy_from_slice(&right.to_array());
    sha256_bytes(env, &combined)
}

fn to_hex(env: &Env, hash: &BytesN<32>) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let arr = hash.to_array();
    let mut out = [0u8; 64];
    let mut i = 0usize;
    while i < 32 {
        out[i * 2] = HEX[(arr[i] >> 4) as usize];
        out[i * 2 + 1] = HEX[(arr[i] & 0xf) as usize];
        i += 1;
    }
    String::from_str(env, unsafe { core::str::from_utf8_unchecked(&out) })
}

#[test]
fn test_verify_merkle_proof_single_leaf() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    issue_cert(&env, &cert_client, &issuer, "CERT-001");
    client.revoke(
        &issuer,
        &String::from_str(&env, "CERT-001"),
        &RevocationReason::KeyCompromise,
        &None,
    );

    // A single-leaf tree's root is the leaf hash; the proof is empty.
    let empty_proof = vec![&env];
    assert!(client.verify_merkle_proof(&String::from_str(&env, "CERT-001"), &empty_proof, &0));
    assert!(!client.verify_merkle_proof(&String::from_str(&env, "CERT-999"), &empty_proof, &0));
}

#[test]
fn test_verify_merkle_proof_two_leaves() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    for id in ["CERT-001", "CERT-002"] {
        issue_cert(&env, &cert_client, &issuer, id);
        client.revoke(
            &issuer,
            &String::from_str(&env, id),
            &RevocationReason::KeyCompromise,
            &None,
        );
    }

    // Proof for leaf 0 ("CERT-001") is its sibling's digest ("CERT-002").
    let proof = vec![&env, cert_leaf_hash(&env, "CERT-002")];
    assert!(client.verify_merkle_proof(&String::from_str(&env, "CERT-001"), &proof, &0));

    // A proof for the wrong leaf must not validate.
    assert!(!client.verify_merkle_proof(&String::from_str(&env, "CERT-999"), &proof, &0));
}

#[test]
fn test_verify_merkle_proof_rejects_wrong_index() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    for id in ["CERT-001", "CERT-002"] {
        issue_cert(&env, &cert_client, &issuer, id);
        client.revoke(
            &issuer,
            &String::from_str(&env, id),
            &RevocationReason::KeyCompromise,
            &None,
        );
    }

    let proof = vec![&env, cert_leaf_hash(&env, "CERT-002")];
    // leaf_index 1 flips sibling/current order, producing a different root.
    assert!(!client.verify_merkle_proof(&String::from_str(&env, "CERT-001"), &proof, &1));
}

#[test]
fn test_publish_merkle_root_and_verify_offchain() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    for id in ["CERT-001", "CERT-002"] {
        issue_cert(&env, &cert_client, &issuer, id);
        client.revoke(
            &issuer,
            &String::from_str(&env, id),
            &RevocationReason::KeyCompromise,
            &None,
        );
    }

    // Compute the root entirely off-chain.
    let leaf0 = cert_leaf_hash(&env, "CERT-001");
    let leaf1 = cert_leaf_hash(&env, "CERT-002");
    let offchain_root = to_hex(&env, &hash_pair(&env, &leaf0, &leaf1));

    // Publishing the off-chain root overrides the on-chain-computed value.
    client.publish_merkle_root(&offchain_root);
    assert_eq!(client.get_merkle_root(), offchain_root);

    // A proof now verifies against the published root.
    let proof = vec![&env, leaf1];
    assert!(client.verify_merkle_proof(&String::from_str(&env, "CERT-001"), &proof, &0));
}

// ─── Pagination ───────────────────────────────────────────────────────────────

#[test]
fn test_get_revoked_certificates_pagination() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    for id in ["CERT-0", "CERT-1", "CERT-2", "CERT-3", "CERT-4", "CERT-5", "CERT-6"] {
        issue_cert(&env, &cert_client, &issuer, id);
    }

    for id in ["CERT-0", "CERT-1", "CERT-2", "CERT-3", "CERT-4", "CERT-5", "CERT-6"] {
        client.revoke(
            &issuer,
            &String::from_str(&env, id),
            &RevocationReason::KeyCompromise,
            &None,
        );
    }

    let page0 = client.get_revoked_certificates(&0, &3);
    assert_eq!(page0.len(), 3);

    let page1 = client.get_revoked_certificates(&1, &3);
    assert_eq!(page1.len(), 3);

    let page2 = client.get_revoked_certificates(&2, &3);
    assert_eq!(page2.len(), 1);

    let page3 = client.get_revoked_certificates(&3, &3);
    assert_eq!(page3.len(), 0);
}

#[test]
fn test_get_revoked_certificates_zero_limit() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    issue_cert(&env, &cert_client, &issuer, "CERT-001");

    client.revoke(
        &issuer,
        &String::from_str(&env, "CERT-001"),
        &RevocationReason::KeyCompromise,
        &None,
    );

    let result = client.get_revoked_certificates(&0, &0);
    assert_eq!(result.len(), 0);
}

// ─── CRL metadata update ──────────────────────────────────────────────────────

#[test]
fn test_update_crl_metadata_changes_next_update() {
    let (env, cert_contract, issuer) = setup_env();
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    let original = client.get_crl_info().next_update;
    client.update_crl_metadata(&Some(original + 3600), &None);
    assert!(client.get_crl_info().next_update > original);
}

#[test]
fn test_needs_update_false_after_init() {
    let (env, cert_contract, issuer) = setup_env();
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);
    assert!(!client.needs_update());
}

// ─── Admin ────────────────────────────────────────────────────────────────────

#[test]
fn test_set_admin_allows_revocation() {
    let (env, cert_contract, issuer) = setup_env();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.init_crl(&issuer, &cert_contract);

    issue_cert(&env, &cert_client, &issuer, "CERT-001");

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    let cert_id = String::from_str(&env, "CERT-001");
    client.revoke(
        &admin,
        &cert_id,
        &RevocationReason::AffiliationChanged,
        &None,
    );
    assert!(client.is_revoked(&cert_id));
}

#[test]
fn test_get_crl_info_returns_error_when_not_initialized() {
    let (env, _cert_contract, _issuer) = setup_env();
    let (_, client) = make_client(&env);

    assert_eq!(client.try_get_crl_info(), Err(Ok(ContractError::NotFound)));
}
