# Roadmap

A snapshot of where cm-clone's efforts stand, derived from `.scratch/` maps/specs and
`.agents/notes/`. This file is a point-in-time index, not a tracker — it goes stale as tickets
resolve. Re-derive it from `.scratch/` rather than trusting it once any linked effort's status has
moved on.

Each effort below is a `.scratch/<name>/` directory. See [issue-tracker.md](agents/issue-tracker.md)
for how these are structured, and [notes.md](agents/notes.md) for the Agent Notes lifecycle
referenced throughout.

## Shipped

- **[.scratch/active-leagues-setup/](../.scratch/active-leagues-setup/)** — 8/8. The reworked
  League & Nation step: Simulation Depth as a domain term, the active-leagues projection, the
  consequences estimate, and the setup workspace. Its implementation brief sits alongside as
  `brief.md`.
- **[.scratch/club-selection/](../.scratch/club-selection/)** — 17/17. Club selection rail,
  detail panel and the generated-league selector.
- **[.scratch/human-fixture-pre-match-boundary/](../.scratch/human-fixture-pre-match-boundary/)** —
  3/3. The Calendar stops before the human club's Fixture and resolves none of that Matchday; Match
  day is that Fixture rather than a free-opponent exhibition, refusing an unprepared start with typed
  blockers; and an explicit `commitMatchday` writes the human result, the rest of the division, every
  Condition write-back and the Calendar's step in one idempotent transaction. Landed as one change
  rather than three: ticket 01 alone creates a boundary nothing can cross until ticket 03 exists, so
  a career stalls at its first Fixture in between.
- **[.scratch/continue-and-advance-time/](../.scratch/continue-and-advance-time/)** — 5/5. Screen 23
  of the Group B import reconciled against the shipped Continue loop: Group B has a reconciliation
  ledger with Screen 23 `Reviewed`, the League table's duplicate advance control is gone, one press
  of Continue reports what it did and why it failed, everything outstanding is listed with the
  screen that owns its fix, and the advance commits as one transaction and refuses a second
  concurrent press.

- **[.scratch/team-scout-report/](../.scratch/team-scout-report/)** — 8/8, completed 2026-09-13. Screen 49,
  the Team Scout Report: the report view, pointing a scout at a whole club, and earlier readings
  kept whenever a club watch ends, with a comparison against the current report.
- **[.scratch/desktop-suite-red/](../.scratch/desktop-suite-red/)** — 16/16, completed 2026-09-24. The
  desktop suite's red baseline: a bulk test-edit replaced file-backed saves with in-memory ones, a
  happy-dom/motion animation leak flooded the run with unhandled rejections, a wall-clock-seeded
  injury spec and a full-time spec flaked, and the e2e quit-guard, seeds and stale empty-state and
  ranged-value assertions drifted. Closed with the save-path and animation-cancel fixes that put the
  unit suite back at 2261 passing with no unhandled errors, and the e2e suite back at 62 passing.
- **[.scratch/main-process-decomposition/](../.scratch/main-process-decomposition/)** — 13/13,
  completed 2026-09-24. The 2026-09-05 folder-organization audit's decomposition: the duplicate
  current-season queries collapsed into `main/season/currentSeason.ts`, `main/season.ts` and
  `main/transfers.ts` split into focused modules, the flat `main/` directory grouped into
  subfolders, the test tree mirrored to `src/`, and `apps/desktop/test/` brought into typecheck
  (ticket 05, the 281-error spike fixed).
- **[.scratch/group-a-reconciliation/](../.scratch/group-a-reconciliation/)** — 26/26. The Group A
  screen reconciliation, including the last two: quit confirmation, and the Quit dialog's clicks
  under a Base UI modal.
- **[.scratch/visual-design-language/](../.scratch/visual-design-language/)** — 15/15. Tokens, the
  slate guard, dense-table and status vocabulary, the career chrome and Continue bar, modal
  anatomy, the match-day language, and the residual migration/alias teardown.
- **[.scratch/react-composition-audit/](../.scratch/react-composition-audit/)** — 17/17. The
  compound-component, provider and hook splits across MatchDay, Transfers, Squad, Creation and
  League Selection, plus the data-table and edge-fade work. This effort's tickets sat `claimed`
  with untouched placeholders until the 2026-09-06 re-status; all are now resolved.
- **[.scratch/match-composition/](../.scratch/match-composition/)** — 2/2. The match provider split
  and its context interfaces.
- **[.scratch/save-list-error-handling/](../.scratch/save-list-error-handling/)** — 1/1. The save
  list no longer swallows repository failures.
- **[.scratch/world-data-model/](../.scratch/world-data-model/)** — 13/13 decision tickets and 25/25
  implementation items, completed 2026-09-24. The MVP world data model: the competition graph and
  participant rows, dated competition-scoped fixtures, Simulation Depth on disk, staff, scouting, the
  restricted event log and `player_transfers`, retention at the rollover, and a five-index list —
  each index on a measured number, the last two (`fixtures(played, scheduled_date)` and
  `competition_participants(club_id, season_number)`) added from the prototype scale probe's results.

## In flight

None of the efforts indexed here remains open. `gate-red-on-dev` and the `group-*` screen-import
reconciliations also live under `.scratch/`, are not indexed on this page, and are not all resolved —
derive their frontier from `.scratch/` directly.

## Needs a decision, not a ticket

- **[.scratch/game-status-survivors/](../.scratch/game-status-survivors/)** — `map.md` only. Six
  wayfinder decisions were recorded and no spec was ever written. Either write the spec or fold the
  decisions into an Agent Note; do not delete it, the decisions exist nowhere else.
- **[.scratch/vendor-quarantine/](../.scratch/vendor-quarantine/)** — not an effort at all: 19
  `.ts`/`.tsx` files and no Markdown, so it has no spec, map or tickets. Two of its files are
  byte-identical to copies under `external-reference/`. It needs a README stating its provenance
  and exit criteria, or a home outside `.scratch/`.

## Suggested next step

No indexed effort is open. The work left under `.scratch/` is the screen-import reconciliation groups
(`group-c` onward, all partial) and `gate-red-on-dev` (11/13); neither is detailed on this page, so
derive their frontier from `.scratch/` directly. The world-data-model index decisions are settled and
shipped, and the desktop suite is green.
