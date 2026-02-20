#![cfg(test)]

use super::*;
use soroban_sdk::{Env, testutils::Address as _, Address, String};

// Helper function to create a certificate version
fn create_version(env: &Env, major: u32, minor: u32, patch: u32) -> CertificateVersion {
    CertificateVersion {
        major,
        minor,
        patch,
        build: None,
    }
}

// Helper function to create a basic certificate for testing
fn create_test_certificate(
    env: &Env,
    client: &CertificateContractClient,
    id: &str,
    issuer: &Address,
    owner: &Address,
    version: CertificateVersion,
) -> Certificate {
    let cert_id = String::from_str(env, id);
    let metadata_uri = String::from_str(env, "ipfs://QmTest");
    
    // Create basic upgrade rules
    let mut upgrade_rules = Vec::new(env);
    let rule = UpgradeRule {
        from_version: version.clone(),
        to_version: CertificateVersion {
            major: version.major,
            minor: version.minor + 1,
            patch: 0,
            build: None,
        },
        allowed: true,
        requires_issuer_approval: false,
        migration_script_hash: None,
    };
    upgrade_rules.push_back(rule);
    
    // Create compatibility matrix
    let mut compatible_versions = Vec::new(env);
    compatible_versions.push_back(version.clone());
    let compatibility_matrix = CompatibilityMatrix {
        version: version.clone(),
        compatible_versions,
        backward_compatible: true,
        forward_compatible: true,
    };
    
    // Create certificate with upgrade capabilities
    Certificate {
        id: cert_id.clone(),
        issuer: issuer.clone(),
        owner: owner.clone(),
        metadata_uri: metadata_uri.clone(),
        issued_at: env.ledger().timestamp(),
        revoked: false,
        revocation_reason: None,
        revoked_at: None,
        revoked_by: None,
        version,
        parent_certificate_id: None,
        child_certificate_id: None,
        is_upgradable: true,
        upgrade_rules,
        compatibility_matrix,
    }
}

#[test]
fn test_issue_and_revoke() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let id = String::from_str(&env, "cert-123");
    let metadata_uri = String::from_str(&env, "ipfs://Qm...");

    // Issue certificate
    env.mock_all_auths();
    client.issue_certificate(&id, &issuer, &owner, &metadata_uri);

    // Verify it exists and is not revoked
    let cert = client.get_certificate(&id);
    assert_eq!(cert.id, id);
    assert_eq!(cert.revoked, false);

    // Revoke certificate
    let reason = String::from_str(&env, "Violation of terms");
    client.revoke_certificate(&id, &reason);

    // Verify it is revoked
    let revoked = client.is_revoked(&id);
    assert!(revoked);

    let cert_revoked = client.get_certificate(&id);
    assert_eq!(cert_revoked.revoked, true);
    assert_eq!(cert_revoked.revocation_reason, Some(reason));
}

#[test]
fn test_certificate_transfer_flow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let cert_id = String::from_str(&env, "cert-456");
    let transfer_id = String::from_str(&env, "transfer-001");
    let metadata_uri = String::from_str(&env, "ipfs://QmTransfer");

    env.mock_all_auths();
    
    // Issue certificate
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
    
    // Verify initial owner
    let cert = client.get_certificate(&cert_id);
    assert_eq!(cert.owner, owner);
    
    // Initiate transfer
    client.initiate_transfer(
        &transfer_id,
        &cert_id,
        &owner,
        &new_owner,
        &false, // don't revoke on transfer
        &0u64,  // no transfer fee
        &None,  // no memo
    );
    
    // Verify transfer is pending
    let transfer = client.get_transfer(&transfer_id);
    assert_eq!(transfer.status, TransferStatus::Pending);
    
    // Check pending transfers for new owner
    let pending = client.get_pending_transfers(&new_owner);
    assert_eq!(pending.len(), 1);
    assert_eq!(pending.get(0), transfer_id);
    
    // Accept transfer
    client.accept_transfer(&transfer_id, &new_owner);
    
    // Verify transfer is accepted
    let transfer_accepted = client.get_transfer(&transfer_id);
    assert_eq!(transfer_accepted.status, TransferStatus::Accepted);
    assert!(transfer_accepted.accepted_at.is_some());
    
    // Complete transfer
    client.complete_transfer(&transfer_id, &owner);
    
    // Verify transfer is completed
    let transfer_completed = client.get_transfer(&transfer_id);
    assert_eq!(transfer_completed.status, TransferStatus::Completed);
    assert!(transfer_completed.completed_at.is_some());
    
    // Verify certificate owner changed
    let cert_updated = client.get_certificate(&cert_id);
    assert_eq!(cert_updated.owner, new_owner);
    assert_eq!(cert_updated.revoked, false); // Not revoked since require_revocation was false
    
    // Verify transfer history
    let history = client.get_transfer_history(&cert_id);
    assert_eq!(history.len(), 1);
    let history_entry = history.get(0);
    assert_eq!(history_entry.transfer_id, transfer_id);
    assert_eq!(history_entry.from_address, owner);
    assert_eq!(history_entry.to_address, new_owner);
}

