// src/fee_collection.rs
use soroban_sdk::{Address, Env, token};
use crate::{fee, events};

/// Call this inside `issue_certificate` before minting
pub fn collect_issuance_fee(env: &Env, issuer: &Address) {
    if !fee::get_fee_enabled(env) {
        return;
    }
    if fee::is_fee_waived(env, issuer) {
        return;
    }

    let amount = fee::get_fee(env);
    if amount == 0 {
        return;
    }

    let treasury = fee::get_treasury(env).expect("treasury not configured");

    // Transfer XLM (native token) from issuer to treasury
    let xlm_token = token::StellarAssetClient::new(env, &get_native_token_id(env));
    xlm_token.transfer(issuer, &treasury, &amount);

    events::emit_fees_collected(env, issuer, &treasury, amount);
}

fn get_native_token_id(env: &Env) -> soroban_sdk::Address {
    // Stellar native XLM token contract address
    // On mainnet: CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA
    // Store it at init time or hardcode for your network
    env.storage()
        .instance()
        .get(&crate::storage_types::DataKey::NativeToken)
        .expect("native token not configured")
}