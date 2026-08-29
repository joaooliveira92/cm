# Map: e2e-coverage

Label: wayfinder:map

> **Status: closed at handoff.** The destination — the coverage spec ([spec.md](spec.md)) and its
> living distillation ([docs/e2e.md](../../docs/e2e.md)) — is reached and handed off, and the
> infrastructure, smoke, and journeys suites (tickets 04–06) are implemented against it. Per
> [ADR-0010](../../docs/adr/0010-post-handoff-decisions-live-in-adrs-map-closes.md), this map no
> longer charts new work; it is retained as the index of the decisions the way was built on.

## Destination

A **coverage spec + reliability contract** for the Playwright e2e suite of the desktop game
(`@cm-clone/desktop`): every screen gets a smoke test, the high-value journeys get covered, and the
whole suite is fast and stable enough to gate CI. The deliverable is a spec at
`.scratch/e2e-coverage/spec.md` (canonical) with a living distillation at `docs/e2e.md` — not the
tests themselves.

## Notes

- Domain: Playwright + Electron e2e for the desktop app. Screens: squad, tactics, transfers, league
  table, fixtures, match day, season summary.
- **No app testability seams** (no deterministic sim seed, no test-only RPCs). MatchDay e2e covers
  only its deterministic surface (start, control panel, submit command, status text) — never
  commentary content or scores.
- Smoke tests per screen are CI-gated. A separately-flagged journeys suite holds the slow /
  cross-screen paths.
- Reliability bar (settled in charting): `retries: 2` on CI only, per-test `timeout: 30_000`,
  `workers: 1`, `fullyParallel: false`.
- The existing 3 tests in `apps/desktop/e2e/app.spec.ts` get refactored into the new per-screen
  structure — no duplication, no dead weight.
- Seed-save helper exists so SeasonSummary and journeys don't grind the calendar in-test.
- Skills: writing-for-agents (for the spec/docs), implement later. Say names, not bare ids.

## Decisions so far

- [Smoke-test assertions](issues/01-smoke-test-assertions.md): smoke suite is structural-only — headings/sections/row-counts, never evolving values; Season Summary's smoke asserts a seeded verdict (ticket 02). Per-screen load RPC + assert + interaction matrix settled.
- [Seed-save helper design](issues/02-seed-save-helper-design.md): generator reusing in-process Effect layers (createSave + N× advanceCalendar) writes `.sqlite` into the temp saves dir — no checked-in fixtures. Four seeds: `fresh`, `before-matchday`, `before-season-end`, `concluded`. Save selected by fixed name. Prototype on branch `e2e-coverage/prototype-seed-save`.
- [Journeys-suite coverage and gating](issues/03-journeys-suite-coverage-and-gating.md): all four candidate journeys stay (save-persist, tactics-into-matchday, advance-to-conclusion, transfers bid). Gated all-CI in a separately-flagged file with the smoke reliability config; opt-in flag is local-dev only.

- [Journeys-suite coverage and gating](issues/03-journeys-suite-coverage-and-gating.md): all four candidate journeys stay (save-persist, tactics-into-matchday, advance-to-conclusion, transfers bid). Gated all-CI in a separately-flagged file with the smoke reliability config; opt-in flag is local-dev only.
- [E2E infrastructure](issues/04-e2e-infrastructure.md): `playwright.config.ts` applies the reliability contract (retries 2 CI-only, timeout 30_000, workers 1, fullyParallel false); a `seedSaves.ts` generator reuses the app's in-process Effect layers (`createSave`/`advanceCalendar`) to write `fresh`/`before-matchday`/`before-season-end`/`concluded` `.sqlite` seeds into the temp saves dir, no checked-in fixtures; `launchApp.ts` factors the temp-`--user-data-dir` launch/setup out of `app.spec.ts`. Proved out by `test/seed-saves.test.ts`.
- [Smoke suite](issues/05-smoke-suite.md): per-screen structural-only tests in `app.spec.ts` — Squad, Tactics (with changeTactics persist), Transfers (budget line + Market & Free Agents), League Table (20-row), Fixtures, MatchDay (open/hide panel + submit + status text, never commentary/scores), SeasonSummary against the `concluded` seed. Existing 3 tests refactored in, no dead weight.
- [Journeys suite](issues/06-journeys-suite.md): cross-screen flows in `journeys.spec.ts` — save persists across restarts, tactics-into-matchday live control, advance calendar to a SeasonSummary verdict, transfers bid lifecycle → settled budget. Exact-value assertions ride seeded saves, gated all-CI with the smoke reliability config.

## Not yet specified

<!-- The journeys-gating fog graduated into ticket 03 and is now resolved; nothing remains. -->

## Out of scope

- App testability seams (deterministic sim, test RPCs) — the human chose no app changes; this map
  plans around the real app.
- Executing the tests themselves — wayfinder plans; the implementer builds from the spec when the
  map closes.