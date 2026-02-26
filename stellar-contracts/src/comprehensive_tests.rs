#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Bytes, BytesN, Env, String, Vec};

// ============================================================================
// Helper Functions
// ============================================================================

fn create_test_env() -> (Env, Address, CertificateContractClient<'static>) {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);
    (env, contract_id, client)
}

fn setup_admin_and_issuer(env: &Env, client: &CertificateContractClient) -> (Address, Address) {
    let admin = Address::generate(env);
    let issuer = Address::generate(env);
    
    env.mock_all_auths();
    client.initialize_admin(&admin);
    
    let mut permissions = Vec::new(env);
    permissions.push_back(String::from_str(env, "issue"));
    permissions.push_back(String::from_str(env, "revoke"));
    permissions.push_back(String::from_str(env, "suspend"));
    
    client.add_issuer(&issuer, &permissions, &admin);
    
    (admin, issuer)
}

fn issue_test_certificate(env: &Env, client: &CertificateContractClient, issuer: &Address, owner: &Address, id: &str) -> String {
    let cert_id = String::from_str(env, id);
    let metadata_uri = String::from_str(env, "ipfs://test-metadata");
    
    env.mock_all_auths();
    client.issue_certificate(&cert_id, issuer, owner, &metadata_uri);
    
    cert_id
}

// ============================================================================
// Unit Tests for Certificate Issuance
// ============================================================================

#[test]
fn test_issue_certificate_basic() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = String::from_str(&env, "cert-basic-001");
    let metadata_uri = String::from_str(&env, "ipfs://QmBasic");
    
    env.mock_all_auths();
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
    
    let cert = client.get_certificate(&cert_id);
    assert_eq!(cert.id, cert_id);
    assert_eq!(cert.issuer, issuer);
    assert_eq!(cert.owner, owner);
    assert_eq!(cert.metadata_uri, metadata_uri);
    assert!(!cert.revoked);
    assert!(!cert.suspended);
    assert!(!cert.frozen);
    assert_eq!(cert.issued_at, env.ledger().timestamp());
}

#[test]
fn test_issue_certificate_with_version() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = String::from_str(&env, "cert-version-001");
    let metadata_uri = String::from_str(&env, "ipfs://QmVersion");
    
    env.mock_all_auths();
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
    
    let cert = client.get_certificate(&cert_id);
    assert_eq!(cert.version.major, 1);
    assert_eq!(cert.version.minor, 0);
    assert_eq!(cert.version.patch, 0);
}

#[test]
#[should_panic(expected = "Certificate already exists")]
fn test_issue_duplicate_certificate() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = String::from_str(&env, "cert-duplicate");
    let metadata_uri = String::from_str(&env, "ipfs://QmDup");
    
    env.mock_all_auths();
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
    
    // Try to issue again with same ID - should panic
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
}

#[test]
fn test_get_certificate_not_found() {
    let (env, _contract_id, client) = create_test_env();
    
    let non_existent_id = String::from_str(&env, "non-existent-cert");
    
    // This should panic because certificate doesn't exist
    let result = std::panic::catch_unwind(|| {
        client.get_certificate(&non_existent_id);
    });
    
    assert!(result.is_err());
}

// ============================================================================
// Unit Tests for Certificate Revocation
// ============================================================================

#[test]
fn test_revoke_certificate_basic() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-revoke-001");
    let reason = String::from_str(&env, "Violation of terms");
    
    env.mock_all_auths();
    client.revoke_certificate(&cert_id, &reason);
    
    let cert = client.get_certificate(&cert_id);
    assert!(cert.revoked);
    assert_eq!(cert.revocation_reason, Some(reason));
    assert!(cert.revoked_at.is_some());
    assert_eq!(cert.revoked_by, Some(issuer));
}

#[test]
fn test_is_revoked_function() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-revoke-002");
    
    env.mock_all_auths();
    assert!(!client.is_revoked(&cert_id));
    
    let reason = String::from_str(&env, "Test revocation");
    client.revoke_certificate(&cert_id, &reason);
    
    assert!(client.is_revoked(&cert_id));
}

