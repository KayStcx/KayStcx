// src/test.rs
#[cfg(test)]
mod tests {
    use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env, BytesN, String};
    use crate::{CertificateContract, CertificateContractClient};

    fn setup() -> (Env, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let treasury = Address::generate(&env);
        let native_token = env.register_stellar_asset_contract_v2(admin.clone())
            .address();
        (env, admin, treasury, native_token)
    }

    #[test]
    fn test_fee_config_set_and_read() {
        let (env, admin, treasury, native_token) = setup();
        let contract_id = env.register(CertificateContract, ());
        let client = CertificateContractClient::new(&env, &contract_id);

        client.initialize(&admin, &treasury, &native_token, &1_000_000, &true);

        let config = client.get_fee_config();
        assert!(config.enabled);
        assert_eq!(config.fee_amount, 1_000_000); // 0.1 XLM
        assert_eq!(config.treasury, Some(treasury));
    }

    #[test]
    fn test_fee_waiver() {
        let (env, admin, treasury, native_token) = setup();
        let contract_id = env.register(CertificateContract, ());
        let client = CertificateContractClient::new(&env, &contract_id);
        let issuer = Address::generate(&env);

        client.initialize(&admin, &treasury, &native_token, &1_000_000, &true);
        assert!(!client.is_fee_waived(&issuer));

        client.set_fee_waiver(&admin, &issuer, &true);
        assert!(client.is_fee_waived(&issuer));
    }

    #[test]
    fn test_issue_collects_fee() {
        let (env, admin, treasury, native_token) = setup();
        // Fund issuer with XLM, issue cert, verify treasury balance increased
        // ... (use soroban testutils token client to check balances)
    }
}