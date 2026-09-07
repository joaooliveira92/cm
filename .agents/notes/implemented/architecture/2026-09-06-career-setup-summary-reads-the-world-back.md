# Agent Note: The Career Setup Summary reads the world back rather than riding on the result that built it

Status: implemented

## Problem

§22 asks the Review step to describe the world the player is about to commit to: the season it
opens in, what the league scope turned into, how many players and staff exist. The step already
summarizes the configuration, and one of its lines — league scope — comes from the League Selection
Snapshot's `CareerScopeEstimateView`. That estimate is computed before generation runs. Reusing it
for the new figures would put a number on screen that no world has to honour, which is the opposite
of what a confirmation step is for.

So the figures must come off the generated save. That leaves one open question, which
`.scratch/add-manager-screen-7/issues/02` names explicitly: do they ride back on `beginCareer`'s
success, computed at generation time and carried in the flow's `Ready` state, or does the Review
step ask for them separately?

The constraint that decides it is also in the ticket: the Review step must perform no work whose
failure can strand a ready career.

## Decision

**A separate read, `getCareerSetupSummary(saveId)`, on the same pre-career RPC surface that built
the world.**

- `CareerSetupSummaryView` in `packages/contracts/src/schemas/career-setup.ts`: season number,
  label and start date, nation count, per-depth competition bands, and club, player and staff
  counts.
- `apps/desktop/src/main/career/careerSetupSummary.ts` counts all of it with `COUNT` statements
  against the save file. Nothing is derived from the snapshot, the estimate, or a constant.
- `ReviewPane` runs the read at the event-handler edge and holds a three-state
  `Loading | Ready | Unavailable`. `Unavailable` renders a line and nothing else changes; the
  bottom bar's `Create Career` never consults it.

**Riding on `beginCareer` was the alternative, and it loses on three counts.** It would widen a
generation contract with display data; it would make the flow's `GenerationState` — which exists to
settle a cancellation race — carry a payload that has nothing to do with that race; and it would
compute the figures at generation time, which is the wrong moment for anything the panel might
later want to describe about a world that has since been committed. The failure-safety argument
that seemed to favour it is not real: a read that already failed leaves the ready career exactly as
ready as it was, because it writes nothing and gates nothing.

**The season is derived from the manifest, not read from `season`.** `startSeason` runs inside
`commitCareer`, so a provisional world has no `season` row at all. `generation_manifest.reference_year`
is pinned at generation and is the same input `startSeason` will use, so
`seasonLabel(referenceYear, 1)` names the season the career will actually open in rather than
guessing at one. `seasonLabel` is new, and lives in `packages/shared/src/season/calendar.ts` beside
`seasonStartYear` — the July-to-May span is a fact about this calendar, and a renderer that
reconstructed it would hold a second copy of that rule.

**The nation count comes from `competitions`, not `nations`.** Generation copies every nation in
the ruleset into every save, because a player's nationality is drawn from the whole catalogue
whatever the selection activated. Counting that table would report the catalogue and call it the
scope.

**The staff figure is a live count that reads zero, and says so in words.** A club's backroom is
materialised by `materialiseStaff` at `commitCareer`, when the club becomes human-managed — so on
the provisional world this panel describes, the honest count is zero. Rather than omit the figure
(§22 asks for it) or print a bare `0` (which reads as a world that failed to generate people), the
line renders "Appointed when the career is created". The count itself is still a real `COUNT`
against `staff`, so the figure starts reporting a number by itself if staff generation ever moves
earlier.

## Consequences

What shipped:

- `getCareerSetupSummary` as a pre-career RPC with `error: Schema.Never`, handled beside
  `getClubSelection` in `rpcServer.ts` over a per-save SQLite layer.
- The Review step shows starting season, nations, per-depth competition bands with club counts,
  clubs, players generated, and staff, in a `<dl>` inside a region named "Generated world" — so
  every figure is announced with the term it belongs to.
- A failed read renders "World summary unavailable. Your career is ready to create." in a
  `role="status"` line. The configuration still renders and `Create Career` still commits, asserted
  directly rather than inferred.
- Empty depth bands are omitted by the server rather than sent as zero rows, so a one-nation scope
  says nothing about background football instead of claiming none of it.

What it costs:

- **A second round trip on entering Review.** Cheap (counts against a small file, one connection)
  but it is a real load state on a step that previously had none.
- **The staff line's non-zero branch is unreachable today.** It exists so the panel is not lying by
  construction, and it is covered by a test that commits the career and reads the summary again —
  which is the only way to reach it.
- **Two numbers on one panel describe the same thing at different times.** "League scope" is the
  pre-generation estimate; "Competitions" is the world. They can disagree, and that is the point,
  but the labels are carrying the distinction on their own.

## Related

- Ticket: `.scratch/add-manager-screen-7/issues/02-review-becomes-the-career-setup-summary.md`
- Spec §22: `docs/specs/group_a_application_shell_and_game_lifecycle_remaining/07_add_manager.md`
- The flow this sits at the end of:
  [The club selection is bound to the world it was picked from](2026-09-01-club-selection-bound-to-its-world.md)
- The provisional-world lifecycle the read hangs off: `apps/desktop/src/renderer/create/generation.ts`