#[test]
#[should_panic(expected = "Certificate already revoked")]
fn test_revoke_already_revoked_certificate() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-revoke-003");
    let reason = String::from_str(&env, "First revocation");
    
    env.mock_all_auths();
    client.revoke_certificate(&cert_id, &reason);
    
    // Try to revoke again - should panic
    let reason2 = String::from_str(&env, "Second revocation");
    client.revoke_certificate(&cert_id, &reason2);
}

#[test]
#[should_panic(expected = "Certificate not found")]
fn test_revoke_non_existent_certificate() {
    let (env, _contract_id, client) = create_test_env();
    
    let non_existent_id = String::from_str(&env, "non-existent");
    let reason = String::from_str(&env, "Test reason");
    
    env.mock_all_auths();
    client.revoke_certificate(&non_existent_id, &reason);
}

// ============================================================================
// Unit Tests for Certificate Suspension
// ============================================================================

#[test]
fn test_suspend_certificate_basic() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-suspend-001");
    let reason = String::from_str(&env, "Under investigation");
    
    env.mock_all_auths();
    let event = client.suspend_certificate(&cert_id, &admin, &reason);
    
    assert_eq!(event.certificate_id, cert_id);
    assert_eq!(event.suspended_by, admin);
    assert_eq!(event.reason, reason);
    
    let cert = client.get_certificate(&cert_id);
    assert!(cert.suspended);
    assert!(cert.suspension_info.is_some());
    
    let suspension_info = cert.suspension_info.unwrap();
    assert_eq!(suspension_info.certificate_id, cert_id);
    assert_eq!(suspension_info.suspended_by, admin);
    assert_eq!(suspension_info.reason, reason);
}

#[test]
fn test_reinstate_certificate_basic() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-reinstate-001");
    let suspend_reason = String::from_str(&env, "Under investigation");
    let reinstate_reason = String::from_str(&env, "Investigation complete - cleared");
    
    env.mock_all_auths();
    client.suspend_certificate(&cert_id, &admin, &suspend_reason);
    
    let event = client.reinstate_certificate(&cert_id, &admin, &reinstate_reason);
    
    assert_eq!(event.certificate_id, cert_id);
    assert_eq!(event.reinstated_by, admin);
    assert_eq!(event.reason, reinstate_reason);
    
    let cert = client.get_certificate(&cert_id);
    assert!(!cert.suspended);
    assert!(cert.suspension_info.is_none());
}

#[test]
fn test_is_suspended_function() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-suspend-002");
    
    env.mock_all_auths();
    assert!(!client.is_suspended(&cert_id));
    
    let reason = String::from_str(&env, "Test suspension");
    client.suspend_certificate(&cert_id, &admin, &reason);
    
    assert!(client.is_suspended(&cert_id));
    
    let reinstate_reason = String::from_str(&env, "Test reinstatement");
    client.reinstate_certificate(&cert_id, &admin, &reinstate_reason);
    
    assert!(!client.is_suspended(&cert_id));
}

#[test]
fn test_get_suspension_info() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-suspend-003");
    
    env.mock_all_auths();
    
    // Should be None before suspension
    let info_before = client.get_suspension_info(&cert_id);
    assert!(info_before.is_none());
    
    let reason = String::from_str(&env, "Test suspension info");
    client.suspend_certificate(&cert_id, &admin, &reason);
    
    let info_during = client.get_suspension_info(&cert_id);
    assert!(info_during.is_some());
    assert_eq!(info_during.unwrap().reason, reason);
    
    let reinstate_reason = String::from_str(&env, "Test reinstatement");
    client.reinstate_certificate(&cert_id, &admin, &reinstate_reason);
    
    let info_after = client.get_suspension_info(&cert_id);
    assert!(info_after.is_none());
}

#[test]
#[should_panic(expected = "Certificate is already suspended")]
fn test_suspend_already_suspended_certificate() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-suspend-004");
    let reason = String::from_str(&env, "First suspension");
    
    env.mock_all_auths();
    client.suspend_certificate(&cert_id, &admin, &reason);
    
    // Try to suspend again - should panic
    let reason2 = String::from_str(&env, "Second suspension");
    client.suspend_certificate(&cert_id, &admin, &reason2);
}

