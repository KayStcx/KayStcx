#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup(env: &Env) -> (CertificateContractClient, Address) {
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    env.mock_all_auths();
    client.initialize(&admin);
    (client, admin)
}

fn issue(
    env: &Env,
    client: &CertificateContractClient,
    id: &str,
    issuer: &Address,
    owner: &Address,
    uri: &str,
) {
    client.add_issuer(issuer);
    client.issue_certificate(
        &String::from_str(env, id),
        issuer,
        owner,
        &String::from_str(env, uri),
        &None,
    );
}

// ---------------------------------------------------------------------------
// Happy path: original issuer updates the URI
// ---------------------------------------------------------------------------
#[test]
fn test_update_metadata_uri_by_original_issuer() {
    let env = Env::default();
    let (client, _admin) = setup(&env);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let id = String::from_str(&env, "cert-meta-1");
    let new_uri = String::from_str(&env, "ipfs://QmMigrated");

    issue(&env, &client, "cert-meta-1", &issuer, &owner, "ipfs://QmOriginal");

    client.update_metadata_uri(&id, &new_uri);

    let cert = client.get_certificate(&id).expect("Certificate not found");
    assert_eq!(cert.metadata_uri, new_uri);
}

// ---------------------------------------------------------------------------
// Auth failure: caller is NOT the original issuer
// ---------------------------------------------------------------------------
#[test]
fn test_update_metadata_uri_rejected_for_non_issuer() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let other = Address::generate(&env);
    let id = String::from_str(&env, "cert-meta-2");
    let new_uri = String::from_str(&env, "ipfs://QmAttacker");

    env.mock_all_auths();
    client.initialize(&admin);
    issue(&env, &client, "cert-meta-2", &issuer, &owner, "ipfs://QmOriginal");

    // Allow only `other` to authorise — issuer.require_auth() must fail
    env.mock_auths(&[soroban_sdk::testutils::MockAuth {
        address: &other,
        invoke: &soroban_sdk::testutils::MockAuthInvoke {
            contract: &contract_id,
            fn_name: "update_metadata_uri",
            args: soroban_sdk::vec![&env],
            sub_invokes: &[],
        },
    }]);

    let result = client.try_update_metadata_uri(&id, &new_uri);
    assert!(
        result.is_err(),
        "Non-issuer should not be able to update metadata_uri"
    );
}

// ---------------------------------------------------------------------------
// Certificate does not exist
// ---------------------------------------------------------------------------
#[test]
fn test_update_metadata_uri_certificate_not_found() {
    let env = Env::default();
    let (client, _admin) = setup(&env);

    let missing_id = String::from_str(&env, "cert-does-not-exist");
    let new_uri = String::from_str(&env, "ipfs://QmAnything");

    let result = client.try_update_metadata_uri(&missing_id, &new_uri);
    assert!(
        result.is_err(),
        "Should return an error when certificate is not found"
    );
}

// ---------------------------------------------------------------------------
// Empty URI must be rejected
// ---------------------------------------------------------------------------
#[test]
fn test_update_metadata_uri_rejects_empty_uri() {
    let env = Env::default();
    let (client, _admin) = setup(&env);

    let issuer = Address::generate(&env);
    let owner = Address::generate(&env);
    let id = String::from_str(&env, "cert-meta-empty");

    issue(&env, &client, "cert-meta-empty", &issuer, &owner, "ipfs://QmOriginal");

    let result = client.try_update_metadata_uri(&id, &String::from_str(&env, ""));
    assert!(
        result.is_err(),
        "Empty metadata_uri should be rejected"
    );
}
