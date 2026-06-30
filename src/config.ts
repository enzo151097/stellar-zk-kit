import TOML from "@iarna/toml";
import { z } from "zod";

export type PublicInputType = "field" | "u32" | "u64" | "bool" | "bytes32";

export interface PublicInput {
  name: string;
  type: PublicInputType;
}

export interface ZkKitConfig {
  circuit: {
    name: string;
    backend: "ultrahonk" | "groth16-risc0" | "groth16-circom";
    source: string;
  };
  publicInputs: PublicInput[];
}

const publicInputTypeSchema = z.enum([
  "field",
  "u32",
  "u64",
  "bool",
  "bytes32",
]);

const circuitSchema = z.object({
  name: z.string(),
  backend: z.enum(["ultrahonk", "groth16-risc0", "groth16-circom"]),
  source: z.string(),
});

const publicInputDefSchema = z.object({
  type: publicInputTypeSchema,
});

const publicInputsSchema = z.object({
  order: z.array(z.string()),
});

const rootSchema = z.object({
  circuit: circuitSchema,
  public_inputs: z.record(z.string(), z.unknown()),
});

/**
 * Parse and validate a `zkkit.toml` config string into a `ZkKitConfig`.
 */
export function parseConfig(tomlString: string): ZkKitConfig {
  let raw: unknown;
  try {
    raw = TOML.parse(tomlString);
  } catch (err) {
    throw new Error(
      `Failed to parse zkkit.toml: ${(err as Error).message}`
    );
  }

  const parsed = rootSchema.parse(raw);

  const publicInputsTable = parsed.public_inputs;
  const orderParsed = publicInputsSchema.parse({
    order: publicInputsTable.order,
  });
  const order = orderParsed.order;

  // Keys defining individual public inputs (everything except `order`).
  const definedKeys = Object.keys(publicInputsTable).filter(
    (k) => k !== "order"
  );

  // Every name in `order` must have a matching type definition.
  for (const name of order) {
    if (!(name in publicInputsTable)) {
      throw new Error(
        `Public input "${name}" listed in order but has no type definition`
      );
    }
  }

  // Extra keys not present in `order` are rejected (strict).
  for (const key of definedKeys) {
    if (!order.includes(key)) {
      throw new Error(
        `Public input "${key}" has a type definition but is not listed in order`
      );
    }
  }

  const publicInputs: PublicInput[] = order.map((name) => {
    const def = publicInputDefSchema.safeParse(publicInputsTable[name]);
    if (!def.success) {
      throw new Error(
        `Invalid type definition for public input "${name}": ${def.error.issues
          .map((i) => i.message)
          .join(", ")}`
      );
    }
    return { name, type: def.data.type };
  });

  return {
    circuit: parsed.circuit,
    publicInputs,
  };
}
