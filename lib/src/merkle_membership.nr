// Reusable Merkle tree membership primitive for Stellar ZK Kit.
// Proves a private `leaf` is a member of the tree with public `root`, given a
// sibling path and the direction bits at each level.
//
// The hash function is Poseidon over the BN254 scalar field (Stellar Protocol 25
// "X-Ray" exposes `poseidon` as a Soroban host function; Noir's native `poseidon`
// intrinsic hashes identically off-chain, so on-chain verification matches).
//
// Usage:
//   use ::stellar_zk_kit_primitives::merkle_membership;
//   merkle_membership::assert_member(root, leaf, path, indices, depth);

use poseidon::poseidon::bn254::hash_2;

/// Compute a single Poseidon hash of two field elements.
fn hash_pair(left: Field, right: Field) -> Field {
    hash_2([left, right])
}

/// Assert that `leaf` is a member of the Merkle tree identified by `root`.
/// `path` is the array of sibling hashes (length = tree depth, fixed at 32).
/// `indices` is the array of direction bits: 0 means the leaf is the left child
/// at that level, 1 means it is the right child.
/// `depth` is the actual tree depth (only the first `depth` entries are used).
pub fn assert_member(
    root: Field,
    leaf: Field,
    path: [Field; 32],
    indices: [u1; 32],
    depth: u32,
) {
    let mut acc = leaf;
    for i in 0..depth {
        let sibling = path[i];
        let bit = indices[i];
        // If bit == 0: acc is left child, sibling is right.
        // If bit == 1: sibling is left child, acc is right.
        let (left, right) = if bit == 0 {
            (acc, sibling)
        } else {
            (sibling, acc)
        };
        acc = hash_pair(left, right);
    }
    assert(acc == root);
}

#[test]
fn member_passes_for_known_root() {
    // Build a 2-leaf tree: leaves a, b -> root = H(a, b).
    let a: Field = 100;
    let b: Field = 200;
    let root = hash_pair(a, b);

    // Prove membership of `a`: sibling = b, index[0] = 0 (a is left child).
    let mut path: [Field; 32] = [0; 32];
    path[0] = b;
    let indices: [u1; 32] = [0; 32];
    assert_member(root, a, path, indices, 1);
}

#[test(should_fail)]
fn non_member_fails() {
    let a: Field = 100;
    let b: Field = 200;
    let root = hash_pair(a, b);

    // Claim leaf=999 is a member with sibling=b -> computed root != real root.
    let mut path: [Field; 32] = [0; 32];
    path[0] = b;
    let indices: [u1; 32] = [0; 32];
    assert_member(root, 999, path, indices, 1);
}
