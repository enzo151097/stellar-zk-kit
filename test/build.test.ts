import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runBuild } from "../src/build";

const TOML = `
[circuit]
name="ballot"
backend="ultrahonk"
source="src/main.nr"
[public_inputs]
order=["merkle_root","vote"]
merkle_root={type="field"}
vote={type="u32"}`;

const ABI = JSON.stringify({
  abi: {
    parameters: [
      { name: "identity_secret", type: { kind: "field" }, visibility: "private" },
      { name: "merkle_root", type: { kind: "field" }, visibility: "public" },
      { name: "vote", type: { kind: "integer", sign: "unsigned", width: 32 }, visibility: "public" },
    ],
  },
});

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "zkkit-build-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("runBuild", () => {
  test("skipCompile + abi fixture -> writes 3 files and crossChecked:true", () => {
    const cfgPath = join(dir, "zkkit.toml");
    const abiPath = join(dir, "ballot.json");
    const outDir = join(dir, "generated");
    writeFileSync(cfgPath, TOML);
    writeFileSync(abiPath, ABI);

    const res = runBuild({
      configPath: cfgPath,
      outDir,
      skipCompile: true,
      abiJsonPath: abiPath,
    });

    expect(res.crossChecked).toBe(true);
    expect(res.wroteFiles).toHaveLength(3);
    const verifier = join(outDir, "verifier", "src", "lib.rs");
    const client = join(outDir, "client", "ballot.ts");
    const hook = join(outDir, "react", "useBallotProof.tsx");
    expect(existsSync(verifier)).toBe(true);
    expect(existsSync(client)).toBe(true);
    expect(existsSync(hook)).toBe(true);
    expect(readFileSync(verifier, "utf8")).toContain("BallotVerifier");
    expect(readFileSync(hook, "utf8")).toContain("useBallotProof");
  });

  test("skipCompile + no abi -> crossChecked:false and still writes files", () => {
    const cfgPath = join(dir, "zkkit.toml");
    const outDir = join(dir, "generated");
    writeFileSync(cfgPath, TOML);

    const res = runBuild({ configPath: cfgPath, outDir, skipCompile: true });

    expect(res.crossChecked).toBe(false);
    expect(res.wroteFiles).toHaveLength(3);
    expect(existsSync(join(outDir, "verifier", "src", "lib.rs"))).toBe(true);
  });

  test("crossCheck failure throws (abi mismatches config)", () => {
    const cfgPath = join(dir, "zkkit.toml");
    const abiPath = join(dir, "ballot.json");
    const outDir = join(dir, "generated");
    writeFileSync(cfgPath, TOML);
    writeFileSync(
      abiPath,
      JSON.stringify({
        abi: {
          parameters: [
            { name: "merkle_root", type: { kind: "field" }, visibility: "public" },
            { name: "vote", type: { kind: "integer", sign: "unsigned", width: 64 }, visibility: "public" },
          ],
        },
      })
    );

    expect(() =>
      runBuild({ configPath: cfgPath, outDir, skipCompile: true, abiJsonPath: abiPath })
    ).toThrow();
  });
});
