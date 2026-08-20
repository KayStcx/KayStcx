#![cfg(test)]

//! Shared test setup helpers for the contract suite.
//!
//! Extracted so each `*_test.rs` module can spin up a configured
//! `CertificateContract` without duplicating the boilerplate.

use crate::{CertificateContract, CertificateContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

/// Register and initialize the `CertificateContract` with a fresh admin, then
/// authorize a fresh issuer.
///
/// Returns `(contract_address, admin, issuer)`.
pub(crate) fn setup_certificate(env: &Env) -> (Address, Address, Address) {
    let admin = Address::generate(env);
    let issuer = Address::generate(env);
    let contract = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(env, &contract);

    client.initialize(&admin);
    env.mock_all_auths();
    client.add_issuer(&issuer);

    (contract, admin, issuer)
}
