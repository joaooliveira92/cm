# Map: Adopt accountability-style Effect lint hardening

## Destination

A decision on which specific additional rules and checks from the mikearnaldi/accountability
report to adopt into this repo's custom Effect lint layer (`scripts/effect-lint.ts`) and
`tsconfig.json`'s `@effect/language-service` `diagnosticSeverity` config, ready to hand to
implementation. Includes the prerequisite architecture call on how the AST-needing rules get
built (dual-lint with ESLint vs. an in-house AST helper), since that gates which rules are even
implementable.

## Notes

- This repo lints with oxlint (`oxlint .`, Rust-based); oxlint has no custom JS/AST plugin
  support, which is why `scripts/effect-lint.ts` exists as a hand-rolled regex-matching script
  rather than an ESLint plugin. No ADR records oxlint-vs-ESLint as a weighed decision — it reads
  as an unrecorded default.
- `scripts/effect-lint.ts` (155 lines) currently has 7 regex-based rules: no-effect-ignore,
  no-effect-asvoid, no-effect-catchallcause, no-effect-serviceoption, no-disable-validation,
  no-void-expression, no-nested-layer-provide. Wired into both `check-all` and `ci` gate ids in
  `scripts/run-gates.ts`.
- This repo is `cm-clone`, an Electron desktop game (`apps/desktop`: React 19 + Vite + Electron).
  No `fetch()`, no `localStorage`, no router package anywhere in `packages/`/`apps/`. Heavy
  `@effect/sql`/`SqlClient` usage in `apps/desktop/src/main/` (schema.ts, saves.ts, ~10 others).
- `tsconfig.json` already wires the `@effect/language-service` TS plugin via `@effect/tsgo`, with
  zero `diagnosticSeverity` overrides (all defaults). Accountability sets ~35 named diagnostics
  explicitly, mostly to `"error"`.
- Each session loads the `effect-code` skill for Effect v4 conventions.
- A resolved ticket whose answer asserts a decision writes an Agent Note atomically with its
  resolution, per the `/cm-wayfinder` resolution step.

## Decisions so far

<!-- the index: one line per closed ticket, then zoom the link for the detail the ticket holds -->

## Not yet specified

## Out of scope

- **Ralph-loop autonomous-agent harness** (`ralph-auto.sh`, CI-gated auto-commit loop) — this
  repo already has a deliberate, different answer to autonomous/iterative agent work (the
  `cm-*` skill suite). Not revisited here.
- **`specs/`-as-ticket-tracker pattern** — this repo already uses `.scratch/` as its issue
  tracker (see [issue-tracker.md](../../docs/agents/issue-tracker.md)). Not revisited here.
- **`no-location-href-redirect`, `no-direct-fetch`, `no-localstorage`** — accountability rules
  tied to their web stack (TanStack Router, openapi-fetch, cookie-based auth). This repo has no
  `fetch()`, no `localStorage`, and no router dependency anywhere to bind these rules to.
