# Distillation state

Tracks how well each `effect-report` topic is distilled into `SKILL.md`. A self-maintenance run reads this file to pick its one topic deterministically, edits `SKILL.md`, then rewrites this file — never the reverse order. Don't hand-edit `Coverage` without applying the rubric below; the score is the only thing priority is computed from.

## Priority tiers (fixed — do not reprioritize per run)

| Tier | Weight | Topics | Why this tier |
|---|---|---|---|
| 1 — foundational correctness | 3 | getting-started, error-management, resource-management, requirements-management | getting these wrong produces bugs (unhandled errors, leaked resources, wrong deps), not just unidiomatic code |
| 2 — everyday use | 2 | concurrency, data-types, code-style, testing | shows up in most non-trivial Effect code, but a gap here is friction, not a defect |
| 3 — situational | 1 | scheduling, caching-batching, observability, state-management, configuration-runtime, stream | needed only for specific features; fine to look up in the full report on demand |

## Coverage rubric (0–100 per topic, 25 pts each)

Score what's actually in `SKILL.md` right now, not what the source file contains:

- 25 — core constructors/APIs named with a one-line purpose each
- 25 — at least one runnable-shaped code snippet per major concept
- 25 — explicit "use X vs Y" decision guidance, not just an API list
- 25 — conventions/pitfalls called out (the "don't do this" bullets)

## Priority formula

```
gap(topic) = weight(tier) * (100 - coverage)
```

Pick the topic with the highest `gap`. Tie-break: lower tier number wins, then alphabetical by topic name. This is why a neglected tier-2 topic can outrank a half-polished tier-1 one — a tier-1 topic at 70% (gap 90) loses to a tier-2 topic at 40% (gap 120). Weight sets the ceiling on how much a tier matters; coverage decides who's actually worse off.

## Staleness

Before scoring, compare each source file's `git hash-object` against `Source hash seen`. If it changed, halve the recorded coverage for that run's gap computation (but don't overwrite the stored score until the topic is actually redistilled) — a changed source means the existing section is unverified, not wrong.

## Batch size

One topic per self-maintenance run, distilled to the rubric's full 100 if possible. Matches the "one ticket per session" rule the sibling `effect-v4-migration` skill uses — depth over coverage, per repo convention.

## Topic table

| Topic | Tier | Source file | Source hash seen | Coverage | Last distilled | Notes |
|---|---|---|---|---|---|---|
| getting-started | 1 | effect-v4-getting-started.md | 9c1a4d01f5 | 85 | 2026-08-28 | core idea, constructors, pipe/gen, running table, gotchas covered; Option/Result-as-Effect interop only one line |
| error-management | 1 | effect-v4-error-management.md | ab8377bce8 | 80 | 2026-08-28 | raise/catch/defects/retry/timeout/validate/tap covered; missing match/matchEffect/matchCause family, sandboxing, cause combination, filterOrFail/mapBoth, flip |
| resource-management | 1 | effect-v4-resource-management.md | 1d58b65d3a | 75 | 2026-08-28 | acquireUseRelease, acquireRelease+Scope, LIFO finalizers, ensuring/onExit/onError covered; missing manual Scope.make/close, Scope.provide split-scope pattern, rollback-on-partial-failure worked example |
| requirements-management | 1 | effect-v4-requirements-management.md | b1ac3fea34 | 80 | 2026-08-28 | service definition, layers, composition, memoization gotcha, default services covered; missing Effect.serviceOption, manual memo-map control |
| concurrency | 2 | effect-v4-concurrency.md | 7e17d6554e | 0 | never | not yet distilled |
| data-types | 2 | effect-v4-data-types.md | eca7940ed6 | 0 | never | not yet distilled |
| code-style | 2 | effect-v4-code-style.md | 87d438351c | 0 | never | not yet distilled |
| testing | 2 | effect-v4-testing.md | e678776dc5 | 0 | never | not yet distilled |
| scheduling | 3 | effect-v4-scheduling.md | 51ad41c43f | 0 | never | not yet distilled |
| caching-batching | 3 | effect-v4-caching-batching.md | 99f2503ed6 | 0 | never | not yet distilled |
| observability | 3 | effect-v4-observability.md | 1092e0135d | 0 | never | not yet distilled |
| state-management | 3 | effect-v4-state-management.md | de722d11e1 | 0 | never | not yet distilled |
| configuration-runtime | 3 | effect-v4-configuration-runtime.md | 15ea470d3e | 0 | never | not yet distilled |
| stream | 3 | effect-v4-stream.md | 5eaff549c5 | 0 | never | not yet distilled |

Current pick (recompute each run, don't trust this line if the table above has since changed): tier-2 topics all sit at `gap = 2*100 = 200`, above every tier-1 topic's remaining gap (max 75, resource-management). Tie-break among the four tier-2 zeros → alphabetical → **code-style** is next.

## Running a self-maintenance pass

1. For every row, `git hash-object` the source file; if it differs from `Source hash seen`, apply the staleness halving for this run's computation only.
2. Compute `gap` for every row, pick the max (tie-break: tier, then name).
3. Read the full source file for that topic and the current `SKILL.md`.
4. Write or rewrite that topic's section in `SKILL.md`, matching the density and style of the existing sections (tables + short snippets + a closing conventions/pitfalls list) — same bar as the tier-1 sections already there.
5. Re-score against the rubric honestly (it's fine to land below 100; that's what leaves a truthful gap for the next run instead of a false "done").
6. Update that row: `Source hash seen`, `Coverage`, `Last distilled` (today's date), `Notes` (what's covered, what's still missing — this is what makes the next pass's rubric scoring possible without re-reading history).
7. Recompute and rewrite the "Current pick" line so the next invocation doesn't need to redo the arithmetic to sanity-check itself.