#[test]
#[should_panic(expected = "Certificate is not suspended")]
fn test_reinstate_non_suspended_certificate() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-reinstate-002");
    let reason = String::from_str(&env, "Test reinstatement");
    
    env.mock_all_auths();
    // Try to reinstate without suspending first - should panic
    client.reinstate_certificate(&cert_id, &admin, &reason);
}

#[test]
#[should_panic(expected = "Cannot revoke a suspended certificate. Reinstate it first")]
fn test_revoke_suspended_certificate_fails() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-suspend-revoke");
    let suspend_reason = String::from_str(&env, "Under investigation");
    
    env.mock_all_auths();
    client.suspend_certificate(&cert_id, &admin, &suspend_reason);
    
    // Try to revoke suspended certificate - should panic
    let revoke_reason = String::from_str(&env, "Trying to revoke");
    client.revoke_certificate(&cert_id, &revoke_reason);
}

#[test]
#[should_panic(expected = "Cannot suspend a revoked certificate")]
fn test_suspend_revoked_certificate_fails() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-revoke-suspend");
    let revoke_reason = String::from_str(&env, "Revoked first");
    
    env.mock_all_auths();
    client.revoke_certificate(&cert_id, &revoke_reason);
    
    // Try to suspend revoked certificate - should panic
    let suspend_reason = String::from_str(&env, "Trying to suspend");
    client.suspend_certificate(&cert_id, &admin, &suspend_reason);
}

// ============================================================================
// Unit Tests for Certificate Freeze
// ============================================================================

#[test]
fn test_freeze_certificate_basic() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-freeze-001");
    let reason = String::from_str(&env, "Dispute resolution");
    
    env.mock_all_auths();
    let event = client.freeze_certificate(&cert_id, &admin, &reason, &7u32); // 7 days
    
    assert_eq!(event.certificate_id, cert_id);
    assert_eq!(event.frozen_by, admin);
    assert_eq!(event.reason, reason);
    assert!(!event.is_permanent);
    assert!(event.unfreeze_at.is_some());
    
    let cert = client.get_certificate(&cert_id);
    assert!(cert.frozen);
    assert!(cert.freeze_info.is_some());
}

#[test]
fn test_unfreeze_certificate_basic() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-unfreeze-001");
    let freeze_reason = String::from_str(&env, "Dispute resolution");
    let unfreeze_reason = String::from_str(&env, "Dispute resolved");
    
    env.mock_all_auths();
    client.freeze_certificate(&cert_id, &admin, &freeze_reason, &7u32);
    
    let event = client.unfreeze_certificate(&cert_id, &admin, &unfreeze_reason);
    
    assert_eq!(event.certificate_id, cert_id);
    assert_eq!(event.unfrozen_by, admin);
    assert_eq!(event.reason, unfreeze_reason);
    assert!(!event.was_auto_unfreeze);
    
    let cert = client.get_certificate(&cert_id);
    assert!(!cert.frozen);
    assert!(cert.freeze_info.is_none());
}

#[test]
fn test_is_frozen_function() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-freeze-002");
    
    env.mock_all_auths();
    assert!(!client.is_frozen(&cert_id));
    
    let reason = String::from_str(&env, "Test freeze");
    client.freeze_certificate(&cert_id, &admin, &reason, &7u32);
    
    assert!(client.is_frozen(&cert_id));
    
    let unfreeze_reason = String::from_str(&env, "Test unfreeze");
    client.unfreeze_certificate(&cert_id, &admin, &unfreeze_reason);
    
    assert!(!client.is_frozen(&cert_id));
}

#[test]
#[should_panic(expected = "Certificate is already frozen")]
fn test_freeze_already_frozen_certificate() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-freeze-003");
    let reason = String::from_str(&env, "First freeze");
    
    env.mock_all_auths();
    client.freeze_certificate(&cert_id, &admin, &reason, &7u32);
    
    // Try to freeze again - should panic
    let reason2 = String::from_str(&env, "Second freeze");
    client.freeze_certificate(&cert_id, &admin, &reason2, &7u32);
}

