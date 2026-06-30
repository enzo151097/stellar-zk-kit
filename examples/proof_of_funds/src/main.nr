// Proof-of-funds circuit.
//
// Proves: "I control a balance >= `min`" without revealing the balance.
//
// Public inputs (declared in zkkit.toml, must match this signature's pub order):
//   min : u64   — the threshold the prover must meet or exceed.
//
// Private inputs:
//   balance : u64 — the secret amount being proven.
//
// The `range` primitive is imported from the reusable Stellar ZK Kit library so
// downstream circuits get the same audited bounds-check logic for free.

use ::stellar_zk_kit_primitives::range;

fn main(min: pub u64, balance: u64) {
    // The prover must hold at least `min`. We also upper-bound the balance at
    // 2^64 - 1 (the natural u64 max) via the range check, which doubles as a
    // soundness guard against overflow during witness generation.
    range::assert_range(balance as Field, min, 18_446_744_073_709_551_615);
}

#[test]
fn proves_funds_above_threshold() {
    // balance = 1000 >= min = 500 -> valid.
    main(500, 1000);
}

#[test]
fn rejects_funds_below_threshold() {
    // balance = 100 < min = 500 -> the range assert fails.
    main(500, 100);
}
