use soroban_sdk::{contracttype, Address};
pub mod ttl;
pub use ttl::{extend_ttl, extend_instance_ttl, TtlInstanceExt, DEFAULT_TTL};

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