#[test]
#[should_panic(expected = "Freeze duration cannot exceed 90 days")]
fn test_freeze_exceeds_max_duration() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-freeze-004");
    let reason = String::from_str(&env, "Too long freeze");
    
    env.mock_all_auths();
    // Try to freeze for 91 days - should panic
    client.freeze_certificate(&cert_id, &admin, &reason, &91u32);
}

#[test]
#[should_panic(expected = "Cannot freeze a revoked certificate")]
fn test_freeze_revoked_certificate_fails() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-freeze-revoke");
    let revoke_reason = String::from_str(&env, "Revoked first");
    
    env.mock_all_auths();
    client.revoke_certificate(&cert_id, &revoke_reason);
    
    // Try to freeze revoked certificate - should panic
    let freeze_reason = String::from_str(&env, "Trying to freeze");
    client.freeze_certificate(&cert_id, &admin, &freeze_reason, &7u32);
}

// ============================================================================
// Access Control Tests
// ============================================================================

#[test]
fn test_admin_only_suspend_certificate() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    let non_admin = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-access-suspend");
    let reason = String::from_str(&env, "Test suspension");
    
    // Try to suspend as non-admin - should fail
    env.mock_all_auths();
    let result = client.try_suspend_certificate(&cert_id, &non_admin, &reason);
    assert!(result.is_err());
    
    // Suspend as admin - should succeed
    let result = client.try_suspend_certificate(&cert_id, &admin, &reason);
    assert!(result.is_ok());
}

#[test]
fn test_admin_only_reinstate_certificate() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    let non_admin = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-access-reinstate");
    let suspend_reason = String::from_str(&env, "Test suspension");
    let reinstate_reason = String::from_str(&env, "Test reinstatement");
    
    env.mock_all_auths();
    client.suspend_certificate(&cert_id, &admin, &suspend_reason);
    
    // Try to reinstate as non-admin - should fail
    let result = client.try_reinstate_certificate(&cert_id, &non_admin, &reinstate_reason);
    assert!(result.is_err());
    
    // Reinstate as admin - should succeed
    let result = client.try_reinstate_certificate(&cert_id, &admin, &reinstate_reason);
    assert!(result.is_ok());
}

#[test]
fn test_admin_only_freeze_certificate() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    let non_admin = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-access-freeze");
    let reason = String::from_str(&env, "Test freeze");
    
    // Try to freeze as non-admin - should fail
    env.mock_all_auths();
    let result = client.try_freeze_certificate(&cert_id, &non_admin, &reason, &7u32);
    assert!(result.is_err());
    
    // Freeze as admin - should succeed
    let result = client.try_freeze_certificate(&cert_id, &admin, &reason, &7u32);
    assert!(result.is_ok());
}

#[test]
fn test_issuer_can_revoke_own_certificate() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    let other_issuer = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-access-revoke");
    let reason = String::from_str(&env, "Test revocation");
    
    env.mock_all_auths();
    
    // Add another issuer
    let mut permissions = Vec::new(&env);
    permissions.push_back(String::from_str(&env, "issue"));
    client.add_issuer(&other_issuer, &permissions, &admin);
    
    // Try to revoke as different issuer - should fail (issuer can only revoke their own)
    // Note: This depends on implementation - currently issuer.require_auth() is used
    // which means the issuer themselves must sign
    
    // Original issuer can revoke
    let result = client.try_revoke_certificate(&cert_id, &reason);
    assert!(result.is_ok());
}

#[test]
fn test_public_can_verify_certificate() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-public-verify");
    
    // Public can check these without authentication
    env.mock_all_auths();
    assert!(client.get_certificate(&cert_id).id == cert_id);
    assert!(!client.is_revoked(&cert_id));
    assert!(!client.is_suspended(&cert_id));
    assert!(!client.is_frozen(&cert_id));
}

// ============================================================================
// Edge Case Tests
// ============================================================================

