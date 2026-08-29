# 01: Dual-lint architecture for AST-needing Effect rules

## Question

Some candidate rules from the accountability report can't be safely expressed as regex over raw
lines the way `scripts/effect-lint.ts`'s current 7 rules are: `no-silent-error-swallow` needs to
inspect the body shape of a `catchTag`/`catchAll`/`catchTags` handler (is it exactly
`() => Effect.void`?), and `prefer-option-from-nullable` needs to match a ternary's three
sub-expressions structurally. Regex over lines will false-positive/false-negative on multi-line
expressions, string/comment content, and nested calls.

Decide how this repo builds AST-needing Effect lint rules going forward:

1. **Dual-lint**: add ESLint + `typescript-eslint` alongside oxlint, scoped to hosting only the
   custom Effect-specific plugin (a `local` plugin like accountability's), while oxlint keeps
   running the general-purpose ruleset it already covers. Both wired into `check:all`/`ci`.
2. **In-house AST helper**: write a small AST-matching layer inside `effect-lint.ts` itself (e.g.
   using the TypeScript compiler API already present via `@effect/tsgo`, or `oxc-parser`) instead
   of introducing a second linter.
3. **Regex-only, drop what doesn't fit**: keep `effect-lint.ts` purely regex-based and skip any
   candidate rule that can't be expressed safely that way.

Considerations to weigh: dual-linter CI wall-clock cost vs. oxlint's speed advantage (the reason
oxlint was adopted in the first place), config/maintenance duplication between two lint configs,
risk of overlapping/conflicting rules between oxlint and ESLint, and the token-cost risk of
building bespoke AST-matching logic from scratch versus using proven `typescript-eslint`
infrastructure. The user's stated concern: building custom AST tooling is real effort with real
risk of a costly failure, versus reusing infrastructure known to work.

This decision gates [Rule and diagnostic adoption](02-rule-and-diagnostic-adoption.md): which
rules are worth adopting depends on what's actually buildable under the chosen architecture.

Type: grilling
Blocked by: none (can start immediately)
Status: resolved

## Answer

**Dual-lint.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-28-dual-lint-architecture.md).
