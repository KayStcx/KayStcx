use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, IntoVal, String,
    Vec,
};

use crate::ContractError;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AdminAction {
    UpgradeContract(BytesN<32>),
    RemoveIssuer(Address),
    UpdateConfig(u32, Vec<Address>, u32),
    Other(String),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminMultisigConfig {
    pub threshold: u32,
    pub signers: Vec<Address>,
    pub proposal_window: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AdminProposalStatus {
    Pending,
    Approved,
    Executed,
    Expired,
    Rejected,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminProposal {
    pub id: String,
    pub action: AdminAction,
    pub proposer: Address,
    pub approvals: Vec<Address>,
    pub created_ledger: u32,
    pub expires_at_ledger: u32,
    pub status: AdminProposalStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProposalCreatedEvent {
    pub proposal_id: String,
    pub proposer: Address,
    pub expires_at_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProposalApprovedEvent {
    pub proposal_id: String,
    pub approver: Address,
    pub approval_count: u32,
    pub threshold: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProposalCanceledEvent {
    pub proposal_id: String,
    pub proposer: Address,
}

#[contract]
pub struct AdminMultisigContract;

#[contractimpl]
impl AdminMultisigContract {
    pub fn init_admin_multisig(
        env: Env,
        threshold: u32,
        signers: Vec<Address>,
        proposal_window: u32,
    ) -> Result<(), ContractError> {
        Self::validate_config(&signers, threshold, proposal_window)?;

        if env
            .storage()
            .instance()
            .has(&AdminMultisigDataKey::AdminConfig)
        {
            return Err(ContractError::AlreadyExists);
        }

        env.storage().instance().set(
            &AdminMultisigDataKey::AdminConfig,
            &AdminMultisigConfig {
                threshold,
                signers,
                proposal_window,
            },
        );

        Ok(())
    }

    pub fn get_config(env: Env) -> Result<AdminMultisigConfig, ContractError> {
        env.storage()
            .instance()
            .get(&AdminMultisigDataKey::AdminConfig)
            .ok_or(ContractError::NotInitialized)
    }

    pub fn propose_action(
        env: Env,
        proposal_id: String,
        proposer: Address,
        action: AdminAction,
    ) -> Result<AdminProposal, ContractError> {
        proposer.require_auth();

        let config = Self::get_config(env.clone())?;
        Self::require_signer(&config.signers, &proposer)?;

        let proposal_key = AdminMultisigDataKey::AdminProposal(proposal_id.clone());
        if env.storage().instance().has(&proposal_key) {
            return Err(ContractError::AlreadyExists);
        }

        let created_ledger = env.ledger().sequence();
        let expires_at_ledger = created_ledger.saturating_add(config.proposal_window);

        let proposal = AdminProposal {
            id: proposal_id.clone(),
            action,
            proposer: proposer.clone(),
            approvals: Vec::new(&env),
            created_ledger,
            expires_at_ledger,
            status: AdminProposalStatus::Pending,
        };

        env.storage().instance().set(&proposal_key, &proposal);
        env.events().publish(
            (symbol_short!("proposal"), symbol_short!("created")),
            ProposalCreatedEvent {
                proposal_id,
                proposer,
                expires_at_ledger,
            },
        );

        Ok(proposal)
    }

    pub fn approve_action(
        env: Env,
        proposal_id: String,
        approver: Address,
    ) -> Result<AdminProposalStatus, ContractError> {
        approver.require_auth();

        let config = Self::get_config(env.clone())?;
        Self::require_signer(&config.signers, &approver)?;

        let proposal_key = AdminMultisigDataKey::AdminProposal(proposal_id.clone());
        let mut proposal: AdminProposal = env
            .storage()
            .instance()
            .get(&proposal_key)
            .ok_or(ContractError::NotFound)?;

        if proposal.status != AdminProposalStatus::Pending {
            return Err(ContractError::InvalidState);
        }

        let current_ledger = env.ledger().sequence();
        if current_ledger > proposal.expires_at_ledger {
            proposal.status = AdminProposalStatus::Expired;
            env.storage().instance().set(&proposal_key, &proposal);
            return Ok(AdminProposalStatus::Expired);
        }

        if proposal.proposer == approver {
            return Err(ContractError::Unauthorized);
        }

        if proposal.approvals.contains(&approver) {
            return Err(ContractError::AlreadyExists);
        }

        proposal.approvals.push_back(approver.clone());
        let approval_count = proposal.approvals.len();

        env.events().publish(
            (symbol_short!("proposal"), symbol_short!("approved")),
            ProposalApprovedEvent {
                proposal_id: proposal_id.clone(),
                approver,
                approval_count,
                threshold: config.threshold,
            },
        );

        let mut status = AdminProposalStatus::Pending;
        if approval_count >= config.threshold {
            proposal.status = AdminProposalStatus::Approved;
            status = AdminProposalStatus::Approved;
        }

        env.storage().instance().set(&proposal_key, &proposal);

        if status == AdminProposalStatus::Approved {
            status = Self::execute_action(env, proposal_id)?;
        }

        Ok(status)
    }

    pub fn cancel_proposal(
        env: Env,
        proposal_id: String,
        proposer: Address,
    ) -> Result<(), ContractError> {
        proposer.require_auth();

        let proposal_key = AdminMultisigDataKey::AdminProposal(proposal_id.clone());
        let mut proposal: AdminProposal = env
            .storage()
            .instance()
            .get(&proposal_key)
            .ok_or(ContractError::NotFound)?;

        if proposal.proposer != proposer {
            return Err(ContractError::Unauthorized);
        }

        if proposal.status != AdminProposalStatus::Pending {
            return Err(ContractError::InvalidState);
        }

        proposal.status = AdminProposalStatus::Rejected;
        env.storage().instance().set(&proposal_key, &proposal);

        env.events().publish(
            (symbol_short!("proposal"), symbol_short!("canceled")),
            ProposalCanceledEvent {
                proposal_id,
                proposer,
            },
        );

        Ok(())
    }

    pub fn get_proposal(env: Env, proposal_id: String) -> Result<AdminProposal, ContractError> {
        env.storage()
            .instance()
            .get(&AdminMultisigDataKey::AdminProposal(proposal_id))
            .ok_or(ContractError::NotFound)
    }

    pub fn is_issuer_removed(env: Env, issuer: Address) -> bool {
        env.storage()
            .instance()
            .get(&AdminMultisigDataKey::RemovedIssuer(issuer))
            .unwrap_or(false)
    }

    pub fn propose_admin_action(
        env: Env,
        proposal_id: String,
        proposer: Address,
        action: AdminAction,
    ) -> Result<AdminProposal, ContractError> {
        Self::propose_action(env, proposal_id, proposer, action)
    }

    pub fn approve_admin_action(
        env: Env,
        proposal_id: String,
        approver: Address,
    ) -> Result<AdminProposalStatus, ContractError> {
        Self::approve_action(env, proposal_id, approver)
    }

    pub fn set_certificate_contract(
        env: Env,
        signer: Address,
        certificate_contract: Address,
    ) -> Result<(), ContractError> {
        signer.require_auth();

        let config = Self::get_config(env.clone())?;
        Self::require_signer(&config.signers, &signer)?;

        env.storage()
            .instance()
            .set(&AdminMultisigDataKey::CertificateContractId, &certificate_contract);

        Ok(())
    }

    pub fn get_certificate_contract(env: Env) -> Result<Address, ContractError> {
        env.storage()
            .instance()
            .get(&AdminMultisigDataKey::CertificateContractId)
            .ok_or(ContractError::NotInitialized)
    }

    fn execute_action(env: Env, proposal_id: String) -> Result<AdminProposalStatus, ContractError> {
        let proposal_key = AdminMultisigDataKey::AdminProposal(proposal_id.clone());
        let mut proposal: AdminProposal = env
            .storage()
            .instance()
            .get(&proposal_key)
            .ok_or(ContractError::NotFound)?;

        if proposal.status != AdminProposalStatus::Approved {
            return Err(ContractError::InvalidState);
        }

        match &proposal.action {
            AdminAction::UpgradeContract(wasm_hash) => {
                env.deployer()
                    .update_current_contract_wasm(wasm_hash.clone());
            }
            AdminAction::RemoveIssuer(issuer) => {
                env.storage()
                    .instance()
                    .set(&AdminMultisigDataKey::RemovedIssuer(issuer.clone()), &true);

                let certificate_contract: Address = env
                    .storage()
                    .instance()
                    .get(&AdminMultisigDataKey::CertificateContractId)
                    .ok_or(ContractError::NotInitialized)?;

                let _: () = env.invoke_contract(
                    &certificate_contract,
                    &soroban_sdk::Symbol::new(&env, "remove_issuer"),
                    soroban_sdk::vec![&env, issuer.clone().into_val(&env)],
                );
            }
            AdminAction::UpdateConfig(threshold, signers, proposal_window) => {
                Self::validate_config(signers, *threshold, *proposal_window)?;
                env.storage().instance().set(
                    &AdminMultisigDataKey::AdminConfig,
                    &AdminMultisigConfig {
                        threshold: *threshold,
                        signers: signers.clone(),
                        proposal_window: *proposal_window,
                    },
                );
            }
            AdminAction::Other(_) => {}
        }

        proposal.status = AdminProposalStatus::Executed;
        env.storage().instance().set(&proposal_key, &proposal);
        env.events().publish(
            (symbol_short!("proposal"), symbol_short!("executed")),
            proposal_id,
        );

        Ok(AdminProposalStatus::Executed)
    }

    fn require_signer(signers: &Vec<Address>, signer: &Address) -> Result<(), ContractError> {
        if !signers.contains(signer) {
            return Err(ContractError::Unauthorized);
        }
        Ok(())
    }

    fn validate_config(
        signers: &Vec<Address>,
        threshold: u32,
        proposal_window: u32,
    ) -> Result<(), ContractError> {
        #[allow(clippy::unnecessary_cast)]
        if signers.is_empty() || threshold == 0 || threshold > signers.len() as u32 {
            return Err(ContractError::InvalidConfig);
        }

        if proposal_window == 0 {
            return Err(ContractError::InvalidConfig);
        }

        Ok(())
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AdminMultisigDataKey {
    AdminConfig,
    AdminProposal(String),
    CertificateContractId,
    RemovedIssuer(Address),
}
