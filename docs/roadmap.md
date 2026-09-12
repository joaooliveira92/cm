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

## In flight

- **[.scratch/world-data-model/](../.scratch/world-data-model/)** — 13/13 tickets, and 19/24
  implementation items. The current frontier. Open: questions 20 and 21 (calendar-sweep and
  membership-join index probes, both `ready-for-human`, with live probe code under
  `apps/desktop/src/main/db/prototype-scale-probe/`), plus 22 and 23.
- **[.scratch/visual-design-language/](../.scratch/visual-design-language/)** — 10/15. Tickets
  11–15 are `ready-for-agent`.
- **[.scratch/react-composition-audit/](../.scratch/react-composition-audit/)** — 6/16. Re-statused
  2026-09-06, and the answer was the opposite of what was assumed here: tickets 02–11 had **not**
  been shipped by recent commits, they had never been started. All ten still held the untouched
  `<!-- to be filled by implementation -->` placeholder, and not one of the 17 providers, hooks or
  components in their Done-When lists exists in the tree. They were labelled `claimed` at filing
  rather than at start, which is a lock nobody held — the frontier scan skips claimed tickets, so
  the effort read as in-progress while nothing could pick it up.

  Now: 7 `ready-for-agent` (04, 05, 06, 08, 09, 10, 11) and 3 `needs-triage` (02, 03, 07). The
  three need a human call rather than an agent: their size targets were met incidentally by other
  work under different names — `TransfersScreen.tsx` is 103 lines and `SquadScreen.tsx` is 14 —
  so what survives is the boolean-prop half, which may or may not still be worth a ticket.
  Ticket 05 was additionally retargeted; it named `CreationStep1.tsx`, renamed long ago.
- **[.scratch/group-a-reconciliation/](../.scratch/group-a-reconciliation/)** — 21/23. Open:
  03 (quit confirmation) and 04 (save-list chrome).
- **[.scratch/main-process-decomposition/](../.scratch/main-process-decomposition/)** — 3/5. Opened
  by the 2026-09-05 folder-organization audit. Tickets 01–03 are done: the six duplicate
  current-season queries collapsed into `main/season/currentSeason.ts`, `main/season.ts` (1885
  lines) became nine modules, and `main/transfers.ts` became five. Remaining: 04 (group the rest of
  the flat `main/` directory into subfolders — optional, ~161 mechanical import edits) and 05
  (bring `apps/desktop/test/` into typecheck; a spike measured 281 pre-existing errors in 33 files
  and is written up in the ticket).
- **[.scratch/match-composition/](../.scratch/match-composition/)** — 0/2, both `ready-for-agent`.
  Note these two files sit at the effort root rather than under `issues/`, against the
  issue-tracker convention.
- **[.scratch/save-list-error-handling/](../.scratch/save-list-error-handling/)** — 0/1, a
  `ready-for-agent` bug-fix.

## Needs a decision, not a ticket

- **[.scratch/game-status-survivors/](../.scratch/game-status-survivors/)** — `map.md` only. Six
  wayfinder decisions were recorded and no spec was ever written. Either write the spec or fold the
  decisions into an Agent Note; do not delete it, the decisions exist nowhere else.
- **[.scratch/vendor-quarantine/](../.scratch/vendor-quarantine/)** — not an effort at all: 19
  `.ts`/`.tsx` files and no Markdown, so it has no spec, map or tickets. Two of its files are
  byte-identical to copies under `external-reference/`. It needs a README stating its provenance
  and exit criteria, or a home outside `.scratch/`.

## Suggested next step

Finish `world-data-model`'s open questions 20–23 — it is the frontier and the probe code is already
written. In parallel, `main-process-decomposition` ticket 05 (typecheck the desktop tests) is
independent of everything else and closes a gate hole that silently hides broken test imports.
