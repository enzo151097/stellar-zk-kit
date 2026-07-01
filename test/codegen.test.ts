import { describe, test, expect } from "vitest";
import { genVerifier, genClient, genHook } from "../src/codegen";
import type { ZkKitConfig } from "../src/config";

const cfg: ZkKitConfig = {
  circuit: { name: "ballot", backend: "ultrahonk", source: "src/main.nr" },
  publicInputs: [
    { name: "root", type: "field" },
    { name: "nullifier", type: "field" },
    { name: "vote", type: "u32" },
  ],
};

describe("genVerifier", () => {
  const rs = genVerifier(cfg);
  test("emits a typed verify() with params in canonical order and correct Soroban types", () => {
    expect(rs).toContain("pub fn verify(env: Env, proof: Bytes, root: BytesN<32>, nullifier: BytesN<32>, vote: u32)");
  });
  test("packs public inputs in the exact declared order", () => {
    // pack order must be root -> nullifier -> vote
    expect(rs.indexOf("&root")).toBeLessThan(rs.indexOf("&nullifier"));
    expect(rs.indexOf("&nullifier")).toBeLessThan(rs.indexOf("&vote"));
  });
  test("contract name is PascalCased from circuit name", () => {
    expect(rs).toContain("BallotVerifier");
  });
  test("calls the real base verifier method", () => {
    expect(rs).toContain("verify_proof_with_stored_vk");
  });
});

describe("genClient", () => {
  const ts = genClient(cfg);
  test("emits a typed inputs interface with correct TS types", () => {
    expect(ts).toContain("root: bigint");
    expect(ts).toContain("vote: number");
  });
});

describe("genHook", () => {
  test("emits a React hook named useBallotProof", () => {
    expect(genHook(cfg)).toContain("useBallotProof");
  });
});

import { genTest } from "../src/codegen";
describe("genTest", () => {
  const rs = genTest(cfg);
  test("asserts each mutation block passes mutated_<name> and valid_<other> in verify()", () => {
    // There are 3 inputs: root, nullifier, vote
    // When mutating root:
    expect(rs).toContain("&mutated_root,");
    expect(rs).toContain("&valid_nullifier,");
    expect(rs).toContain("&valid_vote");
    
    // When mutating nullifier:
    expect(rs).toContain("&valid_root,");
    expect(rs).toContain("&mutated_nullifier,");
    
    // When mutating vote:
    expect(rs).toContain("&mutated_vote");

    // Ensure mock base verifier setup is correctly generated
    expect(rs).toContain("mock_client.set_expected(&expected_blob)");
    expect(rs).toContain("assert_eq!(base_result, true");
  });
});
