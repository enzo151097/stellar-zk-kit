#!/bin/bash
export PATH=/usr/bin:/home/enzo95/.nargo/bin:/home/enzo95/.bb:/home/enzo95/.local/bin:$PATH

PROOF_DIR="/mnt/d/dorahack/stellar/stellar-zk-kit/examples/proof_of_funds/target"
VERIFIER_DIR="/mnt/d/dorahack/stellar/ultrahonk_soroban_contract"

echo "=== Installing verifier wasm ==="
WASM_HASH=$(stellar contract install \
  --wasm "$VERIFIER_DIR/target/wasm32v1-none/release/ultrahonk_soroban_contract.wasm" \
  --source deployer \
  --network testnet 2>&1 | tail -1)
echo "WASM_HASH=$WASM_HASH"

echo "=== Deploying verifier with corrected VK ==="
CONTRACT_ID=$(stellar contract deploy \
  --wasm-hash "$WASM_HASH" \
  --source deployer \
  --network testnet \
  -- --vk_bytes-file-path "$PROOF_DIR/vk" 2>&1 | tail -1)
echo "CONTRACT_ID=$CONTRACT_ID"

echo "=== Verifying proof on testnet ==="
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source deployer \
  --network testnet \
  -- verify_proof \
     --public_inputs-file-path "$PROOF_DIR/public_inputs" \
     --proof_bytes-file-path "$PROOF_DIR/proof" 2>&1

echo "Exit code: $?"
