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
    expect(res.wroteFiles.length).toBeGreaterThan(3);
    const verifier = join(outDir, "verifier", "src", "lib.rs");
    const client = join(outDir, "web", "src", "client.ts");
    const hook = join(outDir, "web", "src", "useBallotProof.tsx");
    expect(existsSync(verifier)).toBe(true);
    expect(existsSync(client)).toBe(true);
    expect(existsSync(hook)).toBe(true);
    expect(readFileSync(verifier, "utf8")).toContain("BallotVerifier");
    expect(readFileSync(hook, "utf8")).toContain("useBallotProof");
  });

  test("generates the approved evidence dashboard with honest on-chain states", () => {
    const cfgPath = join(dir, "zkkit.toml");
    const abiPath = join(dir, "ballot.json");
    const outDir = join(dir, "generated");
    writeFileSync(cfgPath, TOML);
    writeFileSync(abiPath, ABI);

    runBuild({
      configPath: cfgPath,
      outDir,
      skipCompile: true,
      abiJsonPath: abiPath,
    });

    const app = readFileSync(join(outDir, "web", "src", "App.tsx"), "utf8");
    const evidence = readFileSync(join(outDir, "web", "src", "evidence.ts"), "utf8");
    const styles = readFileSync(join(outDir, "web", "src", "styles.css"), "utf8");
    const prover = readFileSync(
      join(outDir, "web", "src", "browserProver.ts"),
      "utf8"
    );
    const dashboardPackage = JSON.parse(
      readFileSync(join(outDir, "web", "package.json"), "utf8")
    );
    const readmeTemplate = readFileSync(
      join(process.cwd(), "templates", "README.md.hbs"),
      "utf8"
    );

    expect(app).toContain("On-chain verification");
    expect(app).toContain("On-chain evidence unavailable");
    expect(app).toContain('from "./evidence"');
    expect(app).toContain("View on Stellar Expert");
    expect(evidence).toContain("interface OnChainEvidence");
    expect(evidence).toContain("ON_CHAIN_EVIDENCE: OnChainEvidence | null = null");
    expect(app).toContain('className="progress-rail"');
    expect(app).toContain('className="proof-workspace"');
    expect(app).toContain("Private witness");
    expect(app).toContain("identity_secret");
    expect(prover).toContain('from "@noir-lang/noir_js"');
    expect(prover).toContain('import("@aztec/bb.js")');
    expect(prover).toContain('import("@noir-lang/noir_js")');
    expect(prover).toContain("initializeNoirRuntime");
    expect(prover).toContain("new UltraHonkBackend");
    expect(prover).toContain("verifyProof(proofData");
    expect(existsSync(join(outDir, "web", "src", "circuit.json"))).toBe(true);
    expect(dashboardPackage.dependencies["@noir-lang/noir_js"]).toBe(
      "1.0.0-beta.9"
    );
    expect(dashboardPackage.dependencies["@aztec/bb.js"]).toBe("0.87.0");
    expect(styles).toContain('"Space Grotesk"');
    expect(styles).toContain('"JetBrains Mono"');
    expect(styles).toContain("--forest: #174a36");
    expect(styles).not.toContain("linear-gradient");
    expect(readmeTemplate).toContain("Local vs. On-chain Evidence");
    expect(readmeTemplate).toContain("must not be presented as live");
  });

  test("skipCompile + no abi -> crossChecked:false and still writes files", () => {
    const cfgPath = join(dir, "zkkit.toml");
    const outDir = join(dir, "generated");
    writeFileSync(cfgPath, TOML);

    const res = runBuild({ configPath: cfgPath, outDir, skipCompile: true });

    expect(res.crossChecked).toBe(false);
    expect(res.wroteFiles.length).toBeGreaterThan(3);
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
