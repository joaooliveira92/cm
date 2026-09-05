# 13: Split `apps/desktop/test/season.test.ts` (1200 lines)

Type: task
Status: ready-for-agent

**What to build:** the largest test file in the repo, and the one whose subject was itself split
into eight modules by ticket 02. `main/season.ts` became `main/season/`; its spec did not follow.
The file is already sectioned by `// ---` banners along the same seams:

| Target | Covers |
|---|---|
| `test/main/season/transfer-windows.test.ts` | the `WINDOWS` fixture and window-open assertions |
| `test/main/season/calendar.test.ts` | fixture generation, the whole-calendar `loadAllFixtures` assertions, penalty-free league fixtures |
| `test/main/season/matchday.test.ts` | `loadResolvedFixtures`, resolution and full-time behaviour |
| `test/main/season/cups.test.ts` | `loadCupFixtures` and bracket assertions |
| `test/main/season/rollover.test.ts` | `playWholeSeason`, `playUntilSeason`, `loadFields`, promotion/relegation, `survivingSeason` pruning |
| `test/main/season/query-plans.test.ts` | the `queryPlan` index assertions |
| `test/main/season/helpers.ts` | the shared builders: `createCareerFrom`, `createCareerFromWorldSeed`, `loadFirstClubId`, `loadSeasonStreamEvents`, `withSaveWrite` |

## Constraints

- **Each of these specs generates a world.** They are the slowest specs in the suite. Splitting
  them multiplies world generation by the number of files unless the shared builders in
  `helpers.ts` stay exactly as cheap as they are today -- do not add a per-file `beforeAll` that
  regenerates what a single `createCareerFromWorldSeed(seed)` call already produces.
- Seeds are the contract. `createCareerFromWorldSeed` results are pinned; keep every literal seed
  with the assertions that use it.
- Test count before and after must be identical. Record both numbers in the commit message.

**Blocked by:** 06 (this is the same rewrite; do it as part of that ticket's `test/main/season/`
directory rather than as a separate move).

- [ ] No file under `test/main/season/` exceeds 400 lines.
- [ ] `pnpm --filter @cm-clone/desktop test` reports the same passing count as before.
- [ ] `pnpm check:all` is green at this commit.
