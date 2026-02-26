// src/fee.rs
use soroban_sdk::{Address, Env};
use crate::storage_types::DataKey;

pub fn get_fee(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::IssuanceFee).unwrap_or(0)
}

pub fn set_fee(env: &Env, fee: i128) {
    env.storage().instance().set(&DataKey::IssuanceFee, &fee);
}

pub fn get_fee_enabled(env: &Env) -> bool {
    env.storage().instance().get(&DataKey::FeeEnabled).unwrap_or(false)
}

pub fn set_fee_enabled(env: &Env, enabled: bool) {
    env.storage().instance().set(&DataKey::FeeEnabled, &enabled);
}

pub fn get_treasury(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Treasury)
}

pub fn set_treasury(env: &Env, treasury: &Address) {
    env.storage().instance().set(&DataKey::Treasury, treasury);
}

pub fn is_fee_waived(env: &Env, issuer: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::WaivedIssuer(issuer.clone()))
        .unwrap_or(false)
}

pub fn set_fee_waiver(env: &Env, issuer: &Address, waived: bool) {
    env.storage()
        .persistent()
        .set(&DataKey::WaivedIssuer(issuer.clone()), &waived);
}