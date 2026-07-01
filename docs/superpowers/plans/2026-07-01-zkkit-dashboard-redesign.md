# Stellar ZK Kit Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the generated proof dashboard to match the approved concept, including honest local-proof and on-chain evidence states.

**Architecture:** Keep the generated app self-contained in the existing React/Vite template. Add typed evidence data and UI state inside the generated `App.tsx`, style it through one responsive CSS template, and preserve the existing generated proof hook as the only proving boundary.

**Tech Stack:** TypeScript, React, Vite, Handlebars, Vitest, CSS, in-app browser verification.

---

### Task 1: Lock The Generated Dashboard Contract

**Files:**
- Modify: `test/build.test.ts`

- [x] Add a build test that asserts generated `App.tsx`, `styles.css`, and README contain the approved dashboard structure, on-chain evidence state, font system, and honest local-evidence wording.
- [x] Run `npm test -- test/build.test.ts` and confirm the new assertions fail because the current template lacks the structure.
- [x] Keep the assertions focused on durable semantic class names and copy rather than incidental markup.

### Task 2: Implement The Approved Dashboard Template

**Files:**
- Modify: `templates/dashboard/src/App.tsx.hbs`
- Modify: `templates/dashboard/src/styles.css`
- Modify: `templates/dashboard/index.html.hbs`
- Modify: `templates/dashboard/package.json.hbs`

- [x] Replace the inline-style prototype with a structured app shell, header, progress rail, input workspace, proof result, public-input table, and on-chain evidence section.
- [x] Add typed `OnChainEvidence` configuration with an unavailable default so generated dashboards never invent live transactions.
- [x] Add loading, validation, proof-success, copy-confirmation, and unavailable/configured on-chain states.
- [x] Use Space Grotesk, Inter, and JetBrains Mono with robust fallbacks.
- [x] Implement the approved near-white, charcoal, forest, coral, mint, and cool-gray token set without gradients or glow.
- [x] Add responsive desktop and mobile layouts with stable panel dimensions and no overflow.
- [x] Run `npm test -- test/build.test.ts` and confirm the dashboard contract passes.

### Task 3: Document Evidence Integrity

**Files:**
- Modify: `templates/README.md.hbs`
- Modify: `README.md`

- [x] Explain the distinction between mocked/local proof generation and configured on-chain evidence.
- [x] Document the typed evidence fields and the condition for enabling the Stellar Expert link.
- [x] Run `npm test -- test/build.test.ts` and confirm generated documentation assertions pass.

### Task 4: Regenerate And Verify The Demo

**Files:**
- Regenerate: `.local-demo/**`

- [x] Run root `npm test`, `npm run typecheck`, and `npm run build`.
- [x] Regenerate `.local-demo` from `examples/proof_of_funds` using its ABI.
- [x] Install and build `.local-demo/web`.
- [x] Run the local Vite server and verify the proof generation flow.
- [x] Verify desktop and mobile layouts in the in-app browser.
- [x] Capture the final desktop screenshot and compare it with `docs/superpowers/specs/2026-07-01-zkkit-dashboard-concept.png`.
- [x] Fix any visible mismatch in typography, palette, layout, controls, responsive behavior, or evidence hierarchy, then repeat build and browser verification.
