# Agent Note: Accountability-derived rule and diagnostic adoption for Effect lint hardening

Status: proposed

## Problem

`mikearnaldi/accountability`'s lint setup (companion `eslint.config.mjs` `local` plugin plus
~35 explicit `@effect/language-service` `diagnosticSeverity` overrides in `tsconfig.base.json`)
is a candidate source of additional Effect-specific checks for this repo, given the
[Dual-lint architecture](2026-08-28-dual-lint-architecture.md) decision to host AST-shape rules
in a new ESLint `local` plugin alongside oxlint. Two open questions: which of accountability's
five not-yet-present ESLint rule candidates (`no-silent-error-swallow`,
`prefer-option-from-nullable`, `import-extensions`, `no-sql-type-parameter`,
`pipe-max-arguments`) are worth porting, and which of ~35 named `diagnosticSeverity` diagnostics
(currently all at TypeScript defaults in this repo's `tsconfig.json`) are safe to flip to
`"error"` without an honest, measured cost — this repo had never actually run any of them, so the
violation counts were unknown.

## Proposal

**ESLint rule candidates** — land in the new ESLint `local` plugin per
[Dual-lint architecture](2026-08-28-dual-lint-architecture.md):

- **Adopt: `no-silent-error-swallow`.** Catches `catchTag`/`catchAll`/`catchTags(() =>
  Effect.void)` handler bodies specifically — needs to inspect a handler's return-expression
  shape, genuinely AST-only. Complements (does not replace) `effect-lint.ts`'s existing
  `no-void-expression`, which catches a different pattern (`void x` as a bare statement).
- **Adopt: `prefer-option-from-nullable`.** Matches a ternary's three sub-expressions
  structurally (`x !== null ? Option.some(x) : Option.none()` → `Option.fromNullable(x)`);
  the canonical example motivating the dual-lint decision in the first place.
- **Adopt: `no-sql-type-parameter`.** Bans `sql<Type>\`...\`` in favor of `SqlSchema`, directly
  relevant given this repo's heavy `@effect/sql`/`SqlClient` usage in `apps/desktop/src/main/`
  (schema.ts, saves.ts, ~10 others).
- **Reject: `import-extensions`.** Accountability's version requires relative imports to end
  `.ts`/`.tsx` and rejects `.js`/`.jsx`, because their `tsconfig.base.json` sets
  `"moduleResolution": "bundler"` with `"rewriteRelativeImportExtensions": true`. This repo sets
  `"moduleResolution": "nodenext"` (`tsconfig.json`), which requires the *opposite*: relative
  imports must end `.js` even though the source file is `.ts` (standard TS ESM/nodenext
  convention). A grep of `packages/game-engine/src` and `apps/desktop/src` found 51 relative
  imports, all consistently `.js`. Adopting accountability's rule as-is would flag every one of
  them as a violation of a convention this repo doesn't use and whose inverse (`.js`-only) is
  already enforced for free by `nodenext` module resolution at compile time — an ESLint rule
  would be redundant with what `tsc` already guarantees. Not a "port later" case; the rule's
  polarity is wrong for this repo's resolution mode.
- **Reject: `pipe-max-arguments`.** Accountability's cap is 20 arguments per `.pipe()` call, a
  subjective readability heuristic rather than a correctness rule. Low expected value at this
  repo's current scale (no evidence of runaway pipe chains) and not tied to any real Effect
  anti-pattern the way the other candidates are. Skip; revisit only if pipe chains become
  unwieldy in practice.

**`@effect/language-service` `diagnosticSeverity`** — investigated empirically, not just by
judgment: enabled all 35 accountability-named diagnostics as `"error"` in a scratch copy of
`tsconfig.json` (`diagnostics: true` plus the full `diagnosticSeverity` map) and ran `pnpm -r
typecheck` per package (`packages/shared`, `packages/contracts`, `packages/game-engine`,
`apps/desktop`), counting violations by diagnostic name in the output. Findings and per-diagnostic
recommendation:

- **32 of the 35 diagnostics: 0 violations.** (`catchUnfailableEffect`, `classSelfMismatch`,
  `deterministicKeys`, `duplicatePackage`, `effectGenUsesAdapter`, `effectInVoidSuccess`,
  `floatingEffect`, `genericEffectServices`, `globalErrorInEffectCatch`,
  `globalErrorInEffectFailure`, `importFromBarrel`, `layerMergeAllWithDependencies`,
  `leakingRequirements`, `missingEffectContext`, `missingEffectError`,
  `missingEffectServiceDependency`, `missingLayerContext`, `missingReturnYieldStar`,
  `missingStarInYieldEffectGen`, `multipleEffectProvide`, `nonObjectEffectServiceType`,
  `outdatedEffectCodegen`, `overriddenSchemaConstructor`, `returnEffectInGen`,
  `runEffectInsideEffect`, `schemaUnionOfLiterals`, `scopeInLayerEffect`, `strictBooleanExpressions`
  is excluded from this group — see below — `strictEffectProvide` is also excluded,
  `tryCatchInEffectGen`, `unknownInEffectCatch`, `unnecessaryEffectGen`,
  `unnecessaryFailYieldableError`, `unnecessaryPipe`, `unnecessaryPipeChain`,
  `unsupportedServiceAccessors`.) **Recommendation: enable all 32 as `"error"` immediately** —
  zero migration cost today, and they guard against real Effect anti-patterns (floating effects,
  missing context, defect-swallowing, etc.) being introduced later. This is a strictly stronger
  posture than accountability's own defaults, which leave a few of these (e.g.
  `deterministicKeys`, `leakingRequirements`) at `"warning"`; since this repo has zero existing
  violations, there's no reason to under-set severity.
