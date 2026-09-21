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

**Status:** ready-for-agent

- [ ] No `localeCompare` remains in `packages/shared/src` or `packages/game-engine/src`
- [ ] `effect-lint` fails on a new one, with a test or a demonstrated failing run
- [ ] Seeded results are unchanged for the generated world (all ids ASCII), shown by the existing seeded tests; `pnpm check:all` green