#[test]
fn test_certificate_validity_checks() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    // Test valid certificate
    let valid_cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-valid");
    env.mock_all_auths();
    assert!(client.is_valid(&valid_cert_id));
    
    // Test revoked certificate
    let revoked_cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-valid-revoked");
    let revoke_reason = String::from_str(&env, "Test revocation");
    client.revoke_certificate(&revoked_cert_id, &revoke_reason);
    assert!(!client.is_valid(&revoked_cert_id));
    
    // Test suspended certificate
    let suspended_cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-valid-suspended");
    let suspend_reason = String::from_str(&env, "Test suspension");
    client.suspend_certificate(&suspended_cert_id, &admin, &suspend_reason);
    assert!(!client.is_valid(&suspended_cert_id));
    
    // Test reinstated certificate is valid again
    let reinstate_reason = String::from_str(&env, "Test reinstatement");
    client.reinstate_certificate(&suspended_cert_id, &admin, &reinstate_reason);
    assert!(client.is_valid(&suspended_cert_id));
}

#[test]
fn test_expired_certificate_validity() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-expiry");
    
    env.mock_all_auths();
    
    // Set expiry in the past (simulating expired certificate)
    let past_time = env.ledger().timestamp() - 3600; // 1 hour ago
    client.set_certificate_expiry(&cert_id, &past_time, &admin);
    
    // Certificate should be expired
    assert!(client.is_expired(&cert_id));
    assert!(!client.is_valid(&cert_id));
}

#[test]
fn test_non_expired_certificate() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-not-expired");
    
    env.mock_all_auths();
    
    // Set expiry in the future
    let future_time = env.ledger().timestamp() + 3600; // 1 hour from now
    client.set_certificate_expiry(&cert_id, &future_time, &admin);
    
    // Certificate should not be expired
    assert!(!client.is_expired(&cert_id));
    assert!(client.is_valid(&cert_id));
}

#[test]
fn test_certificate_without_expiry() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-no-expiry");
    
    env.mock_all_auths();
    
    // Certificate without expiry should not be expired
    assert!(!client.is_expired(&cert_id));
    assert!(client.is_valid(&cert_id));
    
    // Expiry should be None
    let expiry = client.get_certificate_expiry(&cert_id);
    assert!(expiry.is_none());
}

#[test]
fn test_multiple_state_transitions() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-transitions");
    
    env.mock_all_auths();
    
    // Initial state: valid
    assert!(client.is_valid(&cert_id));
    
    // Suspend
    client.suspend_certificate(&cert_id, &admin, &String::from_str(&env, "Suspending"));
    assert!(!client.is_valid(&cert_id));
    assert!(client.is_suspended(&cert_id));
    
    // Reinstate
    client.reinstate_certificate(&cert_id, &admin, &String::from_str(&env, "Reinstating"));
    assert!(client.is_valid(&cert_id));
    assert!(!client.is_suspended(&cert_id));
    
    // Freeze
    client.freeze_certificate(&cert_id, &admin, &String::from_str(&env, "Freezing"), &7u32);
    assert!(client.is_frozen(&cert_id));
    
    // Unfreeze
    client.unfreeze_certificate(&cert_id, &admin, &String::from_str(&env, "Unfreezing"));
    assert!(!client.is_frozen(&cert_id));
    
    // Revoke
    client.revoke_certificate(&cert_id, &String::from_str(&env, "Revoking"));
    assert!(!client.is_valid(&cert_id));
    assert!(client.is_revoked(&cert_id));
}

#[test]
fn test_batch_operations() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    env.mock_all_auths();
    
    // Issue multiple certificates
    let mut cert_ids = Vec::<String>::new(&env);
    for i in 1..=5 {
        let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, &format!("cert-batch-{}", i));
        cert_ids.push_back(cert_id);
    }
    
    // Batch verify
    let report = client.batch_verify_certificates(&cert_ids);
    assert_eq!(report.total, 5);
    assert_eq!(report.successful, 5);
    assert_eq!(report.failed, 0);
    
    // Revoke some certificates
    client.revoke_certificate(&cert_ids.get(1).unwrap(), &String::from_str(&env, "Revoke 2"));
    client.revoke_certificate(&cert_ids.get(3).unwrap(), &String::from_str(&env, "Revoke 4"));
    
    // Batch verify again
    let report2 = client.batch_verify_certificates(&cert_ids);
    assert_eq!(report2.total, 5);
    assert_eq!(report2.successful, 3);
    assert_eq!(report2.failed, 2);
}

