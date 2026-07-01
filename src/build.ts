import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseConfig, type ZkKitConfig } from "./config.js";
import { genVerifier, genClient, genHook, genTest, genCargo } from "./codegen.js";
import { extractPrivateInputs, extractPublicInputs, crossCheck } from "./abi.js";
import type { PublicInput } from "./config.js";
import {
  compileCircuit,
  writeVerifyingKey,
  toolAvailable,
  ToolchainMissingError,
} from "./compile.js";

export interface BuildOptions {
  configPath: string;
  outDir?: string;
  skipCompile?: boolean;
  abiJsonPath?: string;
}

export interface BuildResult {
  wroteFiles: string[];
  crossChecked: boolean;
  toolchain: { nargo: boolean; bb: boolean };
}

function pascalCase(name: string): string {
  return name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

import { readdirSync, statSync, existsSync } from "node:fs";
import Handlebars from "handlebars";

function copyDashboardTemplate(
  cfg: ZkKitConfig,
  privateInputs: PublicInput[],
  outDir: string,
  wroteFiles: string[]
) {
  let templatesDir = join(dirname(new URL(import.meta.url).pathname), "..", "templates", "dashboard");
  let safeTemplatesDir = templatesDir.replace(/^\\([A-Z]:\\)/, '$1');
  if (!existsSync(safeTemplatesDir)) {
    templatesDir = join(dirname(new URL(import.meta.url).pathname), "..", "..", "templates", "dashboard");
    safeTemplatesDir = templatesDir.replace(/^\\([A-Z]:\\)/, '$1');
  }
  const webDir = join(outDir, "web");
  
  function copyRecursive(src: string, dest: string) {
    if (!statSync(src).isDirectory()) {
      let content = readFileSync(src, "utf8");
      let outPath = dest;
      if (src.endsWith(".hbs")) {
        content = Handlebars.compile(content)({ ...cfg, privateInputs });
        outPath = dest.slice(0, -4);
      }
      wroteFiles.push(writeFile(outPath, content));
      return;
    }
    mkdirSync(dest, { recursive: true });
    for (const file of readdirSync(src)) {
      copyRecursive(join(src, file), join(dest, file));
    }
  }

  try {
    copyRecursive(safeTemplatesDir, webDir);
  } catch (e) {
    console.warn("[zkkit] WARNING: Could not copy dashboard template: " + (e as Error).message);
  }
}

function writeFile(path: string, contents: string): string {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, "utf8");
  return path;
}

/**
 * Orchestrate a build: parse zkkit.toml, optionally compile the circuit and
 * cross-check its public inputs against the config, then generate + write the
 * verifier / client / React hook. Degrades gracefully when the toolchain is
 * absent so devs stay productive.
 */
export function runBuild(opts: BuildOptions): BuildResult {
  const outDir = opts.outDir ?? "generated";
  const tomlString = readFileSync(opts.configPath, "utf8");
  const cfg: ZkKitConfig = parseConfig(tomlString);

  const nargo = toolAvailable("nargo");
  const bb = toolAvailable("bb");

  let crossChecked = false;
  let abiJsonPath = opts.abiJsonPath;
  let privateInputs: PublicInput[] = [];

  if (!opts.skipCompile) {
    if (nargo) {
      // Compile the circuit relative to the config's directory + source dir.
      const circuitDir = resolveCircuitDir(opts.configPath, cfg);
      try {
        const compiled = compileCircuit(circuitDir);
        abiJsonPath = compiled.abiJsonPath;
        if (bb) {
          try {
            writeVerifyingKey(compiled.abiJsonPath, join(outDir, "vk"));
          } catch (err) {
            if (!(err instanceof ToolchainMissingError)) throw err;
          }
        }
      } catch (err) {
        if (!(err instanceof ToolchainMissingError)) throw err;
      }
    } else {
      warnMissingToolchain();
    }
  }

  // Cross-check whenever we have an ABI (either compiled or supplied).
  if (abiJsonPath) {
    const abiJson = JSON.parse(readFileSync(abiJsonPath, "utf8"));
    const abiPublicInputs = extractPublicInputs(abiJson);
    privateInputs = extractPrivateInputs(abiJson);
    crossCheck(cfg, abiPublicInputs);
    crossChecked = true;
  } else if (opts.skipCompile || !nargo) {
    if (!opts.abiJsonPath) warnNoCrossCheck();
  }

  // Generate + write the three artifacts.
  const pascal = pascalCase(cfg.circuit.name);
  const wroteFiles: string[] = [];
  wroteFiles.push(
    writeFile(join(outDir, "verifier", "src", "lib.rs"), genVerifier(cfg))
  );
  wroteFiles.push(
    writeFile(join(outDir, "verifier", "src", "test.rs"), genTest(cfg))
  );
  wroteFiles.push(
    writeFile(join(outDir, "verifier", "Cargo.toml"), genCargo(cfg))
  );
  wroteFiles.push(
    writeFile(join(outDir, "web", "src", "client.ts"), genClient(cfg))
  );
  wroteFiles.push(
    writeFile(join(outDir, "web", "src", `use${pascal}Proof.tsx`), genHook(cfg))
  );
  if (abiJsonPath) {
    wroteFiles.push(
      writeFile(
        join(outDir, "web", "src", "circuit.json"),
        readFileSync(abiJsonPath, "utf8")
      )
    );
  }

  copyDashboardTemplate(cfg, privateInputs, outDir, wroteFiles);

  return { wroteFiles, crossChecked, toolchain: { nargo, bb } };
}

/** Resolve the directory containing the circuit to compile. */
function resolveCircuitDir(configPath: string, cfg: ZkKitConfig): string {
  const baseDir = dirname(configPath);
  // `source` is like "src/main.nr"; the circuit dir is its parent's parent.
  const sourceDir = dirname(cfg.circuit.source); // e.g. "src"
  // Circuit root is one level above the source dir.
  return sourceDir === "." || sourceDir === ""
    ? baseDir
    : join(baseDir, dirname(sourceDir) === "." ? "." : dirname(sourceDir));
}

function warnMissingToolchain(): void {
  console.warn(
    "[zkkit] WARNING: nargo not found on PATH; skipping circuit compilation."
  );
}

function warnNoCrossCheck(): void {
  console.warn(
    "[zkkit] WARNING: generation proceeded WITHOUT circuit verification " +
      "(no ABI available). Public input mismatches will NOT be caught. " +
      "Install the toolchain per plans/00-SETUP.md, or pass --abi <path> to " +
      "cross-check against a compiled circuit."
  );
}