#[test]
fn test_transfer_with_revocation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let cert_id = String::from_str(&env, "cert-789");
    let transfer_id = String::from_str(&env, "transfer-002");
    let metadata_uri = String::from_str(&env, "ipfs://QmRevoke");

    env.mock_all_auths();
    
    // Issue certificate
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
    
    // Initiate transfer with revocation
    client.initiate_transfer(
        &transfer_id,
        &cert_id,
        &owner,
        &new_owner,
        &true,  // revoke on transfer
        &0u64,  // no transfer fee
        &None,  // no memo
    );
    
    // Accept and complete transfer
    client.accept_transfer(&transfer_id, &new_owner);
    client.complete_transfer(&transfer_id, &owner);
    
    // Verify certificate is revoked and owner changed
    let cert = client.get_certificate(&cert_id);
    assert_eq!(cert.owner, new_owner);
    assert_eq!(cert.revoked, true);
    assert_eq!(cert.revocation_reason, Some(String::from_str(&env, "Transferred to new owner")));
}

#[test]
fn test_transfer_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let cert_id = String::from_str(&env, "cert-101");
    let transfer_id = String::from_str(&env, "transfer-003");
    let metadata_uri = String::from_str(&env, "ipfs://QmReject");

    env.mock_all_auths();
    
    // Issue certificate
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
    
    // Initiate transfer
    client.initiate_transfer(
        &transfer_id,
        &cert_id,
        &owner,
        &new_owner,
        &false,
        &0u64,
        &None,
    );
    
    // Reject transfer
    client.reject_transfer(&transfer_id, &new_owner);
    
    // Verify transfer is rejected
    let transfer = client.get_transfer(&transfer_id);
    assert_eq!(transfer.status, TransferStatus::Rejected);
    
    // Verify certificate owner unchanged
    let cert = client.get_certificate(&cert_id);
    assert_eq!(cert.owner, owner);
}

#[test]
fn test_transfer_cancellation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let cert_id = String::from_str(&env, "cert-102");
    let transfer_id = String::from_str(&env, "transfer-004");
    let metadata_uri = String::from_str(&env, "ipfs://QmCancel");

    env.mock_all_auths();
    
    // Issue certificate
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
    
    // Initiate transfer
    client.initiate_transfer(
        &transfer_id,
        &cert_id,
        &owner,
        &new_owner,
        &false,
        &0u64,
        &None,
    );
    
    // Cancel transfer
    client.cancel_transfer(&transfer_id, &owner);
    
    // Verify transfer is cancelled
    let transfer = client.get_transfer(&transfer_id);
    assert_eq!(transfer.status, TransferStatus::Cancelled);
    
    // Verify certificate owner unchanged
    let cert = client.get_certificate(&cert_id);
    assert_eq!(cert.owner, owner);
}

#[test]
fn test_transfer_with_fee() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let cert_id = String::from_str(&env, "cert-103");
    let transfer_id = String::from_str(&env, "transfer-005");
    let metadata_uri = String::from_str(&env, "ipfs://QmFee");
    let transfer_fee = 1000u64;

    env.mock_all_auths();
    
    // Issue certificate
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
    
    // Initiate transfer with fee
    client.initiate_transfer(
        &transfer_id,
        &cert_id,
        &owner,
        &new_owner,
        &false,
        &transfer_fee,
        &Some(String::from_str(&env, "Transfer with fee")),
    );
    
    // Accept and complete transfer
    client.accept_transfer(&transfer_id, &new_owner);
    client.complete_transfer(&transfer_id, &owner);
    
    // Verify transfer history includes fee and memo
    let history = client.get_transfer_history(&cert_id);
    assert_eq!(history.len(), 1);
    let history_entry = history.get(0);
    assert_eq!(history_entry.transfer_fee, transfer_fee);
    assert_eq!(history_entry.memo, Some(String::from_str(&env, "Transfer with fee")));
}

