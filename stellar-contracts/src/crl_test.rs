#![cfg(test)]

use super::crl::*;
use crate::{CertificateContract, CertificateContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

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
    env.mock_all_auths();
    let issuer = Address::generate(&env);
    let cert_contract = env.register_contract(None, CertificateContract);
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    cert_client.initialize(&issuer);
    cert_client.add_issuer(&issuer);
    (env, cert_contract, issuer)
}

fn setup_env_and_cert() -> (Env, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let issuer = Address::generate(&env);
    let cert_contract = env.register_contract(None, CertificateContract);
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    cert_client.initialize(&issuer);
    cert_client.add_issuer(&issuer);
    (env, cert_contract, issuer)
}

// ─── Initialization ───────────────────────────────────────────────────────────

#[test]
fn test_crl_initialization() {
    let (env, cert_contract, issuer) = setup_env();
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);

    let crl = client.get_crl_info();
    assert_eq!(crl.issuer, issuer);
    assert_eq!(crl.revoked_count, 0);
    assert_eq!(crl.crl_number, 1);
    assert_eq!(crl.merkle_root.len(), 64);
}

#[test]
#[should_panic(expected = "CRL already initialized")]
fn test_double_initialize_panics() {
    let (env, cert_contract, issuer) = setup_env();
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);
    client.initialize(&issuer, &cert_contract);
}

// ─── Revocation ───────────────────────────────────────────────────────────────

#[test]
fn test_revoke_certificate() {
    let (env, cert_contract, issuer) = setup_env_and_cert();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);

    issue_cert(&env, &cert_client, &issuer, "CERT-001");

    let cert_id = String::from_str(&env, "CERT-001");
    client.revoke_certificate(&issuer, &cert_id, &RevocationReason::KeyCompromise, &None);

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
    client.initialize(&issuer, &cert_contract);

    let cert_id = String::from_str(&env, "CERT-999");
    assert!(!client.is_revoked(&cert_id));
    assert!(client.get_revocation_info(&cert_id).is_none());
}

#[test]
#[should_panic(expected = "Certificate already revoked")]
fn test_duplicate_revocation_panics() {
    let (env, cert_contract, issuer) = setup_env_and_cert();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);

    issue_cert(&env, &cert_client, &issuer, "CERT-001");

    let cert_id = String::from_str(&env, "CERT-001");
    client.revoke_certificate(&issuer, &cert_id, &RevocationReason::KeyCompromise, &None);
    client.revoke_certificate(&issuer, &cert_id, &RevocationReason::KeyCompromise, &None);
}

#[test]
fn test_revoke_multiple_certificates() {
    let (env, cert_contract, issuer) = setup_env_and_cert();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);

    for id in ["CERT-001", "CERT-002", "CERT-003"] {
        issue_cert(&env, &cert_client, &issuer, id);
    }

    client.revoke_certificate(
        &issuer,
        &String::from_str(&env, "CERT-001"),
        &RevocationReason::KeyCompromise,
        &None,
    );
    client.revoke_certificate(
        &issuer,
        &String::from_str(&env, "CERT-002"),
        &RevocationReason::CACompromise,
        &None,
    );
    client.revoke_certificate(
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
    client.initialize(&issuer, &cert_contract);

    let cert_id = String::from_str(&env, "CERT-001");
    let (is_revoked, crl_number) = client.verify_certificate(&cert_id);
    assert!(!is_revoked);
    assert_eq!(crl_number, 1);
}

#[test]
fn test_verify_certificate_after_revocation() {
    let (env, cert_contract, issuer) = setup_env_and_cert();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);

    issue_cert(&env, &cert_client, &issuer, "CERT-001");

    let cert_id = String::from_str(&env, "CERT-001");
    client.revoke_certificate(&issuer, &cert_id, &RevocationReason::KeyCompromise, &None);

    let (is_revoked, crl_number) = client.verify_certificate(&cert_id);
    assert!(is_revoked);
    assert_eq!(crl_number, 2);
}

// ─── Merkle root ─────────────────────────────────────────────────────────────

#[test]
fn test_merkle_root_is_64_hex_chars() {
    let (env, cert_contract, issuer) = setup_env();
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);
    assert_eq!(client.get_merkle_root().len(), 64);
}

#[test]
fn test_merkle_root_changes_on_revocation() {
    let (env, cert_contract, issuer) = setup_env_and_cert();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);

    for id in ["CERT-001", "CERT-002"] {
        issue_cert(&env, &cert_client, &issuer, id);
    }

    let root_before = client.get_merkle_root();

    client.revoke_certificate(
        &issuer,
        &String::from_str(&env, "CERT-001"),
        &RevocationReason::KeyCompromise,
        &None,
    );
    let root_after_one = client.get_merkle_root();
    assert_ne!(root_before, root_after_one);

    client.revoke_certificate(
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
    client_a.initialize(&issuer_a, &cert_contract);

    let crl_b_id = env.register_contract(None, CRLContract);
    let client_b = CRLContractClient::new(&env, &crl_b_id);
    client_b.initialize(&issuer_b, &cert_contract);

    for id in ["ALPHA", "BETA", "GAMMA"] {
        cert_client.issue_certificate(
            &String::from_str(&env, id),
            &issuer_a,
            &issuer_a,
            &String::from_str(&env, "ipfs://meta"),
            &None,
        );
        client_a.revoke_certificate(
            &issuer_a,
            &String::from_str(&env, id),
            &RevocationReason::KeyCompromise,
            &None,
        );
        client_b.revoke_certificate(
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
    let (env, cert_contract, issuer) = setup_env_and_cert();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);

    for id in ["ID-0", "ID-1", "ID-2"] {
        issue_cert(&env, &cert_client, &issuer, id);
    }

    client.revoke_certificate(
        &issuer,
        &String::from_str(&env, "ID-0"),
        &RevocationReason::Superseded,
        &None,
    );
    client.revoke_certificate(
        &issuer,
        &String::from_str(&env, "ID-1"),
        &RevocationReason::Superseded,
        &None,
    );
    client.revoke_certificate(
        &issuer,
        &String::from_str(&env, "ID-2"),
        &RevocationReason::Superseded,
        &None,
    );
    let root_odd = client.get_merkle_root();
    assert_eq!(root_odd.len(), 64);

    issue_cert(&env, &cert_client, &issuer, "ID-3");
    client.revoke_certificate(
        &issuer,
        &String::from_str(&env, "ID-3"),
        &RevocationReason::Superseded,
        &None,
    );
    let root_even = client.get_merkle_root();
    assert_eq!(root_even.len(), 64);
    assert_ne!(root_odd, root_even);
}

// ─── Pagination ───────────────────────────────────────────────────────────────

#[test]
fn test_get_revoked_certificates_pagination() {
    let (env, cert_contract, issuer) = setup_env_and_cert();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);

    for id in ["CERT-0", "CERT-1", "CERT-2", "CERT-3", "CERT-4", "CERT-5", "CERT-6"] {
        issue_cert(&env, &cert_client, &issuer, id);
    }

    for id in ["CERT-0", "CERT-1", "CERT-2", "CERT-3", "CERT-4", "CERT-5", "CERT-6"] {
        client.revoke_certificate(
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
    let (env, cert_contract, issuer) = setup_env_and_cert();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);

    issue_cert(&env, &cert_client, &issuer, "CERT-001");

    client.revoke_certificate(
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
    client.initialize(&issuer, &cert_contract);

    let original = client.get_crl_info().next_update;
    client.update_crl_metadata(&Some(original + 3600), &None);
    assert!(client.get_crl_info().next_update > original);
}

#[test]
fn test_needs_update_false_after_init() {
    let (env, cert_contract, issuer) = setup_env();
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);
    assert!(!client.needs_update());
}

// ─── Admin ────────────────────────────────────────────────────────────────────

#[test]
fn test_set_admin_allows_revocation() {
    let (env, cert_contract, issuer) = setup_env_and_cert();
    let cert_client = CertificateContractClient::new(&env, &cert_contract);
    let (_, client) = make_client(&env);
    client.initialize(&issuer, &cert_contract);

    issue_cert(&env, &cert_client, &issuer, "CERT-001");

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    let cert_id = String::from_str(&env, "CERT-001");
    client.revoke_certificate(
        &admin,
        &cert_id,
        &RevocationReason::AffiliationChanged,
        &None,
    );
    assert!(client.is_revoked(&cert_id));
}
