Type: task
Status: resolved

## Work

Build the **smoke suite** in `apps/desktop/e2e/app.spec.ts`, refactoring the existing 3 tests into
the per-screen structure. Structural-only assertions — assert what is deterministic at save
creation (headings, sections, row counts), never an evolving value.

Per-screen contract (from the spec):

| Screen | Load RPC | Structural assert | Interaction |
|---|---|---|---|
| Squad | `getSquad` | club-name heading + 11-player table | continues a save (create-career refactor) |
| Tactics | `getTactics` | "Tactics" heading + 11 slot rows | `changeTactics` save + reload persistence (tactic-persist refactor) |
| Transfers | `getTransfersScreen` | budget line + Market & Free Agents sections render | none |
| League Table | `getLeagueTable` | "League Table" heading + 20-row table | — |
| Fixtures | `getFixtures` | "Fixtures" heading + fixture list renders | — |
| Match Day | `listOpponentClubs` + `startMatch` + `resumeSimulation` | match header + feed | open/hide control panel, submit a command, assert status text (never commentary/scores) |
| Season Summary | `getSeasonSummary` | verdict against a **seeded** save (uses the `concluded` seed) | none |

Use the shared launch/app helper and seed helper from ticket 04 (assume they exist; if any seam is
missing, add it to the shared helper rather than duplicating). The "continue career" smoke and the
"tactic-persist" smoke fold in the existing tests' coverage — no dead weight.

Verify: `pnpm typecheck` and `pnpm test:e2e` (runs the smoke suite) pass. Reference:
`.scratch/e2e-coverage/spec.md`, `docs/e2e.md`, existing `apps/desktop/e2e/app.spec.ts`.