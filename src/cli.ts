import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { parseConfig } from "./config.js";
import { genHook } from "./codegen.js";
import { runBuild, type BuildResult } from "./build.js";
import { readFileSync } from "node:fs";

const SAMPLE_TOML = `# Stellar ZK Kit config — proof-of-funds example.
# Prove you control a balance >= \`min\` without revealing the balance.
[circuit]
name = "proof_of_funds"
backend = "ultrahonk"
source = "src/main.nr"

[public_inputs]
# Declared order MUST match the circuit's public parameter order.
order = ["min"]
min = { type = "u64" }
`;

const SAMPLE_MAIN_NR = `// Proof-of-funds circuit.
// Public:  min     — the threshold the prover must meet or exceed.
// Private: balance — the secret amount being proven.
fn main(min: pub u64, balance: u64) {
    assert(balance >= min);
}
`;

const SAMPLE_NARGO_TOML = `[package]
name = "proof_of_funds"
type = "bin"
authors = [""]

[dependencies]
`;

function pascalCase(name: string): string {
  return name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function cmdInit(name: string): void {
  const root = join(process.cwd(), name);
  if (existsSync(root)) {
    console.error(`[zkkit] Refusing to overwrite existing directory: ${root}`);
    process.exitCode = 1;
    return;
  }
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "zkkit.toml"), SAMPLE_TOML, "utf8");
  writeFileSync(join(root, "src", "main.nr"), SAMPLE_MAIN_NR, "utf8");
  writeFileSync(join(root, "Nargo.toml"), SAMPLE_NARGO_TOML, "utf8");

  console.log(`[zkkit] Scaffolded new project at ./${name}/`);
  console.log("  - zkkit.toml      (proof-of-funds config)");
  console.log("  - src/main.nr     (Noir circuit stub)");
  console.log("  - Nargo.toml      (Noir package manifest)");
  console.log("");
  console.log(`Next: cd ${name} && zkkit build --no-compile`);
}

function printBuildSummary(res: BuildResult): void {
  console.log("");
  console.log("[zkkit] Build complete.");
  console.log(
    `  toolchain: nargo=${res.toolchain.nargo ? "yes" : "no"}, ` +
      `bb=${res.toolchain.bb ? "yes" : "no"}`
  );
  console.log(
    `  cross-checked against circuit ABI: ${res.crossChecked ? "yes" : "NO"}`
  );
  console.log("  generated files:");
  for (const f of res.wroteFiles) console.log(`    - ${f}`);
}

function cmdBuild(opts: {
  config: string;
  out: string;
  compile: boolean;
  abi?: string;
}): void {
  try {
    const res = runBuild({
      configPath: opts.config,
      outDir: opts.out,
      skipCompile: !opts.compile,
      abiJsonPath: opts.abi,
    });
    printBuildSummary(res);
  } catch (err) {
    console.error(`[zkkit] Build failed: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

function cmdGenReact(opts: { config: string; out: string }): void {
  try {
    const cfg = parseConfig(readFileSync(opts.config, "utf8"));
    const pascal = pascalCase(cfg.circuit.name);
    const outPath = join(opts.out, "react", `use${pascal}Proof.tsx`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, genHook(cfg), "utf8");
    console.log(`[zkkit] Wrote React hook: ${outPath}`);
  } catch (err) {
    console.error(`[zkkit] gen-react failed: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

export function buildProgram(): Command {
  const program = new Command();
  program
    .name("zkkit")
    .description("Stellar ZK Kit — typed verifier/client/hook generation")
    .version("1.0.0");

  program
    .command("init")
    .description("Scaffold a new zkkit project (proof-of-funds example)")
    .argument("<name>", "project directory name")
    .action((name: string) => cmdInit(name));

  program
    .command("build")
    .description("Cross-check circuit + generate verifier/client/hook")
    .option("-c, --config <path>", "path to zkkit.toml", "zkkit.toml")
    .option("-o, --out <dir>", "output directory", "generated")
    .option("--no-compile", "skip nargo/bb compilation (generate only)")
    .option("--abi <path>", "path to a compiled Noir ABI json for cross-check")
    .action((opts) => cmdBuild(opts));

  program
    .command("gen-react")
    .description("Re-emit only the React proving hook")
    .option("-c, --config <path>", "path to zkkit.toml", "zkkit.toml")
    .option("-o, --out <dir>", "output directory", "generated")
    .action((opts) => cmdGenReact(opts));

  return program;
}

export function main(argv: string[] = process.argv): void {
  buildProgram().parse(argv);
}

// Run only when invoked directly (works via `tsx src/cli.ts` and `node dist/cli.js`).
const isMain = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();

if (isMain) {
  main();
}
