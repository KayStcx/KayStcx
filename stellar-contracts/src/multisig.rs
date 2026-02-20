#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, Map};

// Multi-sig configuration for an issuer
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MultisigConfig {
    pub threshold: u32, // Number of signatures required
    pub signers: Vec<Address>, // List of authorized signers
    pub max_signers: u32, // Maximum number of allowed signers
}

// Pending certificate issuance request
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PendingRequest {
    pub id: String,
    pub issuer: Address,
    pub recipient: Address,
    pub metadata: String, // Could be a URI to IPFS or other storage
    pub proposer: Address, // The address that initiated the request
    pub approvals: Vec<Address>, // Addresses that have approved
    pub rejections: Vec<Address>, // Addresses that have rejected
    pub created_at: u64, // Timestamp when request was created
    pub expires_at: u64, // Timestamp when request expires
    pub status: RequestStatus,
}

// Status of a pending request
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RequestStatus {
    Pending,
    Approved,
    Rejected,
    Expired,
    Issued,
}

// Signature record for tracking approvals/rejections
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SignatureRecord {
    pub signer: Address,
    pub action: SignatureAction,
    pub timestamp: u64,
    pub reason: Option<String>,
}

// Action taken by a signer
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SignatureAction {
    Approved,
    Rejected,
}

// Event for multi-sig operations
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MultisigEvent {
    pub request_id: String,
    pub signer: Address,
    pub action: SignatureAction,
    pub timestamp: u64,
}

// Result of a signature operation
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SignatureResult {
    pub success: bool,
    pub message: String,
    pub final_status: Option<RequestStatus>,
}

// Pagination parameters
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Pagination {
    pub page: u32,
    pub limit: u32,
}

// Paginated result
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaginatedResult {
    pub data: Vec<PendingRequest>,
    pub total: u32,
    pub page: u32,
    pub limit: u32,
    pub has_next: bool,
}

#[contract]
pub struct MultisigCertificateContract;

#[contractimpl]
impl MultisigCertificateContract {
    // Initialize the multisig configuration for an issuer
    pub fn init_multisig_config(
        env: Env,
        issuer: Address,
        threshold: u32,
        signers: Vec<Address>,
        max_signers: u32,
        admin: Address,
    ) {
        admin.require_auth();

        // Validate inputs
        if threshold == 0 {
            panic!("Threshold must be greater than 0");
        }
        if signers.len() == 0 {
            panic!("Must provide at least one signer");
        }
        if threshold > signers.len() as u32 {
            panic!("Threshold cannot exceed number of signers");
        }
        if max_signers == 0 || max_signers < threshold {
            panic!("Max signers must be at least equal to threshold");
        }

        // Set the multisig configuration
        env.storage()
            .instance()
            .set(&self::DataKey::MultisigConfig(issuer.clone()), &MultisigConfig {
                threshold,
                signers,
                max_signers,
            });

        // Set the admin for this issuer
        env.storage()
            .instance()
            .set(&self::DataKey::IssuerAdmin(issuer), &admin);
    }

    // Update the multisig configuration for an issuer
    pub fn update_multisig_config(
        env: Env,
        issuer: Address,
        new_threshold: Option<u32>,
        new_signers: Option<Vec<Address>>,
        new_max_signers: Option<u32>,
    ) {
        let admin: Address = env.storage()
            .instance()
            .get(&self::DataKey::IssuerAdmin(issuer.clone()))
            .expect("Issuer admin not found");

        admin.require_auth();

        let mut config: MultisigConfig = env.storage()
            .instance()
            .get(&self::DataKey::MultisigConfig(issuer.clone()))
            .expect("Multisig config not found");

        if let Some(threshold) = new_threshold {
            if threshold == 0 {
                panic!("Threshold must be greater than 0");
            }
            if let Some(ref signers) = new_signers {
                if threshold > signers.len() as u32 {
                    panic!("Threshold cannot exceed number of signers");
                }
                config.threshold = threshold;
                config.signers = signers.clone();
            } else if threshold > config.signers.len() as u32 {
                panic!("Threshold cannot exceed number of signers");
            } else {
                config.threshold = threshold;
            }
        }

        if let Some(signers) = new_signers {
            if signers.len() == 0 {
                panic!("Must provide at least one signer");
            }
            if config.threshold > signers.len() as u32 {
                panic!("Threshold cannot exceed number of signers");
            }
            config.signers = signers;
        }

        if let Some(max_signers) = new_max_signers {
            if max_signers == 0 || max_signers < config.threshold {
                panic!("Max signers must be at least equal to threshold");
            }
            config.max_signers = max_signers;
        }

        env.storage()
            .instance()
            .set(&self::DataKey::MultisigConfig(issuer), &config);
    }

