# Proof-of-Funds Testnet Deployment

## Contract IDs (Stellar Testnet)

| Artifact | Value |
|---|---|
| UltraHonk Verifier Contract | `CAKL7ZRKWCGYGII4FF4EZND2XHBI6IUOR77W7AGE3VKYXHUJSEPIGQKB` |
| Deployer Account | `GB4W3UIOBSERQ45D5KU2L56WN4CZJBOKR7KXUH4QFCW2TACCZJOOBH43` |
| Verify Tx Hash | `3cf8c658129a592813c96616faa59a5f721a10bd01e40794a847ede47b326a6b` |

## Explorer Links

- Transaction: https://stellar.expert/explorer/testnet/tx/3cf8c658129a592813c96616faa59a5f721a10bd01e40794a847ede47b326a6b
- Contract: https://stellar.expert/explorer/testnet/contract/CAKL7ZRKWCGYGII4FF4EZND2XHBI6IUOR77W7AGE3VKYXHUJSEPIGQKB

## Circuit

- **Name**: proof_of_funds
- **Public input**: `min: u64 = 500` (threshold)
- **Private input**: `balance: u64 = 1000` (proven balance)
- **Statement**: "I control a balance >= 500" (without revealing the balance is 1000)

## Build flags (critical)

The bb commands MUST use `--oracle_hash keccak --output_format bytes_and_fields` to match
the UltraHonk verifier contract's expected format:

```bash
bb write_vk -b target/proof_of_funds.json -o target \
  --scheme ultra_honk --oracle_hash keccak --output_format bytes_and_fields

bb prove -b target/proof_of_funds.json -w target/proof_of_funds.gz -o target \
  --scheme ultra_honk --oracle_hash keccak --output_format bytes_and_fields
```

## Reproduce

```bash
# In WSL with nargo + bb + stellar-cli installed:
cd examples/proof_of_funds
nargo compile
nargo execute
bb write_vk -b target/proof_of_funds.json -o target --scheme ultra_honk --oracle_hash keccak --output_format bytes_and_fields
bb prove -b target/proof_of_funds.json -w target/proof_of_funds.gz -o target --scheme ultra_honk --oracle_hash keccak --output_format bytes_and_fields

# Deploy verifier with VK
stellar contract deploy \
  --wasm ../../ultrahonk_soroban_contract/target/wasm32v1-none/release/ultrahonk_soroban_contract.wasm \
  --source deployer --network testnet \
  -- --vk_bytes-file-path target/vk

# Verify proof on-chain
stellar contract invoke \
  --id <CONTRACT_ID> --source deployer --network testnet --send=yes \
  -- verify_proof --public_inputs-file-path target/public_inputs --proof_bytes-file-path target/proof
```
