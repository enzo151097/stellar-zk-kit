# Stellar ZK Kit

> One config file → typed Soroban verifier + TypeScript client + React hook.
> No more hand-packing public inputs. No more silent order mismatches.
>
> **Verified on Stellar testnet**: proof_of_funds circuit deployed and verified on-chain.
> See [examples/proof_of_funds/DEPLOYMENT.md](examples/proof_of_funds/DEPLOYMENT.md).

Stellar ZK Kit is a CLI that takes a [Noir](https://noir-lang.org/) circuit and a
`zkkit.toml` config, cross-checks the circuit's public inputs against the config,
and generates three ready-to-deploy artifacts for [Soroban](https://soroban.stellar.org/)
on Stellar:

1. **`verifier/src/lib.rs`** — a typed Soroban contract that wraps a deployed
   UltraHonk verifier. Callers pass public inputs as natural Soroban types
   (`u64`, `BytesN<32>`, `bool`); the wrapper packs them in canonical order so
   the #1 source of verifier wiring bugs — wrong public-input order — is
   impossible by construction.
2. **`client/<circuit>.ts`** — a TypeScript SDK with `encodeForSoroban()` that
   packs a `bb` proof + ordered public inputs into the `proof_blob` format the
   on-chain verifier expects.
3. **`react/use<Circuit>Proof.tsx`** — a React hook (`{ prove, proof, loading, error }`)
   that calls a host-supplied prover and returns a `ProofBundle` ready to submit.

## Why

Stellar Protocol 25 ("X-Ray") and Protocol 26 ("Yardstick") added BN254 + Poseidon
host functions, making on-chain ZK verification nearly free. But the wiring between
an off-chain Noir circuit and an on-chain Soroban verifier is entirely manual and
spectacularly error-prone: a single swapped public input silently produces a valid
proof that verifies against the wrong statement. Stellar ZK Kit eliminates that
class of bug by making the config the single source of truth and cross-checking it
against the compiled circuit's ABI at build time.

## Quickstart

```bash
# Scaffold a new project (proof-of-funds example)
npx zkkit init my-app
cd my-app

# Generate verifier + client + hook from the config alone
# (works without nargo/bb installed — cross-check is skipped with a warning)
npx zkkit build --no-compile

# With the full toolchain installed (nargo + bb):
#   1. compiles the circuit
#   2. writes the verifying key
#   3. cross-checks public inputs against the ABI
#   4. generates the three artifacts
npx zkkit build
```

## The config file

```toml
# zkkit.toml — the single source of truth for public input names, types, and order.
[circuit]
name = "proof_of_funds"
backend = "ultrahonk"
source = "src/main.nr"

[public_inputs]
# `order` MUST match the circuit's public parameter declaration order.
order = ["min"]
min = { type = "u64" }
```

Supported public input types: `field`, `u32`, `u64`, `bool`, `bytes32`.

## The cross-check (headline feature)

When `nargo` is available (or when you pass `--abi <path>` to a pre-compiled ABI),
`zkkit build` reads the circuit's `abi.parameters` and verifies that the config's
declared public inputs match the circuit's actual public inputs — **names, types,
and order**. If they don't, the build fails with a precise error:

```
Public input type mismatch for "vote": zkkit.toml says "u32"
but the circuit ABI says "u64". Fix the type in zkkit.toml to match the circuit.
```

This catches the most common ZK integration bug — a config that drifts from the
circuit — before it reaches the chain.

## Reusable Noir primitives

`lib/` is a Noir library package with three primitives you can import
into any circuit. All 10 `nargo test` tests pass (including negative tests
with `#[test(should_fail)]`):

```rust
use dep::stellar_zk_kit_primitives::range;
use dep::stellar_zk_kit_primitives::merkle_membership;
use dep::stellar_zk_kit_primitives::nullifier;

// Range check: prove a private value is in [min, max]
range::assert_range(balance as Field, min, 1_000_000);

// Merkle membership: prove a leaf is in a tree with a given root
merkle_membership::assert_member(root, leaf, path, indices, depth);

// Nullifier: deterministic, unlinkable commitment for double-action prevention
let n = nullifier::compute(secret, context);
```

| Primitive | What it proves |
|---|---|
| `range` | A private value lies within `[min, max]` |
| `merkle_membership` | A private leaf is a member of a tree with public `root` (Poseidon over BN254) |
| `nullifier` | A deterministic, context-bound commitment for one-time actions |

## Examples

### proof-of-funds (verified on testnet)

`examples/proof_of_funds/` — prove you control a balance >= a public `min`
threshold without revealing the balance. Uses the `range` primitive.

**Status**: Deployed and verified on Stellar testnet.
- Contract: `CAKL7ZRKWCGYGII4FF4EZND2XHBI6IUOR77W7AGE3VKYXHUJSEPIGQKB`
- Tx: `3cf8c658129a592813c96616faa59a5f721a10bd01e40794a847ede47b326a6b`
- See [DEPLOYMENT.md](examples/proof_of_funds/DEPLOYMENT.md)

```bash
npx zkkit build --config examples/proof_of_funds/zkkit.toml --no-compile \
  --out examples/proof_of_funds/generated
```

### allowlist (verified on localnet)

`examples/allowlist/` — prove membership in a Poseidon Merkle tree allowlist
without revealing which member you are. Reuses TWO primitives:
`merkle_membership` + `nullifier`. This is the privacy + anti-double-spend
pattern that underpins zkBallot, zkAuction, and zkSybil.

**Status**: Deployed and verified on localnet (unlimited limits).
- Contract: `CD67KU6JUWSV7HSQCLSNEWN4FSTCQKTQDNLX7GBNY2GW4SXX7M4VS52W`
- See [DEPLOYMENT.md](examples/allowlist/DEPLOYMENT.md)

## CLI reference

| Command | Description |
|---|---|
| `zkkit init <name>` | Scaffold a new project with a proof-of-funds example |
| `zkkit build` | Compile circuit (if toolchain present) + cross-check + generate artifacts |
| `zkkit build --no-compile` | Generate from `zkkit.toml` only (no toolchain needed) |
| `zkkit build --abi <path>` | Cross-check against a pre-compiled ABI without compiling |
| `zkkit gen-react` | Re-emit only the React hook |

## Project layout

```
stellar-zk-kit/
├── src/
│   ├── cli.ts          # commander CLI (init / build / gen-react)
│   ├── config.ts       # parse + zod-validate zkkit.toml
│   ├── abi.ts          # extract Noir ABI public inputs + cross-check
│   ├── compile.ts      # nargo + bb wrappers (graceful when missing)
│   ├── build.ts        # orchestrator: parse → compile → cross-check → generate
│   └── codegen.ts      # Handlebars template rendering
├── templates/
│   ├── verifier.rs.hbs # typed Soroban verifier wrapper
│   ├── client.ts.hbs   # TypeScript client SDK
│   └── hook.tsx.hbs    # React proving hook
├── lib/src/            # reusable Noir primitives (range / merkle / nullifier)
├── examples/
│   ├── proof_of_funds/  # demo 1: range check (verified on testnet)
│   └── allowlist/       # demo 2: merkle + nullifier (verified on localnet)
└── test/               # 28 vitest tests + 15 nargo tests
```

## Toolchain

Stellar ZK Kit degrades gracefully when the Noir toolchain is absent — you can
generate artifacts from `zkkit.toml` alone (cross-check is skipped with a clear
warning). To get the full build pipeline with on-chain cross-checking, install:

- [`nargo`](https://noir-lang.org/docs/getting_started/installation/) — Noir compiler
- [`bb`](https://github.com/AztecProtocol/aztec-packages/tree/master/barretenberg) — proof system backend

See `plans/00-SETUP.md` for detailed installation instructions.

## Tests

```bash
npm test        # 28 vitest tests (no toolchain required)
npm run build   # tsc type-check

# With Noir toolchain installed:
cd lib && nargo test                    # 10 primitive tests
cd examples/proof_of_funds && nargo test  # 2 tests
cd examples/allowlist && nargo test       # 3 tests
# Total: 15 nargo tests + 28 vitest tests = 43 tests
```

## License

ISC
