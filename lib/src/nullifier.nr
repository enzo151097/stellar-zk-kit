// Reusable nullifier primitive for Stellar ZK Kit.
// A nullifier is a deterministic, unlinkable commitment derived from a secret
// and an external identifier (e.g. an epoch or a Merkle tree root). It lets a
// prover show they belong to a set ONCE without revealing which member they are:
// the same (secret, context) always yields the same nullifier, so double-actions
// are detectable on-chain while individual actions stay anonymous.
//
// Usage:
//   use ::primitives::nullifier;
//   let n = nullifier::compute(secret, context);

use dep::std::hash::poseidon;

/// Compute a nullifier = Poseidon(secret, context).
/// `secret` is the prover's private key/identity secret.
/// `context` binds the nullifier to a specific action/epoch/root so the same
/// secret produces different nullifiers across contexts (preventing cross-action
/// correlation) while remaining stable within one context (enabling double-spend
/// detection).
pub fn compute(secret: Field, context: Field) -> Field {
    poseidon::bn254::hash_2([secret, context])
}

/// Assert the prover-derived nullifier matches the public one. This is the form
/// used inside a circuit: the nullifier is a PUBLIC input (so the chain can
/// track it) while `secret` and `context` are private.
pub fn assert_nullifier(public_nullifier: Field, secret: Field, context: Field) {
    let computed = compute(secret, context);
    assert(computed == public_nullifier);
}

#[test]
fn nullifier_is_deterministic() {
    let n1 = compute(42, 7);
    let n2 = compute(42, 7);
    assert(n1 == n2);
}

#[test]
fn nullifier_changes_with_context() {
    let n1 = compute(42, 7);
    let n2 = compute(42, 8);
    assert(n1 != n2);
}

#[test]
fn nullifier_changes_with_secret() {
    let n1 = compute(42, 7);
    let n2 = compute(43, 7);
    assert(n1 != n2);
}

#[test]
fn assert_nullifier_passes_for_correct_pair() {
    let n = compute(42, 7);
    assert_nullifier(n, 42, 7);
}
