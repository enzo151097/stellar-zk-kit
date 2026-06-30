#!/bin/bash
export PATH=/usr/bin:/home/enzo95/.nargo/bin:/home/enzo95/.bb:/home/enzo95/.local/bin:$PATH

PROOF_DIR="/mnt/d/dorahack/stellar/stellar-zk-kit/examples/proof_of_funds/target"
CONTRACT_ID="CAKL7ZRKWCGYGII4FF4EZND2XHBI6IUOR77W7AGE3VKYXHUJSEPIGQKB"

echo "=== Verifying proof on testnet (send=yes) ==="
echo "Contract: $CONTRACT_ID"

stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source deployer \
  --network testnet \
  --send=yes \
  -- verify_proof \
     --public_inputs-file-path "$PROOF_DIR/public_inputs" \
     --proof_bytes-file-path "$PROOF_DIR/proof" 2>&1

echo "Exit code: $?"
