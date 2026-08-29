# 02: Rule and diagnostic adoption from the accountability report

## Question

Given the dual-lint architecture decided in [Dual-lint architecture](01-dual-lint-architecture.md)
(oxlint stays for general rules; a new ESLint `local` plugin hosts Effect-specific AST rules
alongside the existing regex-based `scripts/effect-lint.ts`), decide, rule by rule and diagnostic
by diagnostic:

**Candidate ESLint-plugin rules** (from `mikearnaldi/accountability`'s `eslint.config.mjs`), not
yet present in this repo:
- `no-silent-error-swallow` (catches `catchTag`/`catchAll`/`catchTags(() => Effect.void)` handler
  bodies specifically — a sharper version of this repo's existing `no-void-expression`)
- `prefer-option-from-nullable` (ternary `x !== null ? Option.some(x) : Option.none()` →
  `Option.fromNullable(x)`)
- `import-extensions` (relative imports must end `.ts`/`.tsx`, package imports must be
  extensionless)
- `no-sql-type-parameter` (bans `sql<Type>\`...\``, forces `SqlSchema` — relevant given this repo's
  heavy `@effect/sql`/`SqlClient` usage in `apps/desktop/src/main/`)
- `pipe-max-arguments` (readability heuristic, accountability caps at 20)

For each: is it worth adopting as-is, adopting with modification, or rejecting, and why? Decide
whether each lands in the new ESLint plugin (per ticket 01) or, if simple enough, stays regex-based
in `effect-lint.ts` instead.

**`@effect/language-service` `diagnosticSeverity`**: `tsconfig.json` currently sets none (all
defaults). Accountability sets ~35 named diagnostics explicitly, mostly to `"error"`
(`floatingEffect`, `missingEffectContext`, `catchUnfailableEffect`, `missingLayerContext`,
`missingReturnYieldStar`, `tryCatchInEffectGen`, etc. — full list in the accountability report).
This part of the ticket is an investigation, not pure judgment: for each candidate diagnostic,
enable it, run `pnpm -r typecheck`, and count how many pre-existing violations it surfaces in this
codebase before recommending a severity. A diagnostic that would break the build on adoption still
gets a recommendation (immediate `"error"`, staged `"warning"` first, or deferred), just an honest
one informed by the violation count.

Type: task
Blocked by: 01
Status: resolved

## Answer

**Adopt `no-silent-error-swallow`, `prefer-option-from-nullable`, `no-sql-type-parameter` into
the ESLint plugin; reject `import-extensions` (wrong polarity for this repo's `nodenext`
resolution) and `pipe-max-arguments` (low value). For `diagnosticSeverity`: enable 33 of 35
diagnostics as `"error"` (0-1 current violations each, empirically measured), stage
`strictEffectProvide` as `"warning"` (20 violations, needs a follow-up cleanup), defer
`strictBooleanExpressions` entirely (145 violations, needs its own migration effort).** See
[Agent Note](../../../.agents/notes/proposed/process/2026-08-28-accountability-lint-diagnostic-adoption.md).
