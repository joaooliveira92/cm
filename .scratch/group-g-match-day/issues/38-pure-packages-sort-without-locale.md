# 38: The pure packages break sort ties without reading the locale

Split from the review of [34](34-ai-clubs-name-a-bench.md), 2026-09-21, orchestrator.

**What to fix:** `packages/shared` and `packages/game-engine` call `localeCompare` 17 times, including the
best-XI tie-breaks in `packages/shared/src/rules/bestXi.ts` (`selectBestFormationXI`,
`bestXiForFormation`). With no locale argument, `localeCompare` reads the host's locale, which the
engineering contract forbids in the pure packages: the same seed could pick a different XI on a machine
with another locale, for ids that compare differently under locale and code-unit order. 34's
`selectBench` already uses a code-unit `byId`; the XI it builds on does not.

Replace each call with a code-unit comparison, and add an `effect-lint` rule
(`scripts/effect-lint.ts`) that bans `localeCompare` under `packages/shared/src` and
`packages/game-engine/src`, so the mistake costs no review attention again. If a call sorts text shown to
the manager, it belongs at the renderer edge instead, and says so.

**Blocked by:** None

**Status:** resolved

- [x] No `localeCompare` remains in `packages/shared/src` or `packages/game-engine/src`
- [x] `effect-lint` fails on a new one, with a test or a demonstrated failing run
- [x] Seeded results are unchanged for the generated world (all ids ASCII), shown by the existing seeded tests; `pnpm check:all` green

## Answer

Resolved 2026-09-21. All 16 `localeCompare` calls were in `packages/shared/src` (none in the engine); each
now uses `compareCodeUnits` (`packages/shared/src/order.ts`), including the best-XI tie-breaks. A new
`effect-lint` rule, `no-locale-compare`, fails on any `localeCompare` under the two pure packages' sources,
with a fixture that must trip it on every run. No call site sorts text shown to the manager.

No seeded result moved, and that was checked rather than assumed: ICU collation also puts "_" before
digits, so `club_eng_10_01` and `club_eng_1_07` would swap. Every catalogue id (5,455, including the club
ids every competition can generate) and 90,000 sampled player ids sort identically both ways, because no
competition has a tenth tier. If one ever does, its club ids take the code-unit order, which is the
intended canonical one.

Left: `Intl.Collator` and `toLocale*` are not banned (none exist in the pure packages), and
`scripts/effect-lint.ts` was already past the 600-line ceiling (698 lines, now 742) that it enforces on
`packages/` and `apps/` but not on `scripts/`. Reviewed inline by the orchestrator.
Report: [group-g-match-day](../../../.ai/reports/group-g-match-day.md).