#[test]
fn test_transfer_authorization() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let unauthorized = Address::generate(&env);
    let cert_id = String::from_str(&env, "cert-104");
    let transfer_id = String::from_str(&env, "transfer-006");
    let metadata_uri = String::from_str(&env, "ipfs://QmAuth");

    env.mock_all_auths();
    
    // Issue certificate
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
    
    // Try to initiate transfer from unauthorized address
    let result = client.try_initiate_transfer(
        &transfer_id,
        &cert_id,
        &unauthorized, // Not the owner
        &new_owner,
        &false,
        &0u64,
        &None,
    );
    
    // Should fail with Unauthorized error
    assert!(result.is_err());
    
    // Try to accept transfer from wrong recipient
    client.initiate_transfer(
        &transfer_id,
        &cert_id,
        &owner,
        &new_owner,
        &false,
        &0u64,
        &None,
    );
    
    let result2 = client.try_accept_transfer(&transfer_id, &unauthorized);
    assert!(result2.is_err());
}

#[test]
fn test_transfer_count() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let cert_id = String::from_str(&env, "cert-105");
    let metadata_uri = String::from_str(&env, "ipfs://QmCount");

    env.mock_all_auths();
    
    // Initial transfer count should be 0
    assert_eq!(client.get_transfer_count(), 0);
    
    // Issue certificate and make transfers
    client.issue_certificate(&cert_id, &issuer, &owner, &metadata_uri);
    
    // Make 3 transfers
    for i in 1..=3 {
        let transfer_id = String::from_str(&env, &format!("transfer-{}", i));
        let new_recipient = Address::generate(&env);
        
        client.initiate_transfer(
            &transfer_id,
            &cert_id,
            &owner,
            &new_recipient,
            &false,
            &0u64,
            &None,
        );
        client.accept_transfer(&transfer_id, &new_recipient);
        client.complete_transfer(&transfer_id, &owner);
    }
    
    // Transfer count should be 3
    assert_eq!(client.get_transfer_count(), 3);
}

#[test]
fn test_certificate_upgrade_flow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let cert_id = String::from_str(&env, "cert-upgrade-001");
    let upgrade_id = String::from_str(&env, "upgrade-001");
    let metadata_uri = String::from_str(&env, "ipfs://QmUpgrade");

    env.mock_all_auths();
    
    // Create initial certificate version 1.0.0
    let initial_version = create_version(&env, 1, 0, 0);
    let mut cert = create_test_certificate(&env, &client, "cert-upgrade-001", &issuer, &owner, initial_version.clone());
    
    // Store the certificate manually for testing
    use crate::DataKey;
    let cert_key = DataKey::Certificate(cert_id.clone());
    env.storage().instance().set(&cert_key, &cert);
    
    // Request upgrade to version 1.1.0
    let target_version = create_version(&env, 1, 1, 0);
    
    client.request_upgrade(
        &upgrade_id,
        &cert_id,
        &target_version,
        &owner,
        &None,  // no migration data
        &None,  // no notes
    );
    
    // Verify upgrade request was created
    let upgrade_request = client.get_upgrade_request(&upgrade_id);
    assert_eq!(upgrade_request.status, UpgradeStatus::Approved); // Auto-approved for minor version
    assert_eq!(upgrade_request.from_version.major, 1);
    assert_eq!(upgrade_request.from_version.minor, 0);
    assert_eq!(upgrade_request.to_version.minor, 1);
    
    // Execute the upgrade
    let new_cert_id = client.execute_upgrade(&upgrade_id, &owner);
    
    // Verify new certificate was created
    let new_cert = client.get_certificate(&new_cert_id);
    assert_eq!(new_cert.version.major, 1);
    assert_eq!(new_cert.version.minor, 1);
    assert_eq!(new_cert.version.patch, 0);
    assert_eq!(new_cert.parent_certificate_id, Some(cert_id.clone()));
    
    // Verify upgrade request is completed
    let completed_upgrade = client.get_upgrade_request(&upgrade_id);
    assert_eq!(completed_upgrade.status, UpgradeStatus::Completed);
    
    // Verify upgrade history
    let history = client.get_upgrade_history(&cert_id);
    assert_eq!(history.len(), 1);
    
    // Verify version chain
    let version_chain = client.get_version_chain(&cert_id);
    assert_eq!(version_chain.len(), 1);
    assert_eq!(version_chain.get(0).minor, 0); // Original version was archived
}

