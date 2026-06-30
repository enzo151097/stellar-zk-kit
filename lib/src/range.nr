// Reusable range-check primitive for Stellar ZK Kit.
// Proves a private Field value lies within [min, max] without revealing it.
//
// Usage in a circuit:
//   use ::primitives::range;
//   range::assert_range(balance, 0, 1_000_000);

/// Assert `value` (interpreted as a u64) satisfies `min <= value <= max`.
/// Throws a constraint failure if the value falls outside the range.
pub fn assert_range(value: Field, min: u64, max: u64) {
    let v = value as u64;
    assert(v >= min);
    assert(v <= max);
}

/// Assert `value` is strictly less than `bound` (i.e. value < bound).
/// Useful for array-index bounds checks before indexing into a Merkle path.
pub fn assert_lt(value: Field, bound: u64) {
    let v = value as u64;
    assert(v < bound);
}

#[test]
fn range_inside_passes() {
    assert_range(50, 0, 100);
}

#[test]
fn range_at_bounds_passes() {
    assert_range(0, 0, 100);
    assert_range(100, 0, 100);
}

#[test]
fn range_above_fails() {
    // 101 is outside [0,100] -> the assert should fail the proof.
    assert_range(101, 0, 100);
}

#[test]
fn range_below_fails() {
    assert_range(5, 10, 100);
}
