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

## In flight

- **[.scratch/world-data-model/](../.scratch/world-data-model/)** — 13/13 tickets, and 19/24
  implementation items. The current frontier. Open: questions 20 and 21 (calendar-sweep and
  membership-join index probes, both `ready-for-human`, with live probe code under
  `apps/desktop/src/main/db/prototype-scale-probe/`), plus 22 and 23.
- **[.scratch/visual-design-language/](../.scratch/visual-design-language/)** — 10/15. Tickets
  11–15 are `ready-for-agent`.
- **[.scratch/react-composition-audit/](../.scratch/react-composition-audit/)** — 6/16 by status,
  but the statuses are stale: tickets 02–11 sit in `claimed` while recent commits appear to have
  shipped several of them. Needs a re-status pass before the count means anything.
- **[.scratch/group-a-reconciliation/](../.scratch/group-a-reconciliation/)** — 21/23. Open:
  03 (quit confirmation) and 04 (save-list chrome).
- **[.scratch/main-process-decomposition/](../.scratch/main-process-decomposition/)** — 0/5. Opened
  by the 2026-09-05 folder-organization audit. Splits `main/season.ts` (1886 lines) and
  `main/transfers.ts` (983), collapses the six duplicate current-season queries, and closes the
  gap where `apps/desktop/test/` is excluded from typecheck.
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
