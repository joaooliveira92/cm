Status: ready-for-agent

# E2E coverage spec

A coverage spec + reliability contract for the Playwright e2e suite of the desktop game
(`@cm-clone/desktop`). It defines what the suite covers (a smoke test per screen, the high-value
journeys), how stable it must be to gate CI, and the shared seed-save machinery that makes that
stability possible.

The app is not made more testable (no deterministic sim seed, no test-only RPCs). The suite plans
around the real app: Match Day covers only its deterministic surface, and any exact-value assert
rides on a seeded save.

## Test structure

The existing 3 tests in `apps/desktop/e2e/app.spec.ts` are refactored into two suites:

- **Smoke** (`e2e/app.spec.ts`): one test per screen. Structural-only assertions. CI-gated.
- **Journeys** (`e2e/journeys.spec.ts`): cross-screen mutations. Exact-value assertions. All-CI in a
  separately-flagged file, same reliability config as smoke; an opt-in flag is a local-dev
  convenience only, never the CI gate.

No duplication and no dead weight: every existing test is folded into one of these, never copied.

## Reliability contract

Applies to both suites:

- `retries: 2` on CI only
- per-test `timeout: 30_000`
- `workers: 1`
- `fullyParallel: false`

## Smoke suite — per-screen contract

**Assertion philosophy:** assert only what is deterministic at save creation — headings, section
presence, table/row counts. **Never assert an evolving value** (budget, W/D/L, match score, matchday
counter) in a smoke test; those live in the seeded journeys suite where a seed fixes the value.

Carve-out: **Season Summary's smoke asserts a verdict** — but only because its save is seeded, so
the verdict is fixed.

| Screen | Load RPC | Structural assert (deterministic) | Interaction |
|---|---|---|---|
| Squad | `getSquad` | club-name heading + full squad table (row count = rendered "N players") | continues a save (create-career refactor) |
| Tactics | `getTactics` | "Tactics" heading + 11 slot rows | `changeTactics` save + reload persistence (tactic-persist refactor) |
| Transfers | `getTransfersScreen` | budget line + Market & Free Agents sections render | none (bid lifecycle → journey) |
| League Table | `getLeagueTable` | "League Table" heading + 20-row table | — (`advanceCalendar` → journey) |
| Fixtures | `getFixtures` | "Fixtures" heading + fixture list renders | — |
| Match Day | `listOpponentClubs` + `startMatch` + `resumeSimulation` | match header + feed | open/hide control panel, `submitMatchCommand`, assert status text (deterministic surface only) |
| Season Summary | `getSeasonSummary` | verdict against a seeded save | — (seeded) |

A new save always yields the seeded starting squad (a full squad table) and a fixed league (20
rows), so the structural asserts are stable. The tactics screen's 11 rows are the tactical XI, not
the squad size. `startMatch`/`resumeSimulation` outcomes are non-deterministic, so Match Day asserts
the *surface*, never commentary content or scores.

## Seed-save helper

**Mechanism: a generator**, not checked-in fixture files. It reuses the app's own in-process Effect
layers — `createSave`, then N× `advanceCalendar` — to write a `.sqlite` straight into the target
saves dir, exactly as `apps/desktop/test/*.test.ts` already do. Checked-in `.sqlite` fixtures are
rejected: they rot with schema changes, whereas the event-sourced save is just the event stream a
generator replays with no drift.

**Seeds** (one generator call each, producing a `saveId`):

| Seed | Build | Used by |
|---|---|---|
| `fresh` | just `createSave` | most smokes (squad/tactics/transfers/league/fixtures/match-day) |
| `before-matchday` | create + advance to just before Matchday 1 | MatchDay journey, live-control |
| `before-season-end` | advance to Matchday 37/38 | advance-to-conclusion journey |
| `concluded` | advance to `season_complete` (verdict exists) | SeasonSummary smoke (asserts seeded verdict) |

**SaveId mapping:** the generator writes `<savesDir>/<seed>.sqlite` with a fixed `save_meta.name`
(e.g. "Seed: concluded"); the e2e passes its temp `--user-data-dir`'s `saves/` path, and the test
selects the save by that fixed name. The file's `save_meta.id` row is the saveId; the app only needs
the file to exist.

## Journeys suite

Four journeys cover the cross-screen mutations that smoke deliberately skips.

| Journey | Builds on | Assertion shape |
|---|---|---|
| Save persists across restarts | refactor of existing test (no seed) | structural: squad screen renders after reload |
| Tactics saved → carried into matchday live control | `before-matchday` seed | submit a live command, assert status text (deterministic surface) |
| Advance calendar to season conclusion → SeasonSummary verdict | `before-season-end` seed | advance to `season_complete`, assert a verdict appears |
| Transfers bid lifecycle → budget reflects settled bid | `fresh` + `placeBid` | structural budget line + the bid's settled status |

The SeasonSummary verdict is fixed by the seed, so the advance-to-conclusion journey asserts a
verdict appears; it asserts **no** concrete position or scoreline.

## Ticket map

- [01 — Smoke-test assertions](issues/01-smoke-test-assertions.md)
- [02 — Seed-save helper design](issues/02-seed-save-helper-design.md)
- [03 — Journeys-suite coverage and gating](issues/03-journeys-suite-coverage-and-gating.md)

The seed-save prototype lives on throwaway branch `e2e-coverage/prototype-seed-save` (commit
`99c5d2e`, `apps/desktop/test/seed-save.prototype.test.ts`) — it proves the concluded-season
scenario builds in ~1.5s and reads back a fixed verdict.