# Issue: Match day structural extension coverage

Type: grilling
Status: resolved

## Question

What e2e coverage do we add for the match day subs and force-off UI? These are structural-only following the wave 1 match day philosophy (no outcome assertions, no commentary/scores). But we need to decide:

- Substitution controls: what structural assertions (sub panel renders, on-pitch player select renders, bench player select renders, cap usage display)?
- Force-off / orange injury: is the orange injury prompt reachable from a seeded save without a deterministic match seed? If not, do we test the prompt's structural presence at all, or only the shorthanded banner?
- Do these extend the existing match day smoke test in `app.spec.ts`, or live in a separate file?
- What's the interaction matrix (click sub button, pick players, confirm, assert no error state)?

## Answer

**Force-off e2e skipped (unreachable, covered by unit tests); sub interaction gets a full click-through flow in `journeys.spec.ts`; structural sub panel assertions extend the existing smoke test in `app.spec.ts`.** See [Agent Note](../../../.agents/notes/implemented/testing/2026-08-28-match-day-structural-extension.md).