//! Storage layer for the certificate-revocation contract.
//!
//! All storage-related code lives in this module:
//! - Key types (`StorageKey`, `CoreDataKey`, `AdminDataKey`) and generic
//!   access helpers (e.g. `set_admin`, `get_admin`) are defined here.
//! - TTL management (`DEFAULT_TTL`, `extend_ttl`) lives in [`ttl`].
//!
//! The main contract's certificate, issuer, multisig and CRL data uses the
//! `DataKey` enum in `types.rs`; this module provides reusable helpers for
//! other storage needs (e.g. admin-multisig configuration).

use soroban_sdk::{contracttype, Address, Env, Vec};

/// Storage keys for the admin multisig contract.
/// Named `StorageKey` to avoid conflict with the `DataKey` enum in `types.rs`.
#[contracttype]
#[derive(Clone)]
pub enum StorageKey {
    Core(CoreDataKey),
    Admin(AdminDataKey),
}

#[contracttype]
#[derive(Clone)]
pub enum CoreDataKey {
    Admin,
    Balance(Address),
}

#[contracttype]
#[derive(Clone)]
pub enum AdminDataKey {
    Owners,
    Threshold,
}

pub mod ttl;

pub use ttl::{extend_ttl, DEFAULT_TTL};

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage()
        .persistent()
        .set(&StorageKey::Core(CoreDataKey::Admin), admin);
}

pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .persistent()
        .get(&StorageKey::Core(CoreDataKey::Admin))
        .expect("Admin not set")
}

pub fn set_owners(env: &Env, owners: &Vec<Address>) {
    env.storage()
        .persistent()
        .set(&StorageKey::Admin(AdminDataKey::Owners), owners);
}
