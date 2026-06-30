# Allowlist Demo - Testnet/Localnet Deployment

## Overview

Demo 2 for Stellar ZK Kit: an **allowlist** circuit that reuses TWO primitives
from the library (`merkle_membership` + `nullifier`) to prove:

> "I am a member of the allowlist (Merkle root is public) and this is my
> one-time nullifier for this context" — without revealing which member I am.

This is the privacy + anti-double-spend pattern that underpins zkBallot,
zkAuction, and zkSybil — all generated from one `zkkit.toml` config.

## Circuit

- **Public inputs**: `merkle_root` (Field), `nullifier` (Field)
- **Private inputs**: `secret`, `path[32]`, `indices[32]`, `context`
- **Primitives used**: `merkle_membership::assert_member` + `nullifier::assert_nullifier`

## Test Results

| Environment | Contract ID | Status |
|---|---|---|
| **Localnet** (unlimited limits) | `CD67KU6JUWSV7HSQCLSNEWN4FSTCQKTQDNLX7GBNY2GW4SXX7M4VS52W` | ✅ Verified |
| **Testnet** (default limits) | `CAC55473K7TL23X6EQD2YZVFAA5EYZXRCPE5ZI7T2TR6WAXM7CFM6RJX` | ❌ ExceededLimit |

> **Note**: The allowlist circuit uses Poseidon hashes (via `merkle_membership`
> and `nullifier` primitives), making it significantly larger than the
> proof_of_funds circuit. The UltraHonk verification exceeds testnet's default
> budget limits but succeeds on localnet with unlimited limits. This is the same
> pattern observed in the zkBallot project.

## Localnet Verification

```bash
# Start localnet with unlimited limits
stellar container start -t future --name local --limits unlimited

# Deploy + verify
bash examples/allowlist/deploy_localnet.sh
```

## nargo test

```bash
cd examples/allowlist
nargo test
# 3 tests passed (valid_member_proves, non_member_fails, wrong_nullifier_fails)
```
