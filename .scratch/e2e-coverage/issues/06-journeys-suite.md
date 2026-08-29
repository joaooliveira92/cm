Type: task
Status: resolved

## Work

Build the **journeys suite** in `apps/desktop/e2e/journeys.spec.ts` — the separately-flagged file of
cross-screen flows. Exact-value assertions live here, riding on seeded saves.

Four journeys:

| Journey | Builds on | Assertion shape |
|---|---|---|
| Save persists across restarts | no seed (refactor of existing test) | structural: squad screen renders after reload |
| Tactics saved → carried into matchday live control | `before-matchday` seed | submit a live command, assert status text (deterministic surface) |
| Advance calendar to season conclusion → SeasonSummary verdict | `before-season-end` seed | advance to `season_complete`, assert a verdict appears (no concrete position/scoreline) |
| Transfers bid lifecycle → budget reflects settled bid | `fresh` + `placeBid` | structural budget line + the bid's settled status |

Reuse the shared launch/app helper and seed helper from ticket 04 (assume they exist; add any
missing seam to the shared helper, not duplicated). Gated all-CI in this separate file with the same
reliability config as smoke; an opt-in flag for local dev is optional but never required for the CI
gate.

Verify: `pnpm typecheck` and `pnpm test:e2e` (runs both suites) pass. Reference:
`.scratch/e2e-coverage/spec.md` ("Journeys suite"), `docs/e2e.md`, existing
`apps/desktop/e2e/app.spec.ts` (the save-persists test refactors into this file).