#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String, Vec};

#[test]
fn test_admin_multisig_flow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AdminMultisigContract);
    let client = AdminMultisigContractClient::new(&env, &contract_id);

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let admin3 = Address::generate(&env);

    let mut signers = Vec::new(&env);
    signers.push_back(admin1.clone());
    signers.push_back(admin2.clone());
    signers.push_back(admin3.clone());

    // Initialize with 2-of-3 multisig
    client.init_admin_multisig(&2, &signers);

    // Proposer proposes an action
    let proposal_id = String::from_str(&env, "prop-1");
    let action = AdminAction::Other(String::from_str(&env, "custom_action"));
    
    env.mock_all_auths();
    
    let proposal = client.propose_admin_action(
        &proposal_id,
        &admin1,
        &action,
        &86400, // 1 day
    );

    assert_eq!(proposal.status, AdminProposalStatus::Pending);

    // Admin1 approves (now 1-of-2)
    let status1 = client.approve_admin_action(&proposal_id, &admin1);
    assert_eq!(status1, AdminProposalStatus::Pending);

    // Admin2 approves (now 2-of-2), reaches threshold, autocompletes
    let status2 = client.approve_admin_action(&proposal_id, &admin2);
    assert_eq!(status2, AdminProposalStatus::Executed);
}
