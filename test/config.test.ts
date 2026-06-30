import { describe, test, expect } from "vitest";
import { parseConfig } from "../src/config";

describe("parseConfig", () => {
  test("parses public inputs preserving order + types", () => {
    const cfg = parseConfig(`
[circuit]
name="ballot"
backend="ultrahonk"
source="src/main.nr"
[public_inputs]
order=["root","nullifier","vote"]
root={type="field"}
nullifier={type="field"}
vote={type="u32"}`);
    expect(cfg.circuit.name).toBe("ballot");
    expect(cfg.circuit.backend).toBe("ultrahonk");
    expect(cfg.publicInputs.map(p => p.name)).toEqual(["root","nullifier","vote"]);
    expect(cfg.publicInputs[2].type).toBe("u32");
  });

  test("throws if an entry in order has no type definition", () => {
    expect(() => parseConfig(`
[circuit]
name="x"
backend="ultrahonk"
source="src/main.nr"
[public_inputs]
order=["a","b"]
a={type="field"}`)).toThrow();
  });

  test("throws on unknown public input type", () => {
    expect(() => parseConfig(`
[circuit]
name="x"
backend="ultrahonk"
source="src/main.nr"
[public_inputs]
order=["a"]
a={type="banana"}`)).toThrow();
  });
});