    // Propose a new certificate for multi-sig issuance
    pub fn propose_certificate(
        env: Env,
        request_id: String,
        issuer: Address,
        recipient: Address,
        metadata: String,
        expiration_days: u32,
    ) -> PendingRequest {
        // Verify that the issuer has a multisig configuration
        let config: MultisigConfig = env.storage()
            .instance()
            .get(&self::DataKey::MultisigConfig(issuer.clone()))
            .expect("Issuer does not have multisig configuration");

        // Check if request already exists
        if env.storage().instance().has(&self::DataKey::PendingRequest(request_id.clone())) {
            panic!("Request already exists");
        }

        // The proposer is the issuer for now (in practice, could be any signer)
        let proposer = issuer.clone();

        let now = env.ledger().timestamp();
        let expires_at = now + (expiration_days as u64 * 24 * 60 * 60); // Days to seconds

        let pending_request = PendingRequest {
            id: request_id.clone(),
            issuer: issuer.clone(),
            recipient,
            metadata,
            proposer,
            approvals: Vec::new(&env),
            rejections: Vec::new(&env),
            created_at: now,
            expires_at,
            status: RequestStatus::Pending,
        };

        // Store the pending request
        env.storage()
            .instance()
            .set(&self::DataKey::PendingRequest(request_id), &pending_request);

        pending_request
    }

    // Approve a pending certificate request
    pub fn approve_request(env: Env, request_id: String, approver: Address) -> SignatureResult {
        approver.require_auth();

        let mut request: PendingRequest = env.storage()
            .instance()
            .get(&self::DataKey::PendingRequest(request_id.clone()))
            .expect("Request not found");

        // Check if request has expired
        let now = env.ledger().timestamp();
        if now > request.expires_at {
            request.status = RequestStatus::Expired;
            env.storage()
                .instance()
                .set(&self::DataKey::PendingRequest(request_id.clone()), &request);
            return SignatureResult {
                success: false,
                message: "Request has expired".into(),
                final_status: Some(RequestStatus::Expired),
            };
        }

        // Check if request is already approved/issued/rejected/expired
        if request.status != RequestStatus::Pending {
            return SignatureResult {
                success: false,
                message: format!("Request is already {:?}", request.status).into(),
                final_status: Some(request.status.clone()),
            };
        }

        // Check if approver is an authorized signer
        let config: MultisigConfig = env.storage()
            .instance()
            .get(&self::DataKey::MultisigConfig(request.issuer.clone()))
            .expect("Issuer config not found");

        let mut is_authorized_signer = false;
        for signer in config.signers.iter() {
            if signer == approver {
                is_authorized_signer = true;
                break;
            }
        }

        if !is_authorized_signer {
            return SignatureResult {
                success: false,
                message: "Approver is not an authorized signer".into(),
                final_status: Some(request.status.clone()),
            };
        }

        // Check if already approved by this signer
        for approved_by in request.approvals.iter() {
            if approved_by == approver {
                return SignatureResult {
                    success: false,
                    message: "Request already approved by this signer".into(),
                    final_status: Some(request.status.clone()),
                };
            }
        }

        // Check if already rejected by this signer
        for rejected_by in request.rejections.iter() {
            if rejected_by == approver {
                return SignatureResult {
                    success: false,
                    message: "Request already rejected by this signer".into(),
                    final_status: Some(request.status.clone()),
                };
            }
        }

        // Add approval
        request.approvals.push_back(approver.clone());

        // Check if we have enough approvals
        if request.approvals.len() >= config.threshold as u32 {
            request.status = RequestStatus::Approved;
        }

        // Save the updated request
        env.storage()
            .instance()
            .set(&self::DataKey::PendingRequest(request_id.clone()), &request);

        // Emit event
        env.events().publish(
            ("multisig_approve",),
            MultisigEvent {
                request_id: request_id.clone(),
                signer: approver,
                action: SignatureAction::Approved,
                timestamp: now,
            },
        );

        SignatureResult {
            success: true,
            message: format!("Request approved. {} approvals received.", request.approvals.len()).into(),
            final_status: Some(request.status.clone()),
        }
    }