- **`anyUnknownInErrorContext`: 1 violation** (`apps/desktop/src/main/rpcServer.ts:155`, an
  `unknown` error channel). **Recommendation: `"error"` immediately** — trivial one-site fix,
  and accountability itself only defaults this to `"warning"`; this repo can afford to be
  stricter given the near-zero cost.
- **`strictEffectProvide`: 20 violations**, concentrated in `apps/desktop/src/main/match.ts` and
  `saves.ts` (`Effect.provide` with a `Layer` outside what the diagnostic considers an
  application entry point). **Recommendation: stage as `"warning"` first**, not `"error"` — 20
  call sites is real, non-trivial work (each needs a judgment call: legitimate entry point, or a
  layer that should compose at the edge instead), so flipping straight to `"error"` would break
  the build without buying anything beyond fixing it, if scoped as its own follow-up.
- **`strictBooleanExpressions`: 145 violations**, dominated by `null`/`undefined`/`string`
  truthiness checks (`if (foo)` where `foo: T | undefined`) spread across
  `packages/game-engine/src/match/simulate.ts` and `tactical-modifiers.ts` plus test files.
  **Recommendation: defer** — do not enable yet, not even as `"warning"`. This is the widest-reaching
  diagnostic by far (an order of magnitude more violations than the next), implicit
  truthiness/nullish checks are a pervasive idiom already in use throughout the codebase, and
  fixing it is a genuine migration effort, not a handful of spot fixes. Needs its own scoped
  cleanup effort before revisiting severity, not a decision folded into this ticket.

## Alternatives considered

- **Adopt all 35 diagnostics at accountability's own severities as-is** — rejected. Would have
  set `strictBooleanExpressions` and `strictEffectProvide` to `"error"` sight unseen, immediately
  breaking `pnpm -r typecheck` across two packages on adoption day for a combined 165 pre-existing
  violations this repo hadn't audited. The measured approach (enable everything, count violations
  per name, then decide per-diagnostic) is what surfaced that risk before it would have landed in
  CI.
- **Port `import-extensions` inverted (require `.js`, ban `.ts`)** — considered as a way to
  still capture the rule's intent (consistent relative-import extension convention) without its
  wrong polarity. Rejected: `nodenext` module resolution already makes the correct extension a
  compile error if violated, so an ESLint rule enforcing the same thing is pure duplication with
  no marginal benefit — `tsc` is the enforcement mechanism here, not lint.
- **Skip the diagnosticSeverity investigation, defer entirely to "someone runs it later"** —
  rejected per the ticket's own framing: an investigation ticket that recommends without evidence
  isn't a resolved decision, and the 145/20-violation counts materially changed the
  recommendation (staged rollout, not blanket adoption) versus what pure judgment from the
  diagnostic descriptions alone would have suggested.

## Acceptance criteria

- `scripts/effect-lint.ts`'s no-void-expression stays; the new ESLint `local` plugin gains
  `no-silent-error-swallow`, `prefer-option-from-nullable`, `no-sql-type-parameter` (implementation
  tracked by whatever ticket/PR actually stands up the plugin per
  [Dual-lint architecture](2026-08-28-dual-lint-architecture.md)).
- `tsconfig.json`'s `@effect/language-service` plugin config sets `diagnostics: true` and
  `diagnosticSeverity: "error"` for the 33 diagnostics with 0 or 1 current violations
  (`anyUnknownInErrorContext` plus the 32 zero-violation names listed above).
- `strictEffectProvide` lands at `"warning"`, with a follow-up ticket to audit and fix its 20
  call sites before promoting to `"error"`.
- `strictBooleanExpressions` is not set in `tsconfig.json` at all until a dedicated cleanup
  effort addresses its 145 violations.
- `import-extensions` and `pipe-max-arguments` are not implemented.

## Risks

- **Violation counts are a snapshot.** New code landing between this investigation and actual
  adoption could shift the numbers (especially for the 32 "currently zero" diagnostics — a single
  new violation before adoption lands would need triage, not silent inclusion). Re-run the
  `pnpm -r typecheck` count immediately before actually flipping severities in `tsconfig.json`.
- **`strictEffectProvide` at `"warning"` risks staying a warning forever** if no one owns the
  20-site cleanup — warnings are easy to ignore indefinitely. Needs an explicit follow-up ticket,
  not just a hope that it gets fixed incidentally.
- **`strictBooleanExpressions` deferral could look like "reject"** if not revisited — it's
  deferred because of scale, not because the diagnostic is low-value; explicit nullish/boolean
  checks are a real Effect/TS best practice this repo is currently not following in ~145 places.
