#!/bin/bash
export PATH=/usr/bin:/home/enzo95/.nargo/bin:/home/enzo95/.bb:/home/enzo95/.local/bin:$PATH

PROOF_DIR="/mnt/d/dorahack/stellar/stellar-zk-kit/examples/allowlist/target"
VERIFIER_DIR="/mnt/d/dorahack/stellar/ultrahonk_soroban_contract"
SOURCE="zkballot-local-admin"
NETWORK="local"

echo "=== Installing verifier wasm on localnet ==="
WASM_HASH=$(stellar contract install \
  --wasm "$VERIFIER_DIR/target/wasm32v1-none/release/ultrahonk_soroban_contract.wasm" \
  --source $SOURCE \
  --network $NETWORK 2>&1 | tail -1)
echo "WASM_HASH=$WASM_HASH"

echo "=== Deploying allowlist verifier with VK on localnet ==="
CONTRACT_ID=$(stellar contract deploy \
  --wasm-hash "$WASM_HASH" \
  --source $SOURCE \
  --network $NETWORK \
  -- --vk_bytes-file-path "$PROOF_DIR/vk" 2>&1 | tail -1)
echo "CONTRACT_ID=$CONTRACT_ID"

echo "=== Verifying allowlist proof on localnet ==="
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source $SOURCE \
  --network $NETWORK \
  --send=yes \
  -- verify_proof \
     --public_inputs-file-path "$PROOF_DIR/public_inputs" \
     --proof_bytes-file-path "$PROOF_DIR/proof" 2>&1

echo "Exit code: $?"
