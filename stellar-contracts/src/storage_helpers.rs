use soroban_sdk::{Env, Address};
use crate::storage::{DataKey, CoreDataKey, AdminDataKey};

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().set(
        &DataKey::Core(CoreDataKey::Admin),
        admin,
    );
}

pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .get(&DataKey::Core(CoreDataKey::Admin))
        .unwrap()
}

pub fn set_owners(env: &Env, owners: &Vec<Address>) {
    env.storage().set(
        &DataKey::Admin(AdminDataKey::Owners),
        owners,
    );
}