# Soroban Smart Contract Integration

This document describes the Soroban smart contract integration for StellarCert, which enables on-chain certificate issuance, verification, and revocation.

## Overview

The StellarCert application now integrates with Soroban smart contracts deployed on the Stellar network. This provides:

- **On-chain Certificate Issuance**: Certificates are recorded immutably on the Stellar blockchain
- **Decentralized Verification**: Anyone can verify certificate authenticity without relying on the issuer
- **Multi-signature Support**: Enhanced security through multi-signature certificate operations
- **Certificate Revocation Lists**: On-chain tracking of revoked certificates

## Architecture

### Smart Contracts

1. **CertificateContract**: Main contract for certificate operations
   - Issue certificates
   - Revoke certificates
   - Query certificate status
   - Manage authorized issuers

2. **MultisigCertificateContract**: Multi-signature certificate operations
   - Multi-signature certificate issuance
   - Approval workflows for certificate operations

3. **CRLContract**: Certificate Revocation List management
   - Track revoked certificates
   - Merkle root-based verification

### Backend Integration

The backend automatically integrates with Soroban contracts when:
- `ENABLE_SOROBAN_INTEGRATION=true` is set in environment variables
- Contract IDs are properly configured
- Soroban RPC and admin credentials are available

## Setup Instructions

### 1. Prerequisites

- Soroban CLI installed (`cargo install soroban-cli`)
- Stellar account with XLM for contract deployment
- Access to Soroban RPC endpoint

### 2. Deploy Contracts

Run the deployment script:

```bash
# Set environment variables
export STELLAR_NETWORK=testnet  # or mainnet
export SOROBAN_ADMIN_SECRET="your_admin_secret_key"
export SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"

# Make script executable and run
chmod +x deploy-contracts.sh
./deploy-contracts.sh
```

The script will output the contract IDs that need to be added to your `.env` file.

### 3. Environment Configuration

Add the following to your `.env` file:

```env
# Soroban Configuration
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_ADMIN_SECRET=your_admin_secret_key
CERTIFICATE_CONTRACT_ID=contract_id_here
MULTISIG_CONTRACT_ID=contract_id_here
CRL_CONTRACT_ID=contract_id_here
ENABLE_SOROBAN_INTEGRATION=true
```

### 4. Initialize Contracts

After deployment, initialize the contracts using the admin API:

```bash
# Initialize certificate contract
curl -X POST http://localhost:3000/soroban/initialize-contract \
  -H "Authorization: Bearer your_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"adminAddress": "your_admin_stellar_address"}'

# Add authorized issuers
curl -X POST http://localhost:3000/soroban/add-issuer \
  -H "Authorization: Bearer your_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"issuerAddress": "issuer_stellar_address"}'
```

## API Endpoints

### Contract Management (Admin Only)

- `POST /soroban/initialize-contract` - Initialize certificate contract
- `POST /soroban/add-issuer` - Add authorized issuer
- `POST /soroban/init-multisig` - Initialize multisig configuration
- `GET /soroban/certificate/:id` - Get certificate from contract
- `GET /soroban/status` - Check service status

## Certificate Operations

### Automatic Integration

When Soroban integration is enabled, certificate operations automatically:

1. **Issuance**: Creates on-chain record when certificate is issued
2. **Revocation**: Records revocation on-chain
3. **Verification**: Can verify against both database and on-chain records

### Fallback Behavior

If on-chain operations fail, the system continues with database operations to ensure reliability.

## Multi-signature Support

For enhanced security, issuers can use multi-signature configurations:

```bash
curl -X POST http://localhost:3000/soroban/init-multisig \
  -H "Authorization: Bearer your_admin_token" \
  -H "Content-Type: application/json" \
  -d '{
    "issuerAddress": "issuer_address",
    "threshold": 2,
    "signers": ["signer1_address", "signer2_address", "signer3_address"],
    "maxSigners": 5
  }'
```

## Monitoring and Troubleshooting

### Check Service Status

```bash
curl http://localhost:3000/soroban/status
```

### View Contract Events

Monitor contract events through Stellar Horizon or Soroban RPC.

### Common Issues

1. **Contract Not Initialized**: Run the initialization endpoint
2. **Issuer Not Authorized**: Add issuer using the admin API
3. **Transaction Failures**: Check account balance and network connectivity

## Development

### Contract Development

```bash
cd stellar-contracts
cargo test  # Run contract tests
cargo build --target wasm32-unknown-unknown --release  # Build for deployment
```

### Backend Testing

```bash
# Test Soroban integration
npm run test:e2e -- --grep "soroban"
```

## Security Considerations

- Contract admin keys should be stored securely
- Multi-signature should be used for production deployments
- Regular backup of contract state is recommended
- Monitor contract events for audit trails

## Future Enhancements

- Certificate transfer functionality
- Batch operations for efficiency
- Integration with Stellar Asset Contracts
- Enhanced verification mechanisms