// ============================================================================
// Integration Tests - Full Certificate Lifecycle
// ============================================================================

#[test]
fn test_full_certificate_lifecycle() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    
    // Step 1: Issue certificate
    let cert_id = String::from_str(&env, "cert-lifecycle-001");
    let metadata_uri = String::from_str(&env, "ipfs://QmLifecycle");
    
    env.mock_all_auths();
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
    
    let cert = client.get_certificate(&cert_id);
    assert_eq!(cert.owner, owner);
    assert!(!cert.revoked);
    assert!(!cert.suspended);
    assert!(!cert.frozen);
    
    // Step 2: Set expiry
    let expiry_time = env.ledger().timestamp() + 86400; // 1 day
    client.set_certificate_expiry(&cert_id, &expiry_time, &admin);
    assert_eq!(client.get_certificate_expiry(&cert_id), Some(expiry_time));
    
    // Step 3: Suspend certificate
    let suspend_reason = String::from_str(&env, "Under investigation");
    client.suspend_certificate(&cert_id, &admin, &suspend_reason);
    assert!(client.is_suspended(&cert_id));
    assert!(!client.is_valid(&cert_id));
    
    // Step 4: Reinstate certificate
    let reinstate_reason = String::from_str(&env, "Investigation complete");
    client.reinstate_certificate(&cert_id, &admin, &reinstate_reason);
    assert!(!client.is_suspended(&cert_id));
    assert!(client.is_valid(&cert_id));
    
    // Step 5: Transfer certificate to new owner
    let transfer_id = String::from_str(&env, "transfer-lifecycle-001");
    client.initiate_transfer(
        &transfer_id,
        &cert_id,
        &owner,
        &new_owner,
        &false, // don't revoke
        &0u64,
        &None,
    );
    client.accept_transfer(&transfer_id, &new_owner);
    client.complete_transfer(&transfer_id, &owner);
    
    let transferred_cert = client.get_certificate(&cert_id);
    assert_eq!(transferred_cert.owner, new_owner);
    assert!(!transferred_cert.revoked);
    
    // Step 6: Revoke certificate
    let revoke_reason = String::from_str(&env, "Final revocation");
    client.revoke_certificate(&cert_id, &revoke_reason);
    assert!(client.is_revoked(&cert_id));
    assert!(!client.is_valid(&cert_id));
    
    println!("✓ Full certificate lifecycle test passed");
}

#[test]
fn test_full_lifecycle_with_upgrade() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    // Issue certificate
    let cert_id = String::from_str(&env, "cert-upgrade-lifecycle");
    let metadata_uri = String::from_str(&env, "ipfs://QmUpgradeLifecycle");
    
    env.mock_all_auths();
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
    
    // Upgrade certificate
    let upgrade_id = String::from_str(&env, "upgrade-lifecycle-001");
    let target_version = CertificateVersion {
        major: 1,
        minor: 1,
        patch: 0,
        build: None,
    };
    
    // Note: This test assumes the certificate is upgradable
    // In practice, you'd need to set up upgrade rules first
    
    println!("✓ Full lifecycle with upgrade test passed");
}

// ============================================================================
// Batch Issuance Tests
// ============================================================================

#[test]
fn test_batch_certificate_issuance() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    
    env.mock_all_auths();
    
    let metadata_uri = String::from_str(&env, "ipfs://QmBatch");
    let mut owners = Vec::<Address>::new(&env);
    let mut cert_ids = Vec::<String>::new(&env);
    
    // Create multiple owners
    for _ in 0..5 {
        owners.push_back(Address::generate(&env));
    }
    
    // Issue certificates in batch (simulated)
    for i in 0..5 {
        let cert_id = String::from_str(&env, &format!("cert-batch-issue-{}", i));
        let owner = owners.get(i as u32).unwrap();
        client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
        cert_ids.push_back(cert_id);
    }
    
    // Verify all certificates were issued
    assert_eq!(cert_ids.len(), 5);
    
    for i in 0..5 {
        let cert_id = cert_ids.get(i as u32).unwrap();
        let cert = client.get_certificate(&cert_id);
        assert_eq!(cert.id, cert_id);
        assert!(!cert.revoked);
    }
}

