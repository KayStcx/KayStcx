#!/bin/bash

# Soroban Contract Deployment Script
# This script deploys the StellarCert Soroban contracts to the Stellar network

set -e

# Configuration
NETWORK="${STELLAR_NETWORK:-testnet}"
ADMIN_SECRET="${SOROBAN_ADMIN_SECRET}"
RPC_URL="${SOROBAN_RPC_URL}"

if [ -z "$ADMIN_SECRET" ]; then
    echo "Error: SOROBAN_ADMIN_SECRET environment variable is required"
    exit 1
fi

if [ -z "$RPC_URL" ]; then
    if [ "$NETWORK" = "testnet" ]; then
        RPC_URL="https://soroban-testnet.stellar.org"
    else
        RPC_URL="https://soroban.stellar.org"
    fi
fi

echo "Deploying contracts to $NETWORK network..."
echo "RPC URL: $RPC_URL"

# Build the contracts
echo "Building contracts..."
cd stellar-contracts
cargo build --target wasm32-unknown-unknown --release

# Deploy certificate contract
echo "Deploying certificate contract..."
CERT_WASM_HASH=$(soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/certificate_revocation.wasm \
    --source "$ADMIN_SECRET" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$(soroban config network pass $NETWORK)" \
    | tail -1)

echo "Certificate contract deployed with WASM hash: $CERT_WASM_HASH"

# Create certificate contract instance
CERT_CONTRACT_ID=$(soroban contract deploy \
    --wasm-hash "$CERT_WASM_HASH" \
    --source "$ADMIN_SECRET" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$(soroban config network pass $NETWORK)" \
    | tail -1)

echo "Certificate contract instance created with ID: $CERT_CONTRACT_ID"

# Initialize certificate contract
echo "Initializing certificate contract..."
ADMIN_ADDRESS=$(soroban keys address "$ADMIN_SECRET")

soroban contract invoke \
    --id "$CERT_CONTRACT_ID" \
    --source "$ADMIN_SECRET" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$(soroban config network pass $NETWORK)" \
    -- \
    initialize \
    --admin "$ADMIN_ADDRESS"

echo "Certificate contract initialized successfully!"

# Deploy multisig contract (if needed)
echo "Deploying multisig contract..."
MULTISIG_WASM_HASH=$(soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/certificate_revocation.wasm \
    --source "$ADMIN_SECRET" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$(soroban config network pass $NETWORK)" \
    | tail -1)

MULTISIG_CONTRACT_ID=$(soroban contract deploy \
    --wasm-hash "$MULTISIG_WASM_HASH" \
    --source "$ADMIN_SECRET" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$(soroban config network pass $NETWORK)" \
    | tail -1)

echo "Multisig contract deployed with ID: $MULTISIG_CONTRACT_ID"

# Deploy CRL contract (if needed)
echo "Deploying CRL contract..."
CRL_WASM_HASH=$(soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/certificate_revocation.wasm \
    --source "$ADMIN_SECRET" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$(soroban config network pass $NETWORK)" \
    | tail -1)

CRL_CONTRACT_ID=$(soroban contract deploy \
    --wasm-hash "$CRL_WASM_HASH" \
    --source "$ADMIN_SECRET" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$(soroban config network pass $NETWORK)" \
    | tail -1)

echo "CRL contract deployed with ID: $CRL_CONTRACT_ID"

# Output configuration
echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Add these to your .env file:"
echo "SOROBAN_RPC_URL=$RPC_URL"
echo "CERTIFICATE_CONTRACT_ID=$CERT_CONTRACT_ID"
echo "MULTISIG_CONTRACT_ID=$MULTISIG_CONTRACT_ID"
echo "CRL_CONTRACT_ID=$CRL_CONTRACT_ID"
echo "SOROBAN_ADMIN_SECRET=$ADMIN_SECRET"
echo "ENABLE_SOROBAN_INTEGRATION=true"
echo ""
echo "Admin address: $ADMIN_ADDRESS"