use soroban_sdk::{Env, Symbol, Storage};

/// Default TTL duration (example: 30 days in ledger blocks)
pub const DEFAULT_TTL: u32 = 30 * 24 * 60 * 60; // adjust based on your block time

/// Extend TTL for a given persistent storage key
pub fn extend_ttl<T: soroban_sdk::storage::StorageKey>(
    env: &Env,
    key: &T,
    ttl: Option<u32>,
) {
    let ttl_duration = ttl.unwrap_or(DEFAULT_TTL);
    // Extend the TTL for the persistent storage entry
    env.storage().persistent().extend_ttl(key, ttl_duration);
}