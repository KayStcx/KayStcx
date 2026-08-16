//! TTL management for persistent storage entries.

use soroban_sdk::{Env, IntoVal, Val};

/// Default TTL duration (example: 30 days in ledger blocks)
pub const DEFAULT_TTL: u32 = 30 * 24 * 60 * 60; // adjust based on your block time

/// Extend the TTL of a persistent storage key.
///
/// The TTL is only extended if the entry's current TTL is below
/// `threshold` ledgers; it is then set to `extend_to` ledgers.
/// The TTL is the number of ledgers between the current ledger and the
/// final ledger in which the data can still be accessed.
pub fn extend_ttl<K>(env: &Env, key: &K, threshold: u32, extend_to: u32)
where
    K: IntoVal<Env, Val>,
{
    env.storage()
        .persistent()
        .extend_ttl(key, threshold, extend_to);
}
