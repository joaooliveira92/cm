# Agent Note: Dual-lint — oxlint stays, ESLint hosts Effect-specific AST rules

Status: proposed

## Problem

`scripts/effect-lint.ts` implements 7 Effect-specific lint rules as regex matches over raw source
lines (no-effect-ignore, no-effect-asvoid, no-effect-catchallcause, no-effect-serviceoption,
no-disable-validation, no-void-expression, no-nested-layer-provide), because this repo's general
linter, oxlint, is Rust-based and has no support for custom JS/AST plugin rules. Regex-over-lines
works for simple single-token bans but breaks down for rules that need to inspect expression
*shape*: whether a `catchTag`/`catchAll`/`catchTags` handler body is exactly `() => Effect.void`
(silently swallowing an error), or whether a ternary is structurally `x !== null ? Option.some(x)
: Option.none()`. Both patterns span multiple lines and nest inside other expressions, which a
per-line regex cannot reliably match without false positives (matching inside comments/strings) or
false negatives (missing multi-line forms). Adding these rules requires either building AST-aware
matching from scratch, or reusing an AST-aware linter that already exists for this purpose.

## Proposal

Run ESLint alongside oxlint, scoped narrowly: ESLint's only job is to host a `local` plugin of
Effect-specific AST rules (mirroring `mikearnaldi/accountability`'s `eslint.config.mjs` `local`
plugin), using `typescript-eslint`'s parser for TypeScript AST access. oxlint continues to run
unchanged as the fast, general-purpose linter for everything it already covers (correctness,
unicorn, typescript-eslint-equivalent rules it natively supports). Both run in `check:all`/`ci`
(`scripts/run-gates.ts`) as separate gate steps. The existing regex-based rules in
`scripts/effect-lint.ts` are ported into the new ESLint plugin over time as they're touched, rather
than migrated all at once; `effect-lint.ts` is not deleted until every rule it hosts has an ESLint
equivalent.

## Alternatives considered

- **In-house AST helper inside `effect-lint.ts`** (TypeScript compiler API via `@effect/tsgo`, or
  `oxc-parser`) — rejected. This means building and maintaining bespoke AST-matching logic from
  scratch for a handful of rules, with no existing test coverage or community usage to lean on.
  The user's explicit concern: this is real effort with real risk of landing in a costly failure,
  for a problem (AST-based lint rules) that `typescript-eslint` already solves robustly.
- **Regex-only, drop non-tractable rules** — rejected. Would mean permanently forgoing
  `no-silent-error-swallow` and `prefer-option-from-nullable` (and any future rule needing shape
  matching), which are exactly the rules most likely to catch real Effect anti-patterns that a
  single-line regex can't see.
- **Replace oxlint entirely with ESLint** — rejected. oxlint's speed is a real, already-realized
  asset for the bulk of the ruleset (general correctness/style rules); the problem being solved is
  narrow (a handful of AST-shape rules), so replacing the whole toolchain over-corrects. Dual-lint
  pays a smaller, scoped cost only where it's actually earned.

## Acceptance criteria

- ESLint (flat config) is added as a new dependency, configured to lint only the files needed for
  the Effect-specific `local` plugin (or the same scope as oxlint, whichever proves simpler to
  wire), and is added as its own step in `scripts/run-gates.ts`'s `check-all` and `ci` gate lists.
- oxlint's existing config and rule set are untouched.
- At least one AST-shape rule (`no-silent-error-swallow` or `prefer-option-from-nullable`) is
  implemented under the new ESLint plugin, proving the seam works end-to-end.
- `scripts/effect-lint.ts`'s existing 7 rules remain the source of truth until individually ported;
  no rule is dropped or duplicated with divergent behavior between the two linters.

## Risks

- **Dual-linter CI cost**: two lint invocations instead of one adds wall-clock time to
  `check:all`/`ci`, partially offsetting the reason oxlint was adopted. Mitigated by ESLint only
  running the narrow Effect-plugin ruleset, not oxlint's full general-purpose set.
- **Config/rule drift**: two lint configs can silently diverge or double-flag the same pattern if
  an oxlint rule and a new ESLint rule end up overlapping. Needs a periodic check that the two
  rule sets don't conflict as both evolve.
- **Partial migration limbo**: keeping `effect-lint.ts`'s regex rules alive alongside a growing
  ESLint plugin risks the repo ending up with three lint surfaces (oxlint, ESLint, `effect-lint.ts`)
  indefinitely if the port-over-time never finishes. Worth revisiting once most AST-shape rules
  have landed in ESLint, to decide whether `effect-lint.ts` can be retired.
