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

- [01: Dual-lint architecture for AST-needing Effect rules](issues/01-dual-lint-architecture.md):
  dual-lint — oxlint stays for the general ruleset, a new ESLint `local` plugin (typescript-eslint
  parser) hosts Effect-specific AST-shape rules; `effect-lint.ts`'s regex rules port over gradually.
- [02: Rule and diagnostic adoption from the accountability report](issues/02-rule-and-diagnostic-adoption.md):
  adopt `no-silent-error-swallow`/`prefer-option-from-nullable`/`no-sql-type-parameter` into the
  ESLint plugin; reject `import-extensions`/`pipe-max-arguments`; enable 33/35 `diagnosticSeverity`
  diagnostics as `"error"` (empirically zero-to-one violations), stage `strictEffectProvide` as
  `"warning"` (20 violations), defer `strictBooleanExpressions` (145 violations).

## Not yet specified

- **`strictEffectProvide` cleanup** — audit the 20 `Effect.provide`-with-`Layer` call sites in
  `apps/desktop/src/main/match.ts` and `saves.ts` (found while resolving
  [02: Rule and diagnostic adoption](issues/02-rule-and-diagnostic-adoption.md)) to decide, site by
  site, which are legitimate entry points vs. should compose at the edge instead, before promoting
  the diagnostic from `"warning"` to `"error"`. Not sharp enough to ticket yet — needs a look at
  each call site first.
- **`strictBooleanExpressions` migration** — a dedicated effort to work through the 145 implicit
  truthiness/nullish-check violations (concentrated in `packages/game-engine/src/match/simulate.ts`
  and `tactical-modifiers.ts`) before this diagnostic can be enabled at any severity. Large enough
  that it's its own effort, not a ticket on this map.

## Out of scope

- **Ralph-loop autonomous-agent harness** (`ralph-auto.sh`, CI-gated auto-commit loop) — this
  repo already has a deliberate, different answer to autonomous/iterative agent work (the
  `cm-*` skill suite). Not revisited here.
- **`specs/`-as-ticket-tracker pattern** — this repo already uses `.scratch/` as its issue
  tracker (see [issue-tracker.md](../../docs/agents/issue-tracker.md)). Not revisited here.
- **`no-location-href-redirect`, `no-direct-fetch`, `no-localstorage`** — accountability rules
  tied to their web stack (TanStack Router, openapi-fetch, cookie-based auth). This repo has no
  `fetch()`, no `localStorage`, and no router dependency anywhere to bind these rules to.