#[test]
fn test_upgrade_with_approval() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let cert_id = String::from_str(&env, "cert-approval-001");
    let upgrade_id = String::from_str(&env, "upgrade-approval-001");

    env.mock_all_auths();
    
    // Create certificate that requires issuer approval for major version upgrade
    let initial_version = create_version(&env, 1, 0, 0);
    let mut cert = create_test_certificate(&env, &client, "cert-approval-001", &issuer, &owner, initial_version.clone());
    
    // Modify upgrade rules to require approval for major version changes
    let mut upgrade_rules = Vec::new(&env);
    let rule = UpgradeRule {
        from_version: initial_version.clone(),
        to_version: create_version(&env, 2, 0, 0), // Major version change
        allowed: true,
        requires_issuer_approval: true, // Require approval
        migration_script_hash: None,
    };
    upgrade_rules.push_back(rule);
    cert.upgrade_rules = upgrade_rules;
    
    // Store the certificate
    use crate::DataKey;
    let cert_key = DataKey::Certificate(cert_id.clone());
    env.storage().instance().set(&cert_key, &cert);
    
    // Request major version upgrade (should require approval)
    let target_version = create_version(&env, 2, 0, 0);
    
    client.request_upgrade(
        &upgrade_id,
        &cert_id,
        &target_version,
        &owner,
        &None,
        &Some(String::from_str(&env, "Major version upgrade")),
    );
    
    // Verify upgrade is pending approval
    let upgrade_request = client.get_upgrade_request(&upgrade_id);
    assert_eq!(upgrade_request.status, UpgradeStatus::Pending);
    assert!(upgrade_request.approved_by.is_none());
    
    // Check pending upgrades for issuer
    let pending_upgrades = client.get_pending_upgrades(&issuer);
    assert_eq!(pending_upgrades.len(), 1);
    assert_eq!(pending_upgrades.get(0), upgrade_id);
    
    // Approve the upgrade
    client.approve_upgrade(&upgrade_id, &issuer);
    
    // Verify upgrade is now approved
    let approved_upgrade = client.get_upgrade_request(&upgrade_id);
    assert_eq!(approved_upgrade.status, UpgradeStatus::Approved);
    assert!(approved_upgrade.approved_by.is_some());
    
    // Pending upgrades should be empty now
    let pending_upgrades_after = client.get_pending_upgrades(&issuer);
    assert_eq!(pending_upgrades_after.len(), 0);
    
    // Execute the upgrade
    let new_cert_id = client.execute_upgrade(&upgrade_id, &owner);
    
    // Verify upgrade completed
    let new_cert = client.get_certificate(&new_cert_id);
    assert_eq!(new_cert.version.major, 2);
}

#[test]
fn test_version_comparison() {
    let env = Env::default();
    
    let v1_0_0 = create_version(&env, 1, 0, 0);
    let v1_1_0 = create_version(&env, 1, 1, 0);
    let v2_0_0 = create_version(&env, 2, 0, 0);
    
    // Test comparisons
    assert!(v1_1_0.is_greater_than(&v1_0_0));
    assert!(v1_0_0.is_less_than(&v1_1_0));
    assert!(v1_0_0.is_equal(&create_version(&env, 1, 0, 0)));
    assert!(!v2_0_0.is_equal(&v1_0_0));
    
    // Test compare function
    assert_eq!(client.compare_versions(&v1_0_0, &v1_1_0), -1);
    assert_eq!(client.compare_versions(&v1_1_0, &v1_0_0), 1);
    assert_eq!(client.compare_versions(&v1_0_0, &v1_0_0), 0);
}

#[test]
fn test_upgrade_path_validation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    
    env.mock_all_auths();
    
    // Create certificate with specific upgrade rules
    let v1_0_0 = create_version(&env, 1, 0, 0);
    let cert_id = String::from_str(&env, "cert-validate-001");
    
    let mut cert = create_test_certificate(&env, &client, "cert-validate-001", &issuer, &owner, v1_0_0.clone());
    
    // Add specific upgrade rule that disallows certain upgrades
    let mut upgrade_rules = cert.upgrade_rules.clone();
    let forbidden_rule = UpgradeRule {
        from_version: v1_0_0.clone(),
        to_version: create_version(&env, 1, 5, 0),
        allowed: false, // Not allowed
        requires_issuer_approval: false,
        migration_script_hash: None,
    };
    upgrade_rules.push_back(forbidden_rule);
    cert.upgrade_rules = upgrade_rules;
    
    // Store certificate
    use crate::DataKey;
    let cert_key = DataKey::Certificate(cert_id.clone());
    env.storage().instance().set(&cert_key, &cert);
    
    // Test allowed upgrade
    let allowed_version = create_version(&env, 1, 1, 0);
    let upgrade_id_1 = String::from_str(&env, "upgrade-allowed-001");
    
    client.request_upgrade(
        &upgrade_id_1,
        &cert_id,
        &allowed_version,
        &owner,
        &None,
        &None,
    );
    
    // Should succeed
    let allowed_request = client.get_upgrade_request(&upgrade_id_1);
    assert_eq!(allowed_request.status, UpgradeStatus::Approved);
    
    // Test forbidden upgrade
    let forbidden_version = create_version(&env, 1, 5, 0);
    let upgrade_id_2 = String::from_str(&env, "upgrade-forbidden-001");
    
    let result = client.try_request_upgrade(
        &upgrade_id_2,
        &cert_id,
        &forbidden_version,
        &owner,
        &None,
        &None,
    );
    
    // Should fail with UpgradeNotAllowed
    assert!(result.is_err());
}

#[test]
fn test_archived_certificates() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let cert_id = String::from_str(&env, "cert-archive-001");
    let upgrade_id = String::from_str(&env, "upgrade-archive-001");

    env.mock_all_auths();
    
    // Create and store certificate
    let initial_version = create_version(&env, 1, 0, 0);
    let cert = create_test_certificate(&env, &client, "cert-archive-001", &issuer, &owner, initial_version.clone());
    
    use crate::DataKey;
    let cert_key = DataKey::Certificate(cert_id.clone());
    env.storage().instance().set(&cert_key, &cert);
    
    // Perform upgrade
    let target_version = create_version(&env, 1, 1, 0);
    
    client.request_upgrade(
        &upgrade_id,
        &cert_id,
        &target_version,
        &owner,
        &None,
        &None,
    );
    
    client.execute_upgrade(&upgrade_id, &owner);
    
    // Try to get archived certificate
    let archived_result = client.try_get_archived_certificate(&cert_id, &initial_version);
    
    // Should be able to retrieve archived version
    assert!(archived_result.is_ok());
    
    let archived_cert = archived_result.unwrap();
    assert_eq!(archived_cert.version.major, 1);
    assert_eq!(archived_cert.version.minor, 0);
    assert_eq!(archived_cert.reason, String::from_str(&env, "Upgraded to newer version"));
}

#[test]
fn test_upgrade_count() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    
    env.mock_all_auths();
    
    // Initial upgrade count should be 0
    assert_eq!(client.get_upgrade_count(), 0);
    
    // Create certificate
    let initial_version = create_version(&env, 1, 0, 0);
    let cert_id = String::from_str(&env, "cert-count-001");
    let cert = create_test_certificate(&env, &client, "cert-count-001", &issuer, &owner, initial_version.clone());
    
    use crate::DataKey;
    let cert_key = DataKey::Certificate(cert_id.clone());
    env.storage().instance().set(&cert_key, &cert);
    
    // Perform 3 upgrades
    for i in 1..=3 {
        let upgrade_id = String::from_str(&env, &format!("upgrade-count-{}", i));
        let target_version = create_version(&env, 1, i, 0);
        
        client.request_upgrade(
            &upgrade_id,
            &cert_id,
            &target_version,
            &owner,
            &None,
            &None,
        );
        
        client.execute_upgrade(&upgrade_id, &owner);
    }
    
    // Upgrade count should be 3
    assert_eq!(client.get_upgrade_count(), 3);
}
