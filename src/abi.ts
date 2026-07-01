import type { PublicInput, PublicInputType, ZkKitConfig } from "./config.js";

/**
 * Shape of a single parameter inside a Noir-compiled `target/<name>.json` ABI.
 * We only rely on the fields we need and treat the rest as unknown.
 */
interface NoirType {
  kind?: string;
  width?: number;
  length?: number;
  type?: NoirType;
  [k: string]: unknown;
}

interface NoirParameter {
  name: string;
  type: NoirType;
  visibility: string;
}

/**
 * Map a Noir ABI type to our PublicInputType. Throws on unmapped kinds so the
 * dev gets a clear, early failure rather than silently-wrong wiring.
 */
function mapNoirType(name: string, t: NoirType): PublicInputType {
  const kind = t?.kind;
  switch (kind) {
    case "field":
      return "field";
    case "boolean":
      return "bool";
    case "integer": {
      if (t.width === 32) return "u32";
      if (t.width === 64) return "u64";
      throw new Error(
        `Unsupported integer width for public input "${name}": ` +
          `width=${t.width} (only u32/u64 are supported)`
      );
    }
    case "array": {
      // 32-byte arrays (e.g. [u8; 32]) are treated as bytes32 field elements.
      if (t.length === 32) return "bytes32";
      throw new Error(
        `Unsupported array length for public input "${name}": ` +
          `length=${t.length} (only length 32 is supported)`
      );
    }
    default:
      throw new Error(
        `Unmapped Noir ABI type kind "${String(kind)}" for public input ` +
          `"${name}". Supported kinds: field, integer(u32/u64), boolean, ` +
          `array(length 32).`
      );
  }
}

function extractInputsByVisibility(
  abiJson: unknown,
  visibility: "public" | "private"
): PublicInput[] {
  const root = abiJson as { abi?: { parameters?: unknown } } | undefined;
  const parameters = root?.abi?.parameters;
  if (!Array.isArray(parameters)) {
    throw new Error(
      "Invalid Noir ABI JSON: missing `abi.parameters` array. " +
        "Did `nargo compile` produce a valid target/<name>.json?"
    );
  }

  const result: PublicInput[] = [];
  for (const raw of parameters as NoirParameter[]) {
    if (!raw || typeof raw.name !== "string" || !raw.type) {
      throw new Error("Invalid Noir ABI parameter entry encountered.");
    }
    if (raw.visibility !== visibility) continue;
    result.push({ name: raw.name, type: mapNoirType(raw.name, raw.type) });
  }
  return result;
}

/**
 * Extract ONLY the public parameters from a Noir-compiled ABI JSON, preserving
 * the declared order and mapping Noir types to our PublicInputType.
 */
export function extractPublicInputs(abiJson: unknown): PublicInput[] {
  return extractInputsByVisibility(abiJson, "public");
}

/** Extract private witness parameters for the generated browser prover form. */
export function extractPrivateInputs(abiJson: unknown): PublicInput[] {
  return extractInputsByVisibility(abiJson, "private");
}

/**
 * Cross-check the config's declared public inputs against the circuit's actual
 * public inputs (names + types + order). This is the headline safety feature:
 * it catches the "public input mismatch" bug class at build time.
 */
export function crossCheck(
  cfg: ZkKitConfig,
  abiPublicInputs: PublicInput[]
): void {
  const expected = cfg.publicInputs;
  const actual = abiPublicInputs;

  if (expected.length !== actual.length) {
    throw new Error(
      `Public input count mismatch: zkkit.toml declares ${expected.length} ` +
        `public input(s) [${expected.map((p) => p.name).join(", ")}] but the ` +
        `circuit ABI has ${actual.length} [${actual
          .map((p) => p.name)
          .join(", ")}]. Update zkkit.toml to match the circuit.`
    );
  }

  for (let i = 0; i < expected.length; i++) {
    const exp = expected[i];
    const act = actual[i];
    if (exp.name !== act.name) {
      throw new Error(
        `Public input order/name mismatch at position ${i}: zkkit.toml expects ` +
          `"${exp.name}" but the circuit ABI has "${act.name}". The order in ` +
          `zkkit.toml must match the circuit's declared parameter order.`
      );
    }
    if (exp.type !== act.type) {
      throw new Error(
        `Public input type mismatch for "${exp.name}": zkkit.toml says ` +
          `"${exp.type}" but the circuit ABI says "${act.type}". ` +
          `Fix the type in zkkit.toml to match the circuit.`
      );
    }
  }
}
