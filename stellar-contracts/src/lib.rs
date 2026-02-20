#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, symbol_short};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Certificate {
    pub id: String,
    pub issuer: Address,
    pub owner: Address,
    pub metadata_uri: String,
    pub issued_at: u64,
    pub revoked: bool,
    pub revocation_reason: Option<String>,
    pub revoked_at: Option<u64>,
    pub revoked_by: Option<Address>,
}

/// Transfer status enum
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TransferStatus {
    Pending,      // Transfer initiated, waiting for acceptance
    Accepted,     // Transfer accepted by recipient
    Rejected,     // Transfer rejected by recipient
    Cancelled,    // Transfer cancelled by sender
    Completed,    // Transfer completed successfully
}

/// Transfer request structure
#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferRequest {
    pub id: String,           // Unique transfer ID
    pub certificate_id: String, // Certificate being transferred
    pub from_address: Address,   // Current owner
    pub to_address: Address,     // New owner
    pub initiated_at: u64,       // When transfer was initiated
    pub accepted_at: Option<u64>, // When transfer was accepted
    pub completed_at: Option<u64>, // When transfer was completed
    pub status: TransferStatus,   // Current status
    pub require_revocation: bool, // Whether to revoke on transfer
    pub transfer_fee: u64,        // Transfer fee (0 for no fee)
    pub memo: Option<String>,     // Optional memo for transfer
}

/// Transfer history entry
#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferHistory {
    pub transfer_id: String,
    pub certificate_id: String,
    pub from_address: Address,
    pub to_address: Address,
    pub transferred_at: u64,
    pub transfer_fee: u64,
    pub memo: Option<String>,
}

