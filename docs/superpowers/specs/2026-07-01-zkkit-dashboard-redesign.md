# Stellar ZK Kit Dashboard Redesign

## Approved Concept

Visual source of truth:

`docs/superpowers/specs/2026-07-01-zkkit-dashboard-concept.png`

The implementation must reproduce this concept faithfully while keeping the
generated dashboard reusable for circuits with different public inputs.

## Scope

- Redesign the generated React/Vite evidence dashboard template.
- Regenerate the local `proof_of_funds` dashboard from the updated template.
- Preserve the existing proof hook and public-input encoding behavior.
- Add an on-chain evidence presentation state without claiming live verification
  when only replayed or configured evidence is available.
- Keep the dashboard responsive for desktop and mobile.

## Visual System

- Heading font: Space Grotesk.
- UI and body font: Inter.
- Monospace evidence: JetBrains Mono.
- Page background: `#F7F8F4`.
- Main text: `#17211B`.
- Primary action: `#174A36`.
- Secondary accent: `#F06449`, used sparingly.
- Success surface: `#DDEBE2`.
- Borders: `#CBD3CD`.
- Maximum corner radius: 8px.
- No gradients, glows, glass effects, decorative blobs, or purple/blue theme.
- Use thin borders and restrained shadows only where hierarchy requires them.

## Layout

- Compact utility header with Stellar ZK Kit identity and local environment
  status.
- Circuit name and `Evidence Dashboard` title below the header.
- Three-step progress rail: Configure, Prove, Inspect.
- Asymmetric two-column workspace:
  - left: public-input form, primary proof action, circuit metadata;
  - right: proof result, proof blob, public inputs, on-chain evidence.
- On mobile, stack title, progress, form, proof result, and on-chain evidence in
  that order.
- Fixed and responsive panel dimensions must prevent layout shifts or overflow.

## Interaction And States

- Public inputs remain generated from `zkkit.toml`.
- Generate proof uses the existing generated proof hook.
- Loading, validation error, proof success, and copy confirmation are visible
  near the relevant control.
- Proof blob and identifiers have copy controls.
- The progress rail reflects the current state.
- On-chain evidence supports:
  - unavailable/not configured;
  - configured evidence;
  - verified evidence.
- Evidence fields: network, contract ID, transaction hash, ledger, confirmation
  time, and explorer URL.
- The explorer action is disabled or absent when no valid URL is configured.

## Evidence Integrity

- The default generated demo must not fabricate a live transaction.
- Mock or replayed proof generation must be labeled as local evidence.
- On-chain status must say unavailable until real evidence is supplied.
- Generated projects may provide evidence through a typed configuration object.
- The README template must explain the local-versus-on-chain distinction.

## Verification

- Template generation tests cover the new dashboard files and evidence states.
- `npm test`, `npm run typecheck`, and `npm run build` pass at project root.
- A freshly generated `proof_of_funds` dashboard installs and builds.
- Browser verification covers desktop and mobile layouts.
- Core checks: input update, proof generation, result display, copy action,
  on-chain unavailable state, and configured evidence state.
- Final screenshots are compared directly against the approved concept.

