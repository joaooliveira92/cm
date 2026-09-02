# Validation Report: world-data-model

## Sprint

- Effort: `.scratch/world-data-model/`
- Tickets closed: `implementation/01-deterministic-background-match-seed`
- Branch: `dev`
- Commits: pending (this report precedes the commit)

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | No `Math.random()` in `apps/desktop/src/main`; seed derived from world seed + fixture identity | `rg "Math.random" apps/desktop/src/main` → no matches; `resolveFixtureScore` derives `deriveSeed(deriveSeed(worldSeed, "season", seasonNumber), "match", matchday, homeClubId, awayClubId)` | PASS |
| 2 | Derivation reads only stored, replayable values | By construction — `worldSeed` from `generation_manifest`, `seasonNumber`/`matchday`/`homeClubId`/`awayClubId` from the fixture row; no clock/count/length/position | PASS |
| 3 | Same save twice → identical goals; two saves from one world seed → identical results | `season.test.ts` "two advances of the same save from the same starting state resolve every fixture identically" + "two saves generated from one world seed resolve identically after the same advances" | PASS (both ✓, 20s timeout) |
| 4 | Human's watched fixture unaffected; replay tests stay green | `match.ts` untouched; `match.test.ts` + `matchCommands.test.ts` green in full suite | PASS |
| 5 | `pnpm check:all` green | see Gate | PASS |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | PASS — `✓ typecheck (1179ms) · ✓ lint (394ms) · ✓ effect-lint (515ms) · ✓ verify-md-links (494ms) · ✓ verify-db-schema (839ms) · ✓ test (23154ms)`; desktop 73 files / 708 tests passed |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | not applicable — no screen changed |
| determinism | `cd apps/desktop && pnpm vitest run test/season.test.ts --reporter=verbose` | run — the two determinism tests above pass by name; 13/13 in `season.test.ts` |
| save compatibility | — | not applicable — no schema change; old saves advance silently onto derived seeds (prior played matchdays keep their drawn scores) |

The jsdom `window.scrollTo` "Not implemented" traces in the test log are pre-existing renderer noise (TanStack router scroll restoration under jsdom), observed before this change; not a failure.

## Behavior changes

Background fixture scores are now deterministic: same world seed + same fixture → same result, across runs and across saves generated from one seed. Watched fixtures unchanged. No save is affected — no schema change, and already-played matchdays are not rewritten.

## Decision records

- ADRs added: none
- Agent Notes written (`proposed/`): none
- Agent Notes promoted (`implemented/`): none — the two linked notes (`event-streams-and-read-models`, `season-fixture-and-cup-schedule`) span far more than the clause this ticket ships; promotion happens with the last ticket carrying each note, per `implementation/README.md`.
- Agent Notes edited (stale passages): `2026-09-02-event-streams-and-read-models.md`, `2026-08-29-human-fixture-pre-match-boundary.md`, `2026-09-01-deterministic-world-generation-and-drizzle-schema.md` — each claimed the background match still seeded from `Math.random()`, which this ticket fixed.

## Pre-existing failures

None observed this sprint. The jsdom `window.scrollTo` renderer noise predates and is unrelated.

## Deferred and known limitations

- The human's watched fixture still seeds from `Date.now() ^ hash(matchId)` in `match.ts` — kept per criterion 4; its replay semantics are recorded in the pre-match-boundary note.
- The derivation stands in with `matchday` as Round and the League as competition; the note's full `(world_seed, competition_id, season_number, round)` form slots in when tickets 05/09 land.

## Review

Reviewer verdict: **APPROVE** (no blocker, no high). One low finding — three stale Agent Note passages describing the removed `Math.random()` defect — repaired by the orchestrator as noted above before the gate. Reviewer also confirmed the seed-derivation is not fixture-direction-symmetric (length-prefixed parts), so A-home-vs-B-away cannot collide with A-away-vs-B-home.