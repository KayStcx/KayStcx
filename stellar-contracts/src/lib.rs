// src/lib.rs
#![no_std]
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Map, String};

mod admin;
mod events;
mod fee;
mod fee_collection;
mod storage_types;

use storage_types::DataKey;

#[derive(soroban_sdk::contracttype, Clone)]
pub struct FeeConfig {
    pub enabled: bool,
    pub fee_amount: i128,      // in stroops (1 XLM = 10_000_000 stroops)
    pub treasury: Option<Address>,
}

#[contract]
pub struct CertificateContract;

#[contractimpl]
impl CertificateContract {

    /// Initialize contract with admin, treasury, and optional fee
    pub fn initialize(
        env: Env,
        admin: Address,
        treasury: Address,
        native_token: Address,
        initial_fee: i128,
        fee_enabled: bool,
    ) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        fee::set_treasury(&env, &treasury);
        fee::set_fee(&env, initial_fee);
        fee::set_fee_enabled(&env, fee_enabled);
        env.storage().instance().set(&DataKey::NativeToken, &native_token);
    }

    // ─── Admin: Fee Configuration ────────────────────────────────────────

    pub fn set_fee_config(
        env: Env,
        caller: Address,
        fee_amount: i128,
        enabled: bool,
    ) {
        admin::require_admin(&env, &caller);
        fee::set_fee(&env, fee_amount);
        fee::set_fee_enabled(&env, enabled);
    }

    pub fn set_treasury(env: Env, caller: Address, new_treasury: Address) {
        admin::require_admin(&env, &caller);
        fee::set_treasury(&env, &new_treasury);
    }

    pub fn set_fee_waiver(env: Env, caller: Address, issuer: Address, waived: bool) {
        admin::require_admin(&env, &caller);
        fee::set_fee_waiver(&env, &issuer, waived);
    }

    // ─── View: Fee Config ─────────────────────────────────────────────────

    pub fn get_fee_config(env: Env) -> FeeConfig {
        FeeConfig {
            enabled: fee::get_fee_enabled(&env),
            fee_amount: fee::get_fee(&env),
            treasury: fee::get_treasury(&env),
        }
    }

    pub fn is_fee_waived(env: Env, issuer: Address) -> bool {
        fee::is_fee_waived(&env, &issuer)
    }

    // ─── Core: Issue Certificate ──────────────────────────────────────────

    pub fn issue_certificate(
        env: Env,
        issuer: Address,
        recipient: Address,
        cert_id: BytesN<32>,
        metadata: String,
    ) {
        issuer.require_auth();

        // 💰 Collect fee BEFORE issuing
        fee_collection::collect_issuance_fee(&env, &issuer);

        // Store certificate
        let cert_data = (recipient.clone(), metadata, env.ledger().timestamp());
        env.storage()
            .persistent()
            .set(&DataKey::Certificate(cert_id.clone()), &cert_data);

        // Emit certificate issued event
        let topics = (soroban_sdk::Symbol::new(&env, "CertIssued"), issuer.clone());
        env.events().publish(topics, (recipient, cert_id));
    }
}