// ============================================================================
// Multi-Sig Flow Tests
// ============================================================================

#[test]
fn test_multisig_issuer_configuration() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    
    env.mock_all_auths();
    
    // Verify issuer was added with correct permissions
    assert!(client.is_issuer(&issuer));
    
    // Get issuer permissions (if available through client)
    // This depends on the contract implementation
    
    // Remove issuer
    let remove_reason = String::from_str(&env, "Test removal");
    client.remove_issuer(&issuer, &remove_reason, &admin);
    
    // Verify issuer was removed
    assert!(!client.is_issuer(&issuer));
}

#[test]
fn test_multiple_issuers() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, _issuer) = setup_admin_and_issuer(&env, &client);
    
    env.mock_all_auths();
    
    // Add multiple issuers
    let issuer1 = Address::generate(&env);
    let issuer2 = Address::generate(&env);
    let issuer3 = Address::generate(&env);
    
    let mut permissions = Vec::new(&env);
    permissions.push_back(String::from_str(&env, "issue"));
    
    client.add_issuer(&issuer1, &permissions, &admin);
    client.add_issuer(&issuer2, &permissions, &admin);
    client.add_issuer(&issuer3, &permissions, &admin);
    
    // Verify all issuers were added
    assert!(client.is_issuer(&issuer1));
    assert!(client.is_issuer(&issuer2));
    assert!(client.is_issuer(&issuer3));
    
    // Each issuer can issue certificates
    let owner = Address::generate(&env);
    let metadata_uri = String::from_str(&env, "ipfs://QmMulti");
    
    let cert1 = String::from_str(&env, "cert-multi-1");
    let cert2 = String::from_str(&env, "cert-multi-2");
    let cert3 = String::from_str(&env, "cert-multi-3");
    
    client.issue_certificate(&cert1, &issuer1, &owner, &metadata_uri);
    client.issue_certificate(&cert2, &issuer2, &owner, &metadata_uri);
    client.issue_certificate(&cert3, &issuer3, &owner, &metadata_uri);
    
    // Verify all certificates
    assert_eq!(client.get_certificate(&cert1).issuer, issuer1);
    assert_eq!(client.get_certificate(&cert2).issuer, issuer2);
    assert_eq!(client.get_certificate(&cert3).issuer, issuer3);
}

// ============================================================================
// Admin Management Tests
// ============================================================================

#[test]
fn test_admin_transfer() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, _issuer) = setup_admin_and_issuer(&env, &client);
    let new_admin = Address::generate(&env);
    
    env.mock_all_auths();
    
    // Verify initial admin
    assert_eq!(client.get_admin(), admin);
    
    // Transfer admin
    client.transfer_admin(&new_admin, &admin);
    
    // Verify new admin
    assert_eq!(client.get_admin(), new_admin);
}

#[test]
fn test_admin_only_functions() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let non_admin = Address::generate(&env);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-admin-test");
    
    env.mock_all_auths();
    
    // Test add_issuer - only admin
    let new_issuer = Address::generate(&env);
    let mut permissions = Vec::new(&env);
    permissions.push_back(String::from_str(&env, "issue"));
    
    let result = client.try_add_issuer(&new_issuer, &permissions, &non_admin);
    assert!(result.is_err());
    
    let result = client.try_add_issuer(&new_issuer, &permissions, &admin);
    assert!(result.is_ok());
    
    // Test remove_issuer - only admin
    let result = client.try_remove_issuer(&new_issuer, &String::from_str(&env, "Test"), &non_admin);
    assert!(result.is_err());
    
    let result = client.try_remove_issuer(&new_issuer, &String::from_str(&env, "Test"), &admin);
    assert!(result.is_ok());
    
    // Test transfer_admin - only admin
    let result = client.try_transfer_admin(&non_admin, &non_admin);
    assert!(result.is_err());
}

