import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import type { PublicInputType, ZkKitConfig } from "./config.js";

import { existsSync } from "node:fs";

// Resolve the project-root `templates/` dir relative to this module (ESM-safe).
const __dirname = dirname(fileURLToPath(import.meta.url));
let TEMPLATES_DIR = join(__dirname, "..", "templates");
// Quick fix for Windows path formatting
TEMPLATES_DIR = TEMPLATES_DIR.replace(/^\\([A-Z]:\\)/, '$1');
if (!existsSync(TEMPLATES_DIR)) {
  TEMPLATES_DIR = join(__dirname, "..", "..", "templates");
  TEMPLATES_DIR = TEMPLATES_DIR.replace(/^\\([A-Z]:\\)/, '$1');
}

const SOROBAN_TYPES: Record<PublicInputType, string> = {
  field: "BytesN<32>",
  bytes32: "BytesN<32>",
  u32: "u32",
  u64: "u64",
  bool: "bool",
};

const TS_TYPES: Record<PublicInputType, string> = {
  field: "bigint",
  bytes32: "string",
  u32: "number",
  u64: "bigint",
  bool: "boolean",
};

function pascalCase(name: string): string {
  return name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

// Register helpers once. Soroban/TS types are returned as SafeStrings so that
// generics like `BytesN<32>` are NOT HTML-escaped by handlebars.
let helpersRegistered = false;
function registerHelpers(): void {
  if (helpersRegistered) return;
  Handlebars.registerHelper("pascal", (name: string) =>
    new Handlebars.SafeString(pascalCase(name))
  );
  Handlebars.registerHelper(
    "soroban",
    (type: PublicInputType) => new Handlebars.SafeString(SOROBAN_TYPES[type])
  );
  Handlebars.registerHelper(
    "tsType",
    (type: PublicInputType) => new Handlebars.SafeString(TS_TYPES[type])
  );
  Handlebars.registerHelper("eq", (a: any, b: any) => a === b);
  helpersRegistered = true;
}

// Compile each template once and cache the result.
const templateCache = new Map<string, Handlebars.TemplateDelegate>();
function loadTemplate(file: string): Handlebars.TemplateDelegate {
  const cached = templateCache.get(file);
  if (cached) return cached;
  registerHelpers();
  const source = readFileSync(join(TEMPLATES_DIR, file), "utf8");
  const compiled = Handlebars.compile(source, { noEscape: false });
  templateCache.set(file, compiled);
  return compiled;
}

function render(file: string, cfg: ZkKitConfig): string {
  return loadTemplate(file)(cfg);
}

/** Generate the typed Soroban (Rust) verifier wrapper contract. */
export function genVerifier(cfg: ZkKitConfig): string {
  return render("verifier.rs.hbs", cfg);
}

/** Generate the typed TypeScript client + proof_blob encoder. */
export function genClient(cfg: ZkKitConfig): string {
  return render("client.ts.hbs", cfg);
}

/** Generate the React hook for browser-side proving. */
export function genHook(cfg: ZkKitConfig): string {
  return render("hook.tsx.hbs", cfg);
}

/** Generate the Rust mutation tests. */
export function genTest(cfg: ZkKitConfig): string {
  return render("test.rs.hbs", cfg);
}

/** Generate the verifier Cargo.toml. */
export function genCargo(cfg: ZkKitConfig): string {
  return render("Cargo.toml.hbs", cfg);
}
