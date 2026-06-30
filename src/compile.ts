import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Thrown when a required external toolchain binary (nargo / bb) is not
 * available on this machine. Carries guidance so callers can degrade
 * gracefully instead of crashing the dev workflow.
 */
export class ToolchainMissingError extends Error {
  constructor(public readonly tool: string) {
    super(
      `Required toolchain "${tool}" was not found on PATH. ` +
        `Install it (and nargo/bb) per plans/00-SETUP.md, or run with ` +
        `--no-compile to generate from zkkit.toml without circuit verification.`
    );
    this.name = "ToolchainMissingError";
  }
}

/**
 * Detect whether a command exists on PATH. Uses `where` on Windows and `which`
 * elsewhere. Returns false on any failure (never throws).
 */
export function toolAvailable(cmd: string): boolean {
  const finder = process.platform === "win32" ? "where" : "which";
  try {
    const res = spawnSync(finder, [cmd], {
      stdio: "ignore",
      shell: false,
    });
    // `where`/`which` exit 0 when found, non-zero otherwise.
    return res.status === 0;
  } catch {
    return false;
  }
}

/**
 * Run `nargo compile` inside `circuitDir`, producing `target/<name>.json`.
 * Throws ToolchainMissingError if nargo is not installed.
 */
export function compileCircuit(circuitDir: string): { abiJsonPath: string } {
  if (!toolAvailable("nargo")) {
    throw new ToolchainMissingError("nargo");
  }
  execFileSync("nargo", ["compile"], {
    cwd: circuitDir,
    stdio: "inherit",
  });

  // Locate the produced artifact under target/.
  const targetDir = join(circuitDir, "target");
  const name = inferCircuitName(circuitDir);
  const abiJsonPath = join(targetDir, `${name}.json`);
  if (!existsSync(abiJsonPath)) {
    throw new Error(
      `nargo compile finished but expected artifact not found at ${abiJsonPath}.`
    );
  }
  return { abiJsonPath };
}

/**
 * Run `bb write_vk` to produce the verifying key for a compiled circuit.
 * Throws ToolchainMissingError if bb is not installed. Returns the VK path.
 */
export function writeVerifyingKey(
  circuitJsonPath: string,
  outDir: string
): string {
  if (!toolAvailable("bb")) {
    throw new ToolchainMissingError("bb");
  }
  execFileSync("bb", ["write_vk", "-b", circuitJsonPath, "-o", outDir], {
    stdio: "inherit",
  });
  return join(outDir, "vk");
}

/**
 * Best-effort inference of the circuit's Nargo package name from its
 * Nargo.toml. Falls back to the directory name.
 */
function inferCircuitName(circuitDir: string): string {
  const nargoToml = join(circuitDir, "Nargo.toml");
  try {
    if (existsSync(nargoToml)) {
      // Lightweight read to avoid pulling TOML parser into this isolated file.
      const text = readFileSync(nargoToml, "utf8");
      const m = text.match(/name\s*=\s*"([^"]+)"/);
      if (m) return m[1];
    }
  } catch {
    /* ignore and fall back */
  }
  return circuitDir.split(/[\\/]/).filter(Boolean).pop() ?? "circuit";
}
