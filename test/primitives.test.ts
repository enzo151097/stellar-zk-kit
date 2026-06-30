import { describe, test, expect } from "vitest";
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { runBuild } from "../src/build";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Noir primitives library", () => {
  test("lib/Nargo.toml declares a library package", () => {
    const toml = read("lib/Nargo.toml");
    expect(toml).toContain('name = "stellar_zk_kit_primitives"');
    expect(toml).toContain('type = "lib"');
  });

  test("lib/src/lib.nr re-exports the three primitives as pub mod", () => {
    const lib = read("lib/src/lib.nr");
    expect(lib).toContain("pub mod range");
    expect(lib).toContain("pub mod merkle_membership");
    expect(lib).toContain("pub mod nullifier");
  });

  test("range.nr exposes assert_range + assert_lt with tests", () => {
    const nr = read("lib/src/range.nr");
    expect(nr).toContain("pub fn assert_range(value: Field, min: u64, max: u64)");
    expect(nr).toContain("pub fn assert_lt(value: Field, bound: u64)");
    expect(nr).toContain("#[test]");
    expect(nr).toContain("range_inside_passes");
    expect(nr).toContain("range_above_fails");
  });

  test("merkle_membership.nr exposes assert_member with Poseidon + tests", () => {
    const nr = read("lib/src/merkle_membership.nr");
    expect(nr).toContain("use dep::std::hash::poseidon");
    expect(nr).toContain("pub fn assert_member(");
    expect(nr).toContain("poseidon::bn254::hash_2");
    expect(nr).toContain("#[test]");
    expect(nr).toContain("member_passes_for_known_root");
    expect(nr).toContain("non_member_fails");
  });

  test("nullifier.nr exposes compute + assert_nullifier with tests", () => {
    const nr = read("lib/src/nullifier.nr");
    expect(nr).toContain("use dep::std::hash::poseidon");
    expect(nr).toContain("pub fn compute(secret: Field, context: Field)");
    expect(nr).toContain("pub fn assert_nullifier(");
    expect(nr).toContain("nullifier_is_deterministic");
    expect(nr).toContain("nullifier_changes_with_context");
  });
});

describe("proof_of_funds example", () => {
  const ex = "examples/proof_of_funds";

  test("Nargo.toml depends on the primitives library via relative path", () => {
    const toml = read(`${ex}/Nargo.toml`);
    expect(toml).toContain('name = "proof_of_funds"');
    expect(toml).toContain('type = "bin"');
    expect(toml).toContain('path = "../../lib"');
  });

  test("zkkit.toml declares min as the sole public u64 input", () => {
    const toml = read(`${ex}/zkkit.toml`);
    expect(toml).toContain('name = "proof_of_funds"');
    expect(toml).toContain('order = ["min"]');
    expect(toml).toContain('min = { type = "u64" }');
  });

  test("main.nr has matching signature (min: pub u64, balance: u64) and uses range primitive", () => {
    const nr = read(`${ex}/src/main.nr`);
    expect(nr).toContain("fn main(min: pub u64, balance: u64)");
    expect(nr).toContain("use ::stellar_zk_kit_primitives::range");
    expect(nr).toContain("range::assert_range");
    expect(nr).toContain("#[test]");
  });

  test("example builds end-to-end via runBuild (skipCompile, no abi) producing 3 files", () => {
    // This is an integration check that the example's zkkit.toml is parseable
    // by the real build pipeline and produces the expected artifacts.
    const tmp = mkdtempSync(join(tmpdir(), "zkkit-ex-"));
    try {
      const res = runBuild({
        configPath: join(root, ex, "zkkit.toml"),
        outDir: join(tmp, "generated"),
        skipCompile: true,
      });
      expect(res.wroteFiles).toHaveLength(3);
      expect(existsSync(join(tmp, "generated", "verifier", "src", "lib.rs"))).toBe(true);
      expect(existsSync(join(tmp, "generated", "client", "proof_of_funds.ts"))).toBe(true);
      expect(existsSync(join(tmp, "generated", "react", "useProofOfFundsProof.tsx"))).toBe(true);
      // The generated verifier should reference ProofOfFundsVerifier.
      const rust = readFileSync(join(tmp, "generated", "verifier", "src", "lib.rs"), "utf8");
      expect(rust).toContain("ProofOfFundsVerifier");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
