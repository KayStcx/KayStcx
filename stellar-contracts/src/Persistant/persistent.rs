use soroban_sdk::{Env, Symbol, Storage};

/// Store a value in persistent storage
pub fn set_persistent<T: soroban_sdk::storage::StorageKey, V: Clone>(
    env: &Env,
    key: &T,
    value: &V,
) {
    env.storage().persistent().set(key, value);
}

/// Retrieve a value from persistent storage
pub fn get_persistent<T: soroban_sdk::storage::StorageKey, V: Clone>(
    env: &Env,
    key: &T,
) -> Option<V> {
    env.storage().persistent().get(key)
}

/// Remove a value from persistent storage
pub fn remove_persistent<T: soroban_sdk::storage::StorageKey>(
    env: &Env,
    key: &T,
) {
    env.storage().persistent().remove(key);
}