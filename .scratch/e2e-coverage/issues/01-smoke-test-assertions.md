# 01-smoke-test-assertions

Type: grilling
Status: resolved

## Answer

**Smoke suite is structural-only** — assert only what is deterministic at save creation (headings,
section presence, table/row counts). Never assert an evolving value (budget, W/D/L, match, matchday
counter) in a smoke test; those exact-value assertions live in the seeded journeys suite (ticket 02),
where a seed fixes the value and the assert is stable.

Carve-out: **Season Summary's smoke asserts a verdict**, but only because its save is seeded (ticket
02), so the verdict is fixed and the assert is stable.

Per-screen smoke contract (load RPC + structural assert + interaction):

| Screen | Load RPC | Structural assert (deterministic) | Interaction |
|---|---|---|---|
| Squad | `getSquad` | club-name heading + 11-player table | continues a save (create-career refactor) |
| Tactics | `getTactics` | "Tactics" heading + 11 slot rows | `changeTactics` save + reload persistence (tactic-persist refactor) |
| Transfers | `getTransfersScreen` | budget line + Market & Free Agents sections render | none (bid lifecycle → journey) |
| League Table | `getLeagueTable` | "League Table" heading + 20-row table | none (`advanceCalendar` → journey) |
| Fixtures | `getFixtures` | "Fixtures" heading + fixture list renders | none |
| Match Day | `listOpponentClubs` + `startMatch` + `resumeSimulation` | match header + feed | open/hide control panel, `submitMatchCommand`, assert status text (deterministic surface only) |
| Season Summary | `getSeasonSummary` | verdict against seeded save | none (seeded) |

Grounding facts verified in code: a new save always yields the seeded starting squad (11 players) and
a fixed league (20 rows), so the structural asserts are stable. `startMatch`/`resumeSimulation`
outcomes are non-deterministic, hence Match Day asserts surface only.

## Question

For each of the seven screens (squad, tactics, transfers, league table, fixtures, match day, season
summary), what exactly does its smoke test assert?

Resolve the *assertion shape* per screen — the balance of structural checks (rows render, headings
appear) vs exact-value checks (budget text, matchday counter) — and which RPC methods each smoke
test must exercise. This is the substance of the coverage spec at
`.scratch/e2e-coverage/spec.md`.

Consider the settled constraints:
- SeasonSummary is reachable only via a seed-save (see ticket 02), so its smoke asserts a verdict
  against the seeded scenario, not a value from a ground-up season.
- MatchDay smoke covers only the deterministic surface (start match, open/hide control panel, submit
  a command, assert status text) — no commentary content or scores.
- The existing 3 tests get refactored into this structure (create-career → squad/continue,
  tactic-persist → tactics smoke, save-persist → journeys).