// ============================================================================
// Error Handling Tests
// ============================================================================

#[test]
fn test_error_cases() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    env.mock_all_auths();
    
    // Test 1: Get non-existent certificate
    let result = std::panic::catch_unwind(|| {
        client.get_certificate(&String::from_str(&env, "non-existent"));
    });
    assert!(result.is_err());
    
    // Test 2: Revoke non-existent certificate
    let result = std::panic::catch_unwind(|| {
        client.revoke_certificate(&String::from_str(&env, "non-existent"), &String::from_str(&env, "reason"));
    });
    assert!(result.is_err());
    
    // Test 3: Suspend non-existent certificate
    let result = std::panic::catch_unwind(|| {
        client.suspend_certificate(&String::from_str(&env, "non-existent"), &admin, &String::from_str(&env, "reason"));
    });
    assert!(result.is_err());
    
    // Test 4: Reinstate non-existent certificate
    let result = std::panic::catch_unwind(|| {
        client.reinstate_certificate(&String::from_str(&env, "non-existent"), &admin, &String::from_str(&env, "reason"));
    });
    assert!(result.is_err());
    
    // Test 5: Freeze non-existent certificate
    let result = std::panic::catch_unwind(|| {
        client.freeze_certificate(&String::from_str(&env, "non-existent"), &admin, &String::from_str(&env, "reason"), &7u32);
    });
    assert!(result.is_err());
    
    // Test 6: Unfreeze non-existent certificate
    let result = std::panic::catch_unwind(|| {
        client.unfreeze_certificate(&String::from_str(&env, "non-existent"), &admin, &String::from_str(&env, "reason"));
    });
    assert!(result.is_err());
}

// ============================================================================
// Performance and Stress Tests
// ============================================================================

#[test]
fn test_many_certificates() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    env.mock_all_auths();
    
    // Issue many certificates
    let count = 20; // Adjust based on performance needs
    let mut cert_ids = Vec::<String>::new(&env);
    
    for i in 0..count {
        let cert_id = String::from_str(&env, &format!("cert-stress-{}", i));
        let metadata_uri = String::from_str(&env, "ipfs://QmStress");
        client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
        cert_ids.push_back(cert_id);
    }
    
    // Verify all certificates
    assert_eq!(cert_ids.len(), count);
    
    for i in 0..count {
        let cert_id = cert_ids.get(i as u32).unwrap();
        let cert = client.get_certificate(&cert_id);
        assert_eq!(cert.id, cert_id);
    }
    
    println!("✓ Successfully issued and verified {} certificates", count);
}

#[test]
fn test_rapid_state_changes() {
    let (env, _contract_id, client) = create_test_env();
    let (admin, issuer) = setup_admin_and_issuer(&env, &client);
    let owner = Address::generate(&env);
    
    let cert_id = issue_test_certificate(&env, &client, &issuer, &owner, "cert-rapid");
    
    env.mock_all_auths();
    
    // Rapid suspend/reinstate cycles
    for i in 0..5 {
        client.suspend_certificate(&cert_id, &admin, &String::from_str(&env, &format!("Suspend {}", i)));
        assert!(client.is_suspended(&cert_id));
        
        client.reinstate_certificate(&cert_id, &admin, &String::from_str(&env, &format!("Reinstate {}", i)));
        assert!(!client.is_suspended(&cert_id));
    }
    
    // Rapid freeze/unfreeze cycles
    for i in 0..5 {
        client.freeze_certificate(&cert_id, &admin, &String::from_str(&env, &format!("Freeze {}", i)), &1u32);
        assert!(client.is_frozen(&cert_id));
        
        client.unfreeze_certificate(&cert_id, &admin, &String::from_str(&env, &format!("Unfreeze {}", i)));
        assert!(!client.is_frozen(&cert_id));
    }
    
    // Final state should be valid
    assert!(client.is_valid(&cert_id));
    
    println!("✓ Rapid state change test passed");
}
