// src/lib.rs
#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env, String, Vec,
};

mod admin;
mod events;
mod fee;
mod fee_collection;
mod storage_types;

use storage_types::DataKey;

// ─────────────────────────────────────────────────────────────────────────────
// Fee Configuration Struct (From Feature Branch)
// ─────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct FeeConfig {
    pub enabled: bool,
    pub fee_amount: i128,
    pub treasury: Option<Address>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Certificate Types (From Main Branch)
// ─────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CertificateStatus {
    Active,
    Revoked,
    Expired,
    Suspended,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Certificate {
    pub id: String,
    pub issuer: Address,
    pub owner: Address,
    pub metadata_uri: String,
    pub issued_at: u64,
    pub status: CertificateStatus,
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract Definition
// ─────────────────────────────────────────────────────────────────────────────

#[contract]
pub struct CertificateContract;

#[contractimpl]
impl CertificateContract {
    // ─────────────────────────────────────────────────────────────
    // Initialize (Merged Cleanly)
    // ─────────────────────────────────────────────────────────────

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
        env.storage().instance().set(&DataKey::NativeToken, &native_token);

        fee::set_treasury(&env, &treasury);
        fee::set_fee(&env, initial_fee);
        fee::set_fee_enabled(&env, fee_enabled);
    }

    // ─────────────────────────────────────────────────────────────
    // Admin Fee Controls
    // ─────────────────────────────────────────────────────────────

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

    // ─────────────────────────────────────────────────────────────
    // View: Fee Config
    // ─────────────────────────────────────────────────────────────

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

    // ─────────────────────────────────────────────────────────────
    // Issue Certificate (Merged with Fee Collection)
    // ─────────────────────────────────────────────────────────────

    pub fn issue_certificate(
        env: Env,
        issuer: Address,
        recipient: Address,
        id: String,
        metadata_uri: String,
    ) {
        issuer.require_auth();

        if env.storage().instance().has(&id) {
            panic!("Certificate already exists");
        }

        // 💰 Collect fee BEFORE issuing
        fee_collection::collect_issuance_fee(&env, &issuer);

        let cert = Certificate {
            id: id.clone(),
            issuer: issuer.clone(),
            owner: recipient.clone(),
            metadata_uri: metadata_uri.clone(),
            issued_at: env.ledger().timestamp(),
            status: CertificateStatus::Active,
        };

        env.storage().instance().set(&id, &cert);

        // Emit issued event
        env.events().publish(
            (symbol_short!("cert_issued"), id.clone()),
            (issuer, recipient),
        );
    }

    // ─────────────────────────────────────────────────────────────
    // Get Certificate
    // ─────────────────────────────────────────────────────────────

    pub fn get_certificate(env: Env, id: String) -> Certificate {
        env.storage()
            .instance()
            .get(&id)
            .expect("Certificate not found")
    }

    // ─────────────────────────────────────────────────────────────
    // Status Helpers
    // ─────────────────────────────────────────────────────────────

    pub fn is_active(env: Env, id: String) -> bool {
        if let Some(cert) = env.storage().instance().get::<_, Certificate>(&id) {
            cert.status == CertificateStatus::Active
        } else {
            false
        }
    }

    pub fn revoke_certificate(env: Env, id: String) {
        let mut cert: Certificate = env
            .storage()
            .instance()
            .get(&id)
            .expect("Certificate not found");

        cert.issuer.require_auth();

        cert.status = CertificateStatus::Revoked;

        env.storage().instance().set(&id, &cert);

        env.events().publish(
            (symbol_short!("cert_revoked"), id),
            cert.issuer,
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test;