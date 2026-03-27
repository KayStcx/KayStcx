use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
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