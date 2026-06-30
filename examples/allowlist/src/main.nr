// Allowlist circuit - Demo 2 for Stellar ZK Kit.
//
// Proves: "I am a member of the allowlist (Merkle root is public) and this
// is my one-time nullifier for this context" - without revealing which
// member I am.
//
// This circuit reuses TWO primitives from the Stellar ZK Kit library:
//   - merkle_membership::assert_member  (Poseidon Merkle tree inclusion)
//   - nullifier::compute                (deterministic double-use guard)
//
// Together they implement the privacy + anti-double-spend pattern that
// underpins zkBallot, zkAuction, and zkSybil - all from one config + one
// `zkkit build` command.
//
// Public inputs (declared in zkkit.toml):
//   merkle_root : Field  - public root of the allowlist Merkle tree
//   nullifier   : Field  - public nullifier (chain tracks this for double-use)
//
// Private inputs:
//   secret      : Field  - the member's private key / identity secret
//   path        : [Field; 32] - sibling hashes
//   indices     : [u1; 32]    - direction bits
//   context     : Field  - binds the nullifier to a specific action/epoch

use dep::stellar_zk_kit_primitives::merkle_membership;
use dep::stellar_zk_kit_primitives::nullifier;
use poseidon::poseidon::bn254::hash_2;

fn main(
    merkle_root: pub Field,
    nullifier: pub Field,
    secret: Field,
    path: [Field; 32],
    indices: [u1; 32],
    context: Field,
) {
    // 1. Derive the member's leaf from their secret.
    let leaf = hash_2([secret, 0]);

    // 2. Verify the leaf is a member of the Merkle tree.
    merkle_membership::assert_member(merkle_root, leaf, path, indices, 1);

    // 3. Verify the nullifier matches Poseidon(secret, context).
    nullifier::assert_nullifier(nullifier, secret, context);
}

#[test]
fn valid_member_proves() {
    // Build a 2-leaf tree: leaf_a, leaf_b -> root = H(leaf_a, leaf_b).
    let secret: Field = 42;
    let leaf_a = hash_2([secret, 0]);
    let leaf_b: Field = 999;
    let root = hash_2([leaf_a, leaf_b]);

    let context: Field = 1;
    let expected_nullifier = nullifier::compute(secret, context);

    let mut path: [Field; 32] = [0; 32];
    path[0] = leaf_b;
    let indices: [u1; 32] = [0; 32];

    main(root, expected_nullifier, secret, path, indices, context);
}

#[test(should_fail)]
fn non_member_fails() {
    let secret: Field = 42;
    let leaf_b: Field = 999;
    let other_leaf = hash_2([99, 0]);
    let root = hash_2([other_leaf, leaf_b]);

    let context: Field = 1;
    let expected_nullifier = nullifier::compute(secret, context);

    // secret=42 derives a different leaf than the one in the tree.
    let mut path: [Field; 32] = [0; 32];
    path[0] = leaf_b;
    let indices: [u1; 32] = [0; 32];

    main(root, expected_nullifier, secret, path, indices, context);
}

#[test(should_fail)]
fn wrong_nullifier_fails() {
    let secret: Field = 42;
    let leaf_a = hash_2([secret, 0]);
    let leaf_b: Field = 999;
    let root = hash_2([leaf_a, leaf_b]);

    // Use a nullifier from a different context.
    let wrong_nullifier = nullifier::compute(secret, 999);

    let mut path: [Field; 32] = [0; 32];
    path[0] = leaf_b;
    let indices: [u1; 32] = [0; 32];

    main(root, wrong_nullifier, secret, path, indices, 1);
}
