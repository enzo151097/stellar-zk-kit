import acvmWasmUrl from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noircWasmUrl from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
import circuit from "./circuit.json";
import type { CompiledCircuit, InputMap } from "@noir-lang/noir_js";

let runtimeReady: Promise<unknown> | null = null;

async function initializeNoirRuntime(): Promise<unknown> {
  runtimeReady ??= Promise.all([
    import("@noir-lang/acvm_js").then(({ default: initACVM }) =>
    initACVM(fetch(acvmWasmUrl)),
    ),
    import("@noir-lang/noirc_abi").then(({ default: initNoirC }) =>
    initNoirC(fetch(noircWasmUrl)),
    ),
  ]);
  return runtimeReady;
}

export async function proveInBrowser(
  inputs: Record<string, string | number | boolean>
): Promise<Uint8Array> {
  await initializeNoirRuntime();
  const [{ UltraHonkBackend }, { Noir }] = await Promise.all([
    import("@aztec/bb.js"),
    import("@noir-lang/noir_js"),
  ]);
  const noir = new Noir(circuit as CompiledCircuit);
  const backend = new UltraHonkBackend(circuit.bytecode, { threads: 1 });

  try {
    const { witness } = await noir.execute(inputs as InputMap);
    const proofData = await backend.generateProof(witness, { keccak: true });
    const valid = await backend.verifyProof(proofData, { keccak: true });
    if (!valid) {
      throw new Error("Browser-generated UltraHonk proof failed self-verification.");
    }
    return proofData.proof;
  } finally {
    await backend.destroy();
  }
}
