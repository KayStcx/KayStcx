#![cfg(test)]

use super::*;
use soroban_sdk::{Env, testutils::Address as _, Address, String};

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
