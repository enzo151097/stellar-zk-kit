import { describe, test, expect } from "vitest";
import { extractPublicInputs, crossCheck } from "../src/abi";
import type { ZkKitConfig } from "../src/config";

const abiFixture = {
  abi: {
    parameters: [
      { name: "identity_secret", type: { kind: "field" }, visibility: "private" },
      { name: "merkle_root", type: { kind: "field" }, visibility: "public" },
      {
        name: "vote",
        type: { kind: "integer", sign: "unsigned", width: 32 },
        visibility: "public",
      },
    ],
  },
};

describe("extractPublicInputs", () => {
  test("returns only public params in declared order with mapped types", () => {
    expect(extractPublicInputs(abiFixture)).toEqual([
      { name: "merkle_root", type: "field" },
      { name: "vote", type: "u32" },
    ]);
  });

  test("maps integer width 64 -> u64 and boolean -> bool", () => {
    const abi = {
      abi: {
        parameters: [
          { name: "a", type: { kind: "integer", sign: "unsigned", width: 64 }, visibility: "public" },
          { name: "b", type: { kind: "boolean" }, visibility: "public" },
        ],
      },
    };
    expect(extractPublicInputs(abi)).toEqual([
      { name: "a", type: "u64" },
      { name: "b", type: "bool" },
    ]);
  });

  test("throws on unmapped kind", () => {
    const abi = {
      abi: {
        parameters: [
          { name: "weird", type: { kind: "tuple" }, visibility: "public" },
        ],
      },
    };
    expect(() => extractPublicInputs(abi)).toThrow(/weird/);
  });
});

const baseCfg: ZkKitConfig = {
  circuit: { name: "ballot", backend: "ultrahonk", source: "src/main.nr" },
  publicInputs: [
    { name: "merkle_root", type: "field" },
    { name: "vote", type: "u32" },
  ],
};

describe("crossCheck", () => {
  test("passes when names+types+order match", () => {
    expect(() =>
      crossCheck(baseCfg, [
        { name: "merkle_root", type: "field" },
        { name: "vote", type: "u32" },
      ])
    ).not.toThrow();
  });

  test("throws naming the field on type mismatch (u32 vs u64)", () => {
    expect(() =>
      crossCheck(baseCfg, [
        { name: "merkle_root", type: "field" },
        { name: "vote", type: "u64" },
      ])
    ).toThrow(/vote.*u32.*u64|vote/);
  });

  test("throws on order mismatch", () => {
    expect(() =>
      crossCheck(baseCfg, [
        { name: "vote", type: "u32" },
        { name: "merkle_root", type: "field" },
      ])
    ).toThrow();
  });

  test("throws on count mismatch", () => {
    expect(() =>
      crossCheck(baseCfg, [{ name: "merkle_root", type: "field" }])
    ).toThrow();
  });
});