    // Reject a pending certificate request
    pub fn reject_request(
        env: Env,
        request_id: String,
        rejector: Address,
        reason: Option<String>,
    ) -> SignatureResult {
        rejector.require_auth();

        let mut request: PendingRequest = env.storage()
            .instance()
            .get(&self::DataKey::PendingRequest(request_id.clone()))
            .expect("Request not found");

        // Check if request has expired
        let now = env.ledger().timestamp();
        if now > request.expires_at {
            request.status = RequestStatus::Expired;
            env.storage()
                .instance()
                .set(&self::DataKey::PendingRequest(request_id.clone()), &request);
            return SignatureResult {
                success: false,
                message: "Request has expired".into(),
                final_status: Some(RequestStatus::Expired),
            };
        }

        // Check if request is already approved/issued/rejected/expired
        if request.status != RequestStatus::Pending {
            return SignatureResult {
                success: false,
                message: format!("Request is already {:?}", request.status).into(),
                final_status: Some(request.status.clone()),
            };
        }

        // Check if rejector is an authorized signer
        let config: MultisigConfig = env.storage()
            .instance()
            .get(&self::DataKey::MultisigConfig(request.issuer.clone()))
            .expect("Issuer config not found");

        let mut is_authorized_signer = false;
        for signer in config.signers.iter() {
            if signer == rejector {
                is_authorized_signer = true;
                break;
            }
        }

        if !is_authorized_signer {
            return SignatureResult {
                success: false,
                message: "Rejector is not an authorized signer".into(),
                final_status: Some(request.status.clone()),
            };
        }

        // Check if already rejected by this signer
        for rejected_by in request.rejections.iter() {
            if rejected_by == rejector {
                return SignatureResult {
                    success: false,
                    message: "Request already rejected by this signer".into(),
                    final_status: Some(request.status.clone()),
                };
            }
        }

        // Check if already approved by this signer
        for approved_by in request.approvals.iter() {
            if approved_by == rejector {
                return SignatureResult {
                    success: false,
                    message: "Signer already approved this request".into(),
                    final_status: Some(request.status.clone()),
                };
            }
        }

        // Add rejection
        request.rejections.push_back(rejector.clone());

        // Check if we have enough rejections to make it impossible to reach threshold
        // (if remaining possible approvals can't reach threshold)
        let total_signers = config.signers.len() as u32;
        let possible_approvals = total_signers - request.rejections.len();
        
        if possible_approvals < config.threshold {
            request.status = RequestStatus::Rejected;
        }

        // Save the updated request
        env.storage()
            .instance()
            .set(&self::DataKey::PendingRequest(request_id.clone()), &request);

        // Emit event
        env.events().publish(
            ("multisig_reject",),
            MultisigEvent {
                request_id: request_id.clone(),
                signer: rejector,
                action: SignatureAction::Rejected,
                timestamp: now,
            },
        );

        SignatureResult {
            success: true,
            message: format!("Request rejected. {} rejections received.", request.rejections.len()).into(),
            final_status: Some(request.status.clone()),
        }
    }

