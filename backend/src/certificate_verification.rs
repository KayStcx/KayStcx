use soroban_sdk::{contractimpl, Address, Env, String, Vec, symbol_short};
use crate::types::{Certificate, CertificateStatus, VerificationResult, CertificateVerifiedEvent};
use crate::certificate_issuance::{CertificateContract, DataKey};

#[contractimpl]
impl CertificateContract {
    /// Verify a certificate and record the attempt
    pub fn verify_certificate(env: Env, id: String, verifier: Address) -> VerificationResult {
        // 1. Check existence and basic status
        let cert_key = DataKey::Certificate(id.clone());
        let certificate_result = env.storage().instance().get::<DataKey, Certificate>(&cert_key);

        let mut is_valid = true;
        let mut status = CertificateStatus::Active; // Default placeholder
        let mut message = String::from_str(&env, "Valid");

        if certificate_result.is_none() {
            is_valid = false;
            message = String::from_str(&env, "Certificate not found");
             return VerificationResult {
                is_valid: false,
                status: CertificateStatus::Revoked,
                message,
                verified_at: env.ledger().timestamp(),
            };
        }

        let certificate = certificate_result.unwrap();
        status = certificate.status.clone();

        // 2. Check if revoked
        if certificate.status == CertificateStatus::Revoked {
            is_valid = false;
            message = String::from_str(&env, "Certificate is revoked");
        }

        // 3. Check expiration
        let current_ts = env.ledger().timestamp();
        if certificate.metadata.valid_until > 0 && current_ts > certificate.metadata.valid_until {
            is_valid = false;
            status = CertificateStatus::Expired;
            message = String::from_str(&env, "Certificate has expired");
        }

        // 4. Validate signature (Issuer authorization check)
        // We verify that the issuer is still an authorized issuer in the system
        if !Self::validate_issuer(env.clone(), certificate.issuer.clone()) {
            is_valid = false;
            message = String::from_str(&env, "Issuer is no longer authorized");
        }

        let result = VerificationResult {
            is_valid,
            status,
            message,
            verified_at: current_ts,
        };

        // 5. Record verification
        Self::record_verification(env.clone(), id.clone(), verifier.clone(), result.clone());

        // 6. Emit event
        env.events().publish(
            (symbol_short!("cert_ver"),),
            CertificateVerifiedEvent {
                id,
                verifier,
                result: result.clone(),
            },
        );

        result
    }

    /// Helper to record verification history
    fn record_verification(env: Env, id: String, verifier: Address, result: VerificationResult) {
        let history_key = DataKey::VerificationHistory(id.clone());
        let mut history: Vec<VerificationResult> = env
            .storage()
            .instance()
            .get(&history_key)
            .unwrap_or(Vec::new(&env));
        
        history.push_back(result);
        env.storage().instance().set(&history_key, &history);
    }

    /// Check if certificate is expired (Public helper)
    pub fn check_expiration(env: Env, valid_until: u64) -> bool {
        if valid_until == 0 {
            return false;
        }
        env.ledger().timestamp() > valid_until
    }

    /// Retrieve verification history
    pub fn get_verification_history(env: Env, id: String) -> Vec<VerificationResult> {
        let history_key = DataKey::VerificationHistory(id);
        env.storage()
            .instance()
            .get(&history_key)
            .unwrap_or(Vec::new(&env))
    }
}
