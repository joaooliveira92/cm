# E2E suite

Playwright + Electron tests for the desktop app. Two suites, canonical spec at
`.scratch/e2e-coverage/spec.md`.

## Smoke — `e2e/app.spec.ts`

One test per screen, **structural-only**: assert what is deterministic at save creation (headings,
sections, row counts) — never an evolving value like a transfer budget or W/D/L. The one carve-out:
Season Summary asserts its verdict, but only against a seeded save.

| Screen | Load RPC | Structural assert |
|---|---|---|
| Squad | `getSquad` | club-name heading + 11-player table |
| Tactics | `getTactics` | "Tactics" heading + 11 slot rows |
| League Table | `getLeagueTable` | "League Table" heading + 20-row table |
| Fixtures | `getFixtures` | "Fixtures" heading + fixture list |
| Match Day | `listOpponentClubs` + `startMatch` + `resumeSimulation` | match header + feed; toggle control panel, submit a command, assert status text (never commentary/scores) |
| Transfers | `getTransfersScreen` | budget line + Market & Free Agents sections |
| Season Summary | `getSeasonSummary` | verdict against a seeded save |

## Journey suite — `e2e/journeys.spec.ts`

Cross-screen flows with exact-value asserts that need a seeded save. Gated all-CI, same reliability
contract, in a separately-flagged file so it can be toggled.

- Save persists across a restart
- Tactics carried into a matchday live control
- Advance calendar to season conclusion → SeasonSummary verdict
- Transfers bid lifecycle → budget reflects the settled bid

## Seed-save helper

A generator reuses the app's own in-process Effect layers (`createSave`, `advanceCalendar`) to write
a `.sqlite` into the test's temp saves dir — no checked-in fixture binaries. Four seeds:
`fresh`, `before-matchday`, `before-season-end`, `concluded`.

## Reliability contract

`retries: 2` (CI), `timeout: 30_000`, `workers: 1`, `fullyParallel: false`.

**Why structural-only:** the app has no deterministic sim seed, so Match Day outcomes and any evolved
table/budget value are non-deterministic. Smoke asserts the deterministic surface; seeded journeys
assert exact values.