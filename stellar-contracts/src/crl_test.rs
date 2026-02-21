#![cfg(test)]
use super::crl::*;
use soroban_sdk::{Env, testutils::Address as _, Address, String, Vec};

#[test]
fn test_crl_initialization() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CRLContract);
    let client = CRLContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    
    env.mock_all_auths();
    client.initialize(&issuer);

    let crl = client.get_crl_info();
    assert_eq!(crl.issuer, issuer);
    assert_eq!(crl.revoked_certificates.len(), 0);
    assert_eq!(crl.crl_number, 1);
    assert!(crl.merkle_root.is_some());
}

#[test]
fn test_revoke_certificate() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CRLContract);
    let client = CRLContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let cert_id = String::from_str(&env, "CERT-001");
    let reason = RevocationReason::KeyCompromise;
    
    env.mock_all_auths();
    client.initialize(&issuer);
    
    // Revoke certificate
    client.revoke_certificate(&cert_id, &reason, &None);
    
    // Check if revoked
    assert!(client.is_revoked(&cert_id));
    
    // Get revocation info
    let info = client.get_revocation_info(&cert_id);
    assert!(info.is_some());
    let info = info.unwrap();
    assert_eq!(info.certificate_id, cert_id);
    assert_eq!(info.reason, reason);
    assert_eq!(info.issuer, issuer);
    
    // Check CRL updated
    let crl = client.get_crl_info();
    assert_eq!(crl.revoked_certificates.len(), 1);
    assert_eq!(crl.crl_number, 2); // Should increment
}

#[test]
fn test_multiple_revocations() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CRLContract);
    let client = CRLContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    
    env.mock_all_auths();
    client.initialize(&issuer);
    
    // Revoke multiple certificates
    let cert1 = String::from_str(&env, "CERT-001");
    let cert2 = String::from_str(&env, "CERT-002");
    let cert3 = String::from_str(&env, "CERT-003");
    
    client.revoke_certificate(&cert1, &RevocationReason::KeyCompromise, &None);
    client.revoke_certificate(&cert2, &RevocationReason::CACompromise, &None);
    client.revoke_certificate(&cert3, &RevocationReason::Superseded, &None);
    
    // Check all are revoked
    assert!(client.is_revoked(&cert1));
    assert!(client.is_revoked(&cert2));
    assert!(client.is_revoked(&cert3));
    
    // Check count
    assert_eq!(client.get_revoked_count(), 3);
    
    // Check CRL number incremented properly
    let crl = client.get_crl_info();
    assert_eq!(crl.crl_number, 4);
}

#[test]
fn test_unrevoke_certificate() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CRLContract);
    let client = CRLContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let cert_id = String::from_str(&env, "CERT-001");
    
    env.mock_all_auths();
    client.initialize(&issuer);
    
    // Revoke first
    client.revoke_certificate(&cert_id, &RevocationReason::KeyCompromise, &None);
    assert!(client.is_revoked(&cert_id));
    assert_eq!(client.get_revoked_count(), 1);
    
    // Unrevoke
    client.unrevoke_certificate(&cert_id);
    assert!(!client.is_revoked(&cert_id));
    assert_eq!(client.get_revoked_count(), 0);
    
    // CRL number should increment
    let crl = client.get_crl_info();
    assert_eq!(crl.crl_number, 3);
}

#[test]
fn test_revocation_reasons() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CRLContract);
    let client = CRLContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let cert_id = String::from_str(&env, "CERT-001");
    
    env.mock_all_auths();
    client.initialize(&issuer);
    
    // Test different revocation reasons
    let reasons = vec![
        RevocationReason::KeyCompromise,
        RevocationReason::CACompromise,
        RevocationReason::AffiliationChanged,
        RevocationReason::Superseded,
        RevocationReason::CessationOfOperation,
        RevocationReason::CertificateHold,
        RevocationReason::PrivilegeWithdrawn,
        RevocationReason::AACompromise,
        RevocationReason::Other(String::from_str(&env, "Custom reason")),
    ];
    
    for (i, reason) in reasons.iter().enumerate() {
        let cert_id = String::from_str(&env, &format!("CERT-{:03}", i));
        client.revoke_certificate(&cert_id, reason, &None);
        let info = client.get_revocation_info(&cert_id).unwrap();
        assert_eq!(&info.reason, reason);
    }
}

#[test]
fn test_paginated_retrieval() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CRLContract);
    let client = CRLContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    
    env.mock_all_auths();
    client.initialize(&issuer);
    
    // Add 15 certificates
    for i in 0..15 {
        let cert_id = String::from_str(&env, &format!("CERT-{:03}", i));
        client.revoke_certificate(&cert_id, &RevocationReason::KeyCompromise, &None);
    }
    
    // Test pagination
    let page1 = client.get_revoked_certificates(&Pagination { page: 0, limit: 5 });
    assert_eq!(page1.data.len(), 5);
    assert_eq!(page1.total, 15);
    assert_eq!(page1.page, 0);
    assert_eq!(page1.limit, 5);
    assert!(page1.has_next);
    
    let page2 = client.get_revoked_certificates(&Pagination { page: 1, limit: 5 });
    assert_eq!(page2.data.len(), 5);
    assert!(page2.has_next);
    
    let page3 = client.get_revoked_certificates(&Pagination { page: 2, limit: 5 });
    assert_eq!(page3.data.len(), 5);
    assert!(!page3.has_next);
    
    // Test page beyond end
    let page4 = client.get_revoked_certificates(&Pagination { page: 3, limit: 5 });
    assert_eq!(page4.data.len(), 0);
    assert!(!page4.has_next);
}

#[test]
fn test_verify_certificate() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CRLContract);
    let client = CRLContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let cert_id = String::from_str(&env, "CERT-001");
    
    env.mock_all_auths();
    client.initialize(&issuer);
    
    // Verify non-revoked certificate
    let result = client.verify_certificate(&cert_id);
    assert!(!result.is_revoked);
    assert!(result.revocation_info.is_none());
    assert_eq!(result.crl_number, 1);
    
    // Revoke and verify
    client.revoke_certificate(&cert_id, &RevocationReason::KeyCompromise, &None);
    let result = client.verify_certificate(&cert_id);
    assert!(result.is_revoked);
    assert!(result.revocation_info.is_some());
    assert_eq!(result.crl_number, 2);
}

#[test]
fn test_merkle_root_updates() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CRLContract);
    let client = CRLContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    
    env.mock_all_auths();
    client.initialize(&issuer);
    
    let initial_root = client.get_merkle_root();
    assert!(initial_root.is_some());
    
    // Add certificates and check root changes
    let root1 = client.get_merkle_root().unwrap();
    client.revoke_certificate(&String::from_str(&env, "CERT-001"), &RevocationReason::KeyCompromise, &None);
    let root2 = client.get_merkle_root().unwrap();
    assert_ne!(root1, root2);
    
    client.revoke_certificate(&String::from_str(&env, "CERT-002"), &RevocationReason::KeyCompromise, &None);
    let root3 = client.get_merkle_root().unwrap();
    assert_ne!(root2, root3);
    
    // Remove certificate and check root changes again
    client.unrevoke_certificate(&String::from_str(&env, "CERT-001"));
    let root4 = client.get_merkle_root().unwrap();
    assert_ne!(root3, root4);
}

#[test]
fn test_crl_metadata_updates() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CRLContract);
    let client = CRLContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    
    env.mock_all_auths();
    client.initialize(&issuer);
    
    let original_crl = client.get_crl_info();
    let original_update = original_crl.next_update;
    
    // Update next update time
    let new_update = original_update + 3600; // 1 hour later
    client.update_crl_metadata(&Some(new_update), &None);
    
    let updated_crl = client.get_crl_info();
    assert_eq!(updated_crl.next_update, new_update);
    assert_eq!(updated_crl.crl_number, 2); // Should increment
    
    // Test needs_update
    assert!(!client.needs_update()); // Should not need update yet
}

#[test]
#[should_panic(expected = "Certificate already revoked")]
fn test_duplicate_revocation_panics() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CRLContract);
    let client = CRLContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let cert_id = String::from_str(&env, "CERT-001");
    
    env.mock_all_auths();
    client.initialize(&issuer);
    client.revoke_certificate(&cert_id, &RevocationReason::KeyCompromise, &None);
    
    // Try to revoke again - should panic
    client.revoke_certificate(&cert_id, &RevocationReason::KeyCompromise, &None);
}

#[test]
#[should_panic(expected = "Certificate not found in revocation list")]
fn test_unrevoke_nonexistent_panics() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CRLContract);
    let client = CRLContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let cert_id = String::from_str(&env, "CERT-001");
    
    env.mock_all_auths();
    client.initialize(&issuer);
    
    // Try to unrevoke non-existent certificate - should panic
    client.unrevoke_certificate(&cert_id);
}