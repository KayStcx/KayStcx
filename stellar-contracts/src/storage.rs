use soroban_sdk::{contracttype, Address};

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
