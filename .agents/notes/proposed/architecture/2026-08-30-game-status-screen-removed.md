# Agent Note: Screen 18 (Game Status) removed; survivors redistributed

Status: proposed

## Problem

The imported spec at `docs/specs/group_a/18_game_status.md` describes a read-only technical dashboard for the active career: runtime workers, memory budgets, multiplayer session state, cloud synchronization state, an async `GameStatusSnapshot` model with stale-response handling, and a safe-diagnostic-copy action. The blanket scope trim (group-a-reconciliation ticket 03) already removed the runtime, worker, memory, multiplayer, and cloud clauses from the spec — but even after that trim, survivors remained: career date/season, save identity, world entity counts, application version, schema version, and whether the save is sacked-and-archived. The open question was whether any of that residue is worth a dedicated screen, or whether each piece belongs elsewhere.

## Proposal

Screen 18 is removed. It has no dedicated route, no new component, no `GameStatusSnapshot` schema, no async refresh machinery. The survivors redistribute into existing real estate:

- **Career date, season number, save name** → the CareerChrome nav bar, as a one-line orientation breadcrumb visible on every career screen. CareerChrome already exists above every career child route; it currently shows only tab buttons and a "Back to saves" link. Adding the save name and season context closes the orientation gap on Squad (the landing screen, which shows zero save identity today).

- **Sacked/archived state** → a status line on the Save List card for that save, not a separate page. The Save List already shows save name and creation date; adding an `(Archived)` badge when the save is read-only is a single-line addition.

- **Application version and save schema version** → a small About dialog, modal, reusing the existing overlay infrastructure (same pattern as TeachingSplash, CommandPalette, HelpOverlay). Triggered via a currently-unused keyboard binding or a `?` affordance in CareerChrome. The app ships no version string to the renderer today (all `package.json` versions are `"0.0.0"`); adding the mechanism is part of implementing this decision.

- **World entity counts** (clubs, players, staff, competitions) → not surfaced. No existing screen shows entity counts, and no player-facing decision reads them. This is developer trivia with no precedent in the codebase.

- **Safe diagnostic copy** → removed. The app is local single-player with no support channel, no telemetry backend, and no bug-report pipeline. There is nowhere to paste a diagnostic summary.

The `GameStatusSnapshot` type and its async refresh machinery (monotonically increasing request revision, stale-response discarding, keep-previous-visible) are entirely removed. All data the survivors need is a synchronous read of the save; there is no concurrent mutation race to defend against once the data is local.

## Alternatives considered

- **Keep the screen thin: just show the survivors on a dedicated route.** Cost of a new route registration in `router/index.tsx`, a `CareerDestination` variant in `destinations.ts`, a chrome tab in `career.tsx`, keyboard-nav `g` binding in `KeyboardSpine.tsx`, and an RPC query/atom for a data source that has no current consumer. The survivors are too few (three items not already shown elsewhere) to justify a tab and a route.

- **Merge Game Status survivors into an existing screen (Squad).** Squad is already a dense list of 20+ players; adding a status header row above it would be visible but low-value. The orientation data (save name, season) belongs in the chrome, shared across every screen, not buried on one of them.

- **Surface version only at the OS level (Electron About menu).** Possible, but the save schema version is a per-save property that must be read from the loaded save, not from `package.json`. An in-app dialog is the right locus.

- **Add an About entry to the Save List.** The Save List is the boot screen; players reach it before loading a save. The schema version is meaningless without a save loaded. The dialog belongs inside the career shell.

## Acceptance criteria

1. CareerChrome shows the loaded save's name and current season/phase on every career screen.
2. Sacked saves display an `Archived` badge on the Save List card.
3. An About dialog shows app version and save schema version, reachable from within the career shell.
4. No `GameStatus` route, component, RPC method, Atom, or `CareerDestination` variant exists.
5. No `GameStatusSnapshot` type exists in `packages/contracts`.
6. The reconciliation ledger at `RECONCILIATION.md` marks every remaining section of 18_game_status.md as removed, with rows citing this note.

## Risks

- **CareerChrome clutter.** The chrome is deliberately minimal (tabs + one button). Adding a save-name + season line increases visual weight. Mitigated by making it a single subdued text line, not a panel, and by the fact that the missing orientation is a real usability gap today.
- **Schema version is uninteresting to most players.** The About dialog is one tiny surface; the version line doesn't demand attention.
- **Version string not yet wired into the build.** The app currently has no `__APP_VERSION__` or equivalent. Implementing AC-3 requires choosing a mechanism (Vite define, import.meta.env, or Electron's `app.getVersion()`) — deferred to the implementation ticket, not decided here.