    // Issue a certificate after sufficient approvals
    pub fn issue_approved_certificate(env: Env, request_id: String) -> bool {
        let mut request: PendingRequest = env.storage()
            .instance()
            .get(&self::DataKey::PendingRequest(request_id.clone()))
            .expect("Request not found");

        // Check if request is approved
        if request.status != RequestStatus::Approved {
            panic!("Request is not approved");
        }

        // Check if request has expired
        let now = env.ledger().timestamp();
        if now > request.expires_at {
            request.status = RequestStatus::Expired;
            env.storage()
                .instance()
                .set(&self::DataKey::PendingRequest(request_id.clone()), &request);
            return false;
        }

        // Get the multisig config to verify thresholds
        let config: MultisigConfig = env.storage()
            .instance()
            .get(&self::DataKey::MultisigConfig(request.issuer.clone()))
            .expect("Issuer config not found");

        // Verify we have enough approvals
        if request.approvals.len() < config.threshold as u32 {
            panic!("Not enough approvals to issue certificate");
        }

        // Mark as issued
        request.status = RequestStatus::Issued;
        env.storage()
            .instance()
            .set(&self::DataKey::PendingRequest(request_id.clone()), &request);

        // In a real implementation, you would create the actual certificate here
        // For now, we'll just return true to indicate success
        true
    }

    // Get the multisig configuration for an issuer
    pub fn get_multisig_config(env: Env, issuer: Address) -> MultisigConfig {
        env.storage()
            .instance()
            .get(&self::DataKey::MultisigConfig(issuer))
            .expect("Multisig config not found")
    }

    // Get a pending request by ID
    pub fn get_pending_request(env: Env, request_id: String) -> PendingRequest {
        env.storage()
            .instance()
            .get(&self::DataKey::PendingRequest(request_id))
            .expect("Request not found")
    }

    // Get all pending requests for an issuer
    pub fn get_pending_requests_for_issuer(
        env: Env,
        issuer: Address,
        pagination: Pagination,
    ) -> PaginatedResult {
        // In a real implementation, this would iterate through all pending requests
        // and filter by issuer. For now, we'll return an empty result.
        // This requires a more complex storage structure in practice.
        
        // Since Soroban storage doesn't allow easy iteration, we'll need to track
        // requests by issuer separately. This is a simplified version.
        PaginatedResult {
            data: Vec::new(&env),
            total: 0,
            page: pagination.page,
            limit: pagination.limit,
            has_next: false,
        }
    }

    // Get all pending requests for a signer
    pub fn get_pending_requests_for_signer(
        env: Env,
        signer: Address,
        pagination: Pagination,
    ) -> PaginatedResult {
        // Similar to above, this would require a more complex storage structure
        // to efficiently retrieve requests for a specific signer.
        PaginatedResult {
            data: Vec::new(&env),
            total: 0,
            page: pagination.page,
            limit: pagination.limit,
            has_next: false,
        }
    }

    // Cancel a pending request (only proposer can cancel)
    pub fn cancel_request(env: Env, request_id: String, requester: Address) -> bool {
        requester.require_auth();

        let mut request: PendingRequest = env.storage()
            .instance()
            .get(&self::DataKey::PendingRequest(request_id.clone()))
            .expect("Request not found");

        // Only the proposer can cancel the request
        if request.proposer != requester {
            panic!("Only the proposer can cancel this request");
        }

        // Can only cancel if still pending
        if request.status != RequestStatus::Pending {
            panic!("Can only cancel pending requests");
        }

        // Update status to cancelled (we can add a Cancelled variant to RequestStatus if needed)
        request.status = RequestStatus::Rejected; // Using Rejected as a close equivalent
        
        env.storage()
            .instance()
            .set(&self::DataKey::PendingRequest(request_id), &request);

        true
    }

    // Check if a request is expired
    pub fn is_expired(env: Env, request_id: String) -> bool {
        let request: PendingRequest = env.storage()
            .instance()
            .get(&self::DataKey::PendingRequest(request_id))
            .expect("Request not found");

        let now = env.ledger().timestamp();
        now > request.expires_at
    }
}

// Internal data keys for storage
mod self {
    use super::*;

    #[contracttype]
    #[derive(Clone)]
    pub enum DataKey {
        MultisigConfig(Address), // Issuer address -> MultisigConfig
        IssuerAdmin(Address),    // Issuer address -> Admin address
        PendingRequest(String),  // Request ID -> PendingRequest
        RequestByIssuer(Address, String), // (Issuer, Request ID) -> exists
        RequestBySigner(Address, String), // (Signer, Request ID) -> exists
    }
}