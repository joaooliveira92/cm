# 13: Split `apps/desktop/test/season.test.ts` (1200 lines)

Type: task
Status: resolved

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

## Landed 2026-09-05

A first pass was interrupted mid-work and landed nothing; a second finished it. The 1200-line file
is gone, replaced by eight specs under `test/main/season/`, none over 300 lines:

| File | Lines | Tests | Covers |
|---|---|---|---|
| `fixture-generation.test.ts` | 55 | 2 | pure double round-robin shape and seed determinism |
| `calendar-boundary.test.ts` | 75 | 5 | `nextCalendarBoundary`, transfer windows, season-complete |
| `query-plans.test.ts` | 106 | 3 | the two indexes, read through SQLite's own query plan |
| `dated-fixtures.test.ts` | 129 | 4 | dated competition-scoped fixture lists (ticket 09) |
| `rollover.test.ts` | 153 | 4 | promotion, relegation, the rollover (ticket 13) |
| `retention.test.ts` | 157 | 4 | what survives a concluded season on disk (ticket 18) |
| `advance.test.ts` | 273 | 9 | advancing through the save-file seam, and its determinism |
| `cups.test.ts` | 289 | 6 | domestic cups (ticket 12) |

37 tests before, 37 after. `loadResolvedFixtures` and `playUntilSeason` were each used from two
sections, so both moved into `helpers.ts` rather than being duplicated; `withSaveWrite` was already
there.

**The split made the suite faster, not slower.** The ticket warned about multiplying world
generation, and that did not happen — no `beforeAll` was added and each test still builds exactly
the world it built before. What changed is that vitest can now run these specs in parallel across
workers: 51 tests in 574s wall against 1255s of test time. It also fixed a real failure. `a
background competition's fixtures resolve as their dates pass without stopping the human` was
timing out at the 60s limit while sharing one worker with 36 other world-generating tests; it
passes comfortably now.

What the interrupted first pass had established, kept here because it is still true:

- The seams hold. The banner-comment sections map onto the target files with only two ranges
  needing to be stitched from non-adjacent line spans (calendar and rollover).
- `test/main/season/helpers.ts` already exists from that pass and holds the shared builders. It
  takes the temp saves directory as a **getter**, not a value, because each spec file mints its own
  directory in its own `beforeEach` — the builders are constructed once per module but must read
  the directory at call time. Check it before rewriting it.
- Ticket 06 has since moved every other spec, so this file's imports are now the odd ones out:
  it still reaches `./snapshot-helpers.js`, which now lives at `test/main/snapshot-helpers.ts`.


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
