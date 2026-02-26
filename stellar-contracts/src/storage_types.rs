// src/storage_types.rs
use soroban_sdk::contracttype;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Treasury,
    IssuanceFee,       // i128 (in stroops)
    FeeEnabled,        // bool
    WaivedIssuer(soroban_sdk::Address),  // per-issuer waiver
    Certificate(soroban_sdk::BytesN<32>),
}