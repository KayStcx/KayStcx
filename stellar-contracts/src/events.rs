// src/events.rs
use soroban_sdk::{Address, Env, Symbol, symbol_short};

pub fn emit_fees_collected(env: &Env, issuer: &Address, treasury: &Address, amount: i128) {
    let topics = (Symbol::new(env, "FeesCollected"), issuer.clone());
    env.events().publish(topics, (treasury.clone(), amount));
}