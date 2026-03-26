#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, IntoVal, String, Vec};

/// Types of critical administrative actions that can be proposed.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AdminAction {
    /// Upgrade the contract to a new Wasm hash.
    UpgradeContract(BytesN<32>),
    /// Update the global configuration (e.g., fee amounts).
    UpdateConfig(u32, Vec<Address>),
    /// Other custom administrative actions (could be parsed individually).
    Other(String),
}

/// Admin Multisig Configuration.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminMultisigConfig {
    pub threshold: u32,
    pub signers: Vec<Address>,
}

/// Status of an admin proposal.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AdminProposalStatus {
    Pending,
    Approved,
    Executed,
    Expired,
    Rejected,
}

/// Structure representing a pending admin proposal.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminProposal {
    pub id: String,
    pub action: AdminAction,
    pub proposer: Address,
    pub approvals: Vec<Address>,
    pub created_at: u64,
    pub expires_at: u64,
    pub status: AdminProposalStatus,
}

#[contract]
pub struct AdminMultisigContract;

#[contractimpl]
impl AdminMultisigContract {
    /// Initialize the global admin multisig config.
    ///
    /// `certificate_contract` is the address of the CertificateContract that this
    /// admin multisig governs (used for cross-contract upgrade calls).
    pub fn init_admin_multisig(
        env: Env,
        threshold: u32,
        signers: Vec<Address>,
        certificate_contract: Address,
    ) {
        if signers.is_empty() {
            panic!("Must provide at least one signer");
        }
        if threshold == 0 || threshold > signers.len() as u32 {
            panic!("Invalid threshold");
        }

        let config_key = DataKey::AdminConfig;
        if env.storage().instance().has(&config_key) {
            panic!("Admin multisig already initialized");
        }

        env.storage().instance().set(&config_key, &AdminMultisigConfig {
            threshold,
            signers,
        });
        env.storage()
            .instance()
            .set(&DataKey::CertificateContractId, &certificate_contract);
    }

    /// Propose a new administrative action.
    pub fn propose_admin_action(
        env: Env,
        proposal_id: String,
        proposer: Address,
        action: AdminAction,
        duration_secs: u64,
    ) -> AdminProposal {
        proposer.require_auth();

        let config: AdminMultisigConfig = env.storage()
            .instance()
            .get(&DataKey::AdminConfig)
            .expect("Admin multisig not initialized");

        if !config.signers.contains(&proposer) {
            panic!("Not an authorized admin signer");
        }

        let proposal_key = DataKey::AdminProposal(proposal_id.clone());
        if env.storage().instance().has(&proposal_key) {
            panic!("Proposal already exists");
        }

        let created_at = env.ledger().timestamp();
        let expires_at = created_at + duration_secs;

        let proposal = AdminProposal {
            id: proposal_id.clone(),
            action: action.clone(),
            proposer: proposer.clone(),
            approvals: Vec::new(&env),
            created_at,
            expires_at,
            status: AdminProposalStatus::Pending,
        };

        env.storage().instance().set(&proposal_key, &proposal);

        env.events().publish(
            ("admin_propose",),
            proposal_id.clone(),
        );

        proposal
    }

    /// Approve an administrative action. Automatically executes if threshold is reached.
    pub fn approve_admin_action(
        env: Env,
        proposal_id: String,
        approver: Address,
    ) -> AdminProposalStatus {
        approver.require_auth();

        let config: AdminMultisigConfig = env.storage()
            .instance()
            .get(&DataKey::AdminConfig)
            .expect("Admin multisig not initialized");

        if !config.signers.contains(&approver) {
            panic!("Not an authorized admin signer");
        }

        let proposal_key = DataKey::AdminProposal(proposal_id.clone());
        let mut proposal: AdminProposal = env.storage()
            .instance()
            .get(&proposal_key)
            .expect("Proposal not found");

        if proposal.status != AdminProposalStatus::Pending {
            panic!("Proposal is not pending");
        }

        if env.ledger().timestamp() > proposal.expires_at {
            proposal.status = AdminProposalStatus::Expired;
            env.storage().instance().set(&proposal_key, &proposal);
            return AdminProposalStatus::Expired;
        }

        if proposal.approvals.contains(&approver) {
            panic!("Already approved by this signer");
        }

        proposal.approvals.push_back(approver.clone());

        env.events().publish(
            ("admin_approve",),
            (proposal_id.clone(), approver),
        );

        let mut status = AdminProposalStatus::Pending;
        if proposal.approvals.len() as u32 >= config.threshold {
            proposal.status = AdminProposalStatus::Approved;
            status = AdminProposalStatus::Approved;
        }

        env.storage().instance().set(&proposal_key, &proposal);
        
        // Auto-execute if approved
        if status == AdminProposalStatus::Approved {
            status = Self::execute_admin_action(env.clone(), proposal_id);
        }

        status
    }

    /// Internal method to execute an action.
    fn execute_admin_action(env: Env, proposal_id: String) -> AdminProposalStatus {
        let proposal_key = DataKey::AdminProposal(proposal_id.clone());
        let mut proposal: AdminProposal = env.storage()
            .instance()
            .get(&proposal_key)
            .expect("Proposal not found");

        if proposal.status != AdminProposalStatus::Approved {
            panic!("Proposal is not approved");
        }

        match &proposal.action {
            AdminAction::UpgradeContract(wasm_hash) => {
                let cert_contract: Address = env
                    .storage()
                    .instance()
                    .get(&DataKey::CertificateContractId)
                    .expect("Certificate contract not registered");
                env.invoke_contract::<()>(
                    &cert_contract,
                    &symbol_short!("upgrade"),
                    (wasm_hash.clone(),).into_val(&env),
                );
            },
            AdminAction::UpdateConfig(new_threshold, new_signers) => {
                let mut config: AdminMultisigConfig = env
                    .storage()
                    .instance()
                    .get(&DataKey::AdminConfig)
                    .expect("Admin config not found");
                config.threshold = *new_threshold;
                config.signers = new_signers.clone();
                env.storage().instance().set(&DataKey::AdminConfig, &config);
            },
            AdminAction::Other(_data) => {
                // Execute other custom logic
            },
        }

        proposal.status = AdminProposalStatus::Executed;
        env.storage().instance().set(&proposal_key, &proposal);

        env.events().publish(
            ("admin_execute",),
            proposal_id,
        );

        AdminProposalStatus::Executed
    }
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    AdminConfig,
    AdminProposal(String),
    CertificateContractId,
}
