#![cfg(test)]

use super::*;
use soroban_sdk::{Env, testutils::Address as _, Address};

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