/// Events for certificate transfers
#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferInitiatedEvent {
    pub transfer_id: String,
    pub certificate_id: String,
    pub from_address: Address,
    pub to_address: Address,
    pub initiated_at: u64,
    pub transfer_fee: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferAcceptedEvent {
    pub transfer_id: String,
    pub accepted_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferCompletedEvent {
    pub transfer_id: String,
    pub certificate_id: String,
    pub from_address: Address,
    pub to_address: Address,
    pub completed_at: u64,
    pub transfer_fee: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferRejectedEvent {
    pub transfer_id: String,
    pub rejected_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferCancelledEvent {
    pub transfer_id: String,
    pub cancelled_at: u64,
}

/// Error types for the contract
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CertificateError {
    AlreadyExists,
    NotFound,
    Unauthorized,
    InvalidData,
    AlreadyRevoked,
    TransferNotFound,
    TransferNotPending,
    TransferNotAuthorized,
    InsufficientBalance,
    InvalidTransferStatus,
}

/// Storage keys for the contract
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Certificate(String),      // Certificate ID -> Certificate
    TransferRequest(String),  // Transfer ID -> TransferRequest
    TransferHistory(String),  // Certificate ID -> Vec<TransferHistory>
    PendingTransfers(Address), // Address -> Vec<TransferID> (transfers pending acceptance)
    TransferCount,            // Total number of transfers
}

#[contract]
pub struct CertificateContract;

#[contractimpl]
impl CertificateContract {
    
    // Issues a new certificate
    pub fn issue_certificate(
        env: Env,
        id: String,
        issuer: Address,
        owner: Address,
        metadata_uri: String,
    ) {
        // Authenticate the issuer
        issuer.require_auth();

        // Check if certificate already exists
        if env.storage().instance().has(&id) {
            panic!("Certificate already exists");
        }

        let cert = Certificate {
            id: id.clone(),
            issuer,
            owner,
            metadata_uri,
            issued_at: env.ledger().timestamp(),
            revoked: false,
            revocation_reason: None,
            revoked_at: None,
            revoked_by: None,
        };

        env.storage().instance().set(&id, &cert);
    }

    // Revokes a certificate
    pub fn revoke_certificate(env: Env, id: String, reason: String) {
        let mut cert: Certificate = env.storage().instance().get(&id).expect("Certificate not found");
        
        // Only the issuer can revoke
        cert.issuer.require_auth();

        if cert.revoked {
            panic!("Certificate already revoked");
        }

        cert.revoked = true;
        cert.revocation_reason = Some(reason);
        cert.revoked_at = Some(env.ledger().timestamp());
        cert.revoked_by = Some(cert.issuer.clone());

        env.storage().instance().set(&id, &cert);
    }

    // Checks if a certificate is revoked
    pub fn is_revoked(env: Env, id: String) -> bool {
        let cert: Certificate = env.storage().instance().get(&id).expect("Certificate not found");
        cert.revoked
    }

    // Retrieves certificate details
    pub fn get_certificate(env: Env, id: String) -> Certificate {
        env.storage().instance().get(&id).expect("Certificate not found")
    }

    // Initiates a certificate transfer
    pub fn initiate_transfer(
        env: Env,
        transfer_id: String,
        certificate_id: String,
        from_address: Address,
        to_address: Address,
        require_revocation: bool,
        transfer_fee: u64,
        memo: Option<String>,
    ) -> Result<(), CertificateError> {
        // Authenticate the current owner
        from_address.require_auth();
        
        // Check if transfer already exists
        let transfer_key = DataKey::TransferRequest(transfer_id.clone());
        if env.storage().instance().has(&transfer_key) {
            return Err(CertificateError::AlreadyExists);
        }
        
        // Get the certificate
        let mut cert: Certificate = env.storage().instance().get(&certificate_id).ok_or(CertificateError::NotFound)?;
        
        // Verify the sender is the current owner
        if cert.owner != from_address {
            return Err(CertificateError::Unauthorized);
        }
        
        // Check if certificate is revoked
        if cert.revoked {
            return Err(CertificateError::AlreadyRevoked);
        }
        
        // Check if recipient is different from sender
        if from_address == to_address {
            return Err(CertificateError::InvalidData);
        }
        
        // Create transfer request
        let transfer = TransferRequest {
            id: transfer_id.clone(),
            certificate_id: certificate_id.clone(),
            from_address: from_address.clone(),
            to_address: to_address.clone(),
            initiated_at: env.ledger().timestamp(),
            accepted_at: None,
            completed_at: None,
            status: TransferStatus::Pending,
            require_revocation,
            transfer_fee,
            memo,
        };
        
        // Store the transfer request
        env.storage().instance().set(&transfer_key, &transfer);
        
        // Add to recipient's pending transfers
        let pending_key = DataKey::PendingTransfers(to_address.clone());
        let mut pending_transfers: Vec<String> = env
            .storage()
            .instance()
            .get(&pending_key)
            .unwrap_or(Vec::new(&env));
        pending_transfers.push_back(transfer_id.clone());
        env.storage().instance().set(&pending_key, &pending_transfers);
        
        // Update transfer count
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TransferCount)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::TransferCount, &(count + 1));
        
        // Emit transfer initiated event
        env.events().publish(
            (symbol_short!("transfer_init"),),
            TransferInitiatedEvent {
                transfer_id: transfer_id.clone(),
                certificate_id,
                from_address,
                to_address,
                initiated_at: transfer.initiated_at,
                transfer_fee,
            },
        );
        
        Ok(())
    }

    // Accepts a certificate transfer
    pub fn accept_transfer(
        env: Env,
        transfer_id: String,
        recipient: Address,
    ) -> Result<(), CertificateError> {
        // Authenticate the recipient
        recipient.require_auth();
        
        // Get the transfer request
        let transfer_key = DataKey::TransferRequest(transfer_id.clone());
        let mut transfer: TransferRequest = env
            .storage()
            .instance()
            .get(&transfer_key)
            .ok_or(CertificateError::TransferNotFound)?;
        
        // Verify the recipient is the intended recipient
        if transfer.to_address != recipient {
            return Err(CertificateError::Unauthorized);
        }
        
        // Check if transfer is still pending
        if transfer.status != TransferStatus::Pending {
            return Err(CertificateError::TransferNotPending);
        }
        
        // Update transfer status
        transfer.status = TransferStatus::Accepted;
        transfer.accepted_at = Some(env.ledger().timestamp());
        env.storage().instance().set(&transfer_key, &transfer);
        
        // Remove from pending transfers
        let pending_key = DataKey::PendingTransfers(recipient.clone());
        let mut pending_transfers: Vec<String> = env
            .storage()
            .instance()
            .get(&pending_key)
            .unwrap_or(Vec::new(&env));
        
        // Remove this transfer from pending list
        let mut new_pending = Vec::new(&env);
        for pending_id in pending_transfers.iter() {
            if pending_id != &transfer_id {
                new_pending.push_back(pending_id.clone());
            }
        }
        env.storage().instance().set(&pending_key, &new_pending);
        
        // Emit transfer accepted event
        env.events().publish(
            (symbol_short!("transfer_accept"),),
            TransferAcceptedEvent {
                transfer_id: transfer_id.clone(),
                accepted_at: transfer.accepted_at.unwrap(),
            },
        );
        
        Ok(())
    }

    // Completes a certificate transfer (called after acceptance)
    pub fn complete_transfer(
        env: Env,
        transfer_id: String,
        executor: Address,
    ) -> Result<(), CertificateError> {
        // Authenticate the executor (can be sender, recipient, or admin)
        executor.require_auth();
        
        // Get the transfer request
        let transfer_key = DataKey::TransferRequest(transfer_id.clone());
        let mut transfer: TransferRequest = env
            .storage()
            .instance()
            .get(&transfer_key)
            .ok_or(CertificateError::TransferNotFound)?;
        
        // Check if transfer is accepted
        if transfer.status != TransferStatus::Accepted {
            return Err(CertificateError::InvalidTransferStatus);
        }
        
        // Get the certificate
        let mut cert: Certificate = env
            .storage()
            .instance()
            .get(&transfer.certificate_id)
            .ok_or(CertificateError::NotFound)?;
        
        // Verify authorization (sender, recipient, or issuer can complete)
        if executor != transfer.from_address 
            && executor != transfer.to_address 
            && executor != cert.issuer {
            return Err(CertificateError::Unauthorized);
        }
        
        // Revoke certificate if required
        if transfer.require_revocation {
            cert.revoked = true;
            cert.revocation_reason = Some(String::from_str(&env, "Transferred to new owner"));
            cert.revoked_at = Some(env.ledger().timestamp());
            cert.revoked_by = Some(transfer.from_address.clone());
            env.storage().instance().set(&transfer.certificate_id, &cert);
        }
        
        // Update certificate owner
        cert.owner = transfer.to_address.clone();
        env.storage().instance().set(&transfer.certificate_id, &cert);
        
        // Update transfer status to completed
        transfer.status = TransferStatus::Completed;
        transfer.completed_at = Some(env.ledger().timestamp());
        env.storage().instance().set(&transfer_key, &transfer);
        
        // Add to transfer history
        let history_key = DataKey::TransferHistory(transfer.certificate_id.clone());
        let mut history: Vec<TransferHistory> = env
            .storage()
            .instance()
            .get(&history_key)
            .unwrap_or(Vec::new(&env));
        
        let transfer_history = TransferHistory {
            transfer_id: transfer_id.clone(),
            certificate_id: transfer.certificate_id.clone(),
            from_address: transfer.from_address.clone(),
            to_address: transfer.to_address.clone(),
            transferred_at: transfer.completed_at.unwrap(),
            transfer_fee: transfer.transfer_fee,
            memo: transfer.memo.clone(),
        };
        
        history.push_back(transfer_history);
        env.storage().instance().set(&history_key, &history);
        
        // Emit transfer completed event
        env.events().publish(
            (symbol_short!("transfer_complete"),),
            TransferCompletedEvent {
                transfer_id: transfer_id.clone(),
                certificate_id: transfer.certificate_id,
                from_address: transfer.from_address,
                to_address: transfer.to_address,
                completed_at: transfer.completed_at.unwrap(),
                transfer_fee: transfer.transfer_fee,
            },
        );
        
        Ok(())
    }

    // Rejects a certificate transfer
    pub fn reject_transfer(
        env: Env,
        transfer_id: String,
        recipient: Address,
    ) -> Result<(), CertificateError> {
        // Authenticate the recipient
        recipient.require_auth();
        
        // Get the transfer request
        let transfer_key = DataKey::TransferRequest(transfer_id.clone());
        let mut transfer: TransferRequest = env
            .storage()
            .instance()
            .get(&transfer_key)
            .ok_or(CertificateError::TransferNotFound)?;
        
        // Verify the recipient is the intended recipient
        if transfer.to_address != recipient {
            return Err(CertificateError::Unauthorized);
        }
        
        // Check if transfer is still pending
        if transfer.status != TransferStatus::Pending {
            return Err(CertificateError::TransferNotPending);
        }
        
        // Update transfer status
        transfer.status = TransferStatus::Rejected;
        env.storage().instance().set(&transfer_key, &transfer);
        
        // Remove from pending transfers
        let pending_key = DataKey::PendingTransfers(recipient);
        let mut pending_transfers: Vec<String> = env
            .storage()
            .instance()
            .get(&pending_key)
            .unwrap_or(Vec::new(&env));
        
        let mut new_pending = Vec::new(&env);
        for pending_id in pending_transfers.iter() {
            if pending_id != &transfer_id {
                new_pending.push_back(pending_id.clone());
            }
        }
        env.storage().instance().set(&pending_key, &new_pending);
        
        // Emit transfer rejected event
        env.events().publish(
            (symbol_short!("transfer_reject"),),
            TransferRejectedEvent {
                transfer_id,
                rejected_at: env.ledger().timestamp(),
            },
        );
        
        Ok(())
    }

    // Cancels a certificate transfer
    pub fn cancel_transfer(
        env: Env,
        transfer_id: String,
        sender: Address,
    ) -> Result<(), CertificateError> {
        // Authenticate the sender
        sender.require_auth();
        
        // Get the transfer request
        let transfer_key = DataKey::TransferRequest(transfer_id.clone());
        let mut transfer: TransferRequest = env
            .storage()
            .instance()
            .get(&transfer_key)
            .ok_or(CertificateError::TransferNotFound)?;
        
        // Verify the sender is the one who initiated the transfer
        if transfer.from_address != sender {
            return Err(CertificateError::Unauthorized);
        }
        
        // Check if transfer is still pending
        if transfer.status != TransferStatus::Pending {
            return Err(CertificateError::TransferNotPending);
        }
        
        // Update transfer status
        transfer.status = TransferStatus::Cancelled;
        env.storage().instance().set(&transfer_key, &transfer);
        
        // Remove from pending transfers
        let pending_key = DataKey::PendingTransfers(transfer.to_address);
        let mut pending_transfers: Vec<String> = env
            .storage()
            .instance()
            .get(&pending_key)
            .unwrap_or(Vec::new(&env));
        
        let mut new_pending = Vec::new(&env);
        for pending_id in pending_transfers.iter() {
            if pending_id != &transfer_id {
                new_pending.push_back(pending_id.clone());
            }
        }
        env.storage().instance().set(&pending_key, &new_pending);
        
        // Emit transfer cancelled event
        env.events().publish(
            (symbol_short!("transfer_cancel"),),
            TransferCancelledEvent {
                transfer_id,
                cancelled_at: env.ledger().timestamp(),
            },
        );
        
        Ok(())
    }

    // Query functions
    
    // Get a transfer request by ID
    pub fn get_transfer(env: Env, transfer_id: String) -> Result<TransferRequest, CertificateError> {
        let transfer_key = DataKey::TransferRequest(transfer_id);
        env.storage()
            .instance()
            .get(&transfer_key)
            .ok_or(CertificateError::TransferNotFound)
    }

    // Get pending transfers for an address
    pub fn get_pending_transfers(env: Env, address: Address) -> Vec<String> {
        let pending_key = DataKey::PendingTransfers(address);
        env.storage()
            .instance()
            .get(&pending_key)
            .unwrap_or(Vec::new(&env))
    }

    // Get transfer history for a certificate
    pub fn get_transfer_history(env: Env, certificate_id: String) -> Vec<TransferHistory> {
        let history_key = DataKey::TransferHistory(certificate_id);
        env.storage()
            .instance()
            .get(&history_key)
            .unwrap_or(Vec::new(&env))
    }

    // Get total number of transfers
    pub fn get_transfer_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TransferCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
