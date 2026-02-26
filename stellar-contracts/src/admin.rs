// src/admin.rs
use soroban_sdk::{Address, Env, panic_with_error};
use crate::storage_types::DataKey;

pub fn get_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

pub fn require_admin(env: &Env, caller: &Address) {
    let admin = get_admin(env);
    if admin != *caller {
        panic!("not authorized");
    }
    caller.require_auth();
}