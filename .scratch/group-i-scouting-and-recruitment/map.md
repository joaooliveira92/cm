# Map: Group I — Scouting and Recruitment

Label: `wayfinder:map`

## Destination

A reconciled spec covering all 14 Group I screens (118-131): scouting centre, player search, staff
search, scouting assignment, scouting priorities, recruitment focus, player shortlist, staff shortlist,
scouting knowledge, recruitment meetings, squad planner, transfer target comparison, agent and
intermediary information, trial and assessment. It states per screen what is already built, what is in
scope for v1, and in what order the in-scope screens get built.

## Notes

- Screen specs are copied into this directory (`00_group_i_index.md`, `118_*.md` to `131_*.md`).
- CONTEXT.md § Scouting defines Scout, Scouting Assignment, Scouting Progress, Attribute Range, Fully
  Scouted and Scouting Report. Use those terms; a spec's own wording does not override them.
- The [team-scout-report](../team-scout-report/) effort shipped a club-scoped Team Scout Report.
  Check it before treating any scouting surface as absent.
- Follow the [Group H](../group-h-training-and-player-development/map.md) precedent: inventory, then
  scope, then build sequence, then spec and tickets.

## Decisions so far

- [01 — Group I screen inventory survey](issues/01-screen-inventory.md): 0 built, 5 partial (four placeholder stubs and the assignment commands), 9 absent. The Scouting model behind the Team Scout Report exists; shortlists, focuses, priorities, meetings, planner, agents, trials and staff hiring do not. The transfer market shows exact figures for unscouted Players.
- [02 — Scope decision for missing systems](issues/02-scope-absent-screens.md): 3 screens in scope for v1 (118, 121, 126), 11 deferred. See [Agent Note: Group I v1 scope](../../.agents/notes/implemented/architecture/2026-09-15-group-i-v1-scope.md).
- [03 — Build sequence](issues/03-partial-screen-build-sequence.md): 1=Scouting Assignment, 2=Scouting Knowledge, 3=Scouting Centre. New Player targets wait for [decision request 01](decision-request-01-knowledge-limited-player-reads.md).
- [Spec published](spec.md): reconciled spec, handoff from charting to slicing.
- [Implementation tickets](issues/): 3 vertical slices (04-06); 06 blocked on 04 and 05. 07 added during 04.
- [04 — Scouting Assignment screen](issues/04-scouting-assignment-screen.md): shipped at `/scouting-assignment`. Club assignments take `expectedReportId` from the Club's `getTeamScoutReport`; a Club target reads "Tracked per Player".
- [07 — Typed RPC errors survive the IPC boundary](issues/07-typed-rpc-errors-survive-ipc.md): shipped. Found in 04: every typed error reached the renderer as `{ name: "Error" }`. `handleRpc` now encodes failures with the method's error schema.
- [05 — Scouting Knowledge screen](issues/05-scouting-knowledge-screen.md): shipped at `/scouting-knowledge`. One read, `getScoutingKnowledge`, gives per-Club coverage and Knowledge Confidence over the whole squad and per-Player Scouting Progress, with no figure. Knowledge Confidence now also reads live per Club (CONTEXT.md).
- [06 — Scouting Centre screen](issues/06-scouting-centre-screen.md): shipped on the `scouting` route, aggregating the Scout roster and coverage summary with links to 121 and 126. All three v1 screens shipped; follow-up [08](issues/08-shared-read-state-helper.md) extracts the read-state code repeated across five screens.
- [08 — One read-state helper for the scouting and training screens](issues/08-shared-read-state-helper.md): shipped. `readState` serves all five sites; `ReadStateMessage` serves three, since the Scouting Centre's section lines are not page messages.

## Not yet specified

None for v1. Knowledge-limited Player reads are a [decision request](decision-request-01-knowledge-limited-player-reads.md), not fog.

## Out of scope

- Screens 119 (Player Search) and 129 (Transfer Target Comparison): wait for decision request 01.
- Screens 120 (Staff Search) and 125 (Staff Shortlist): no staff hiring, and no roles beyond `coach` and `scout`.
- Screens 122 (Scouting Priorities), 123 (Recruitment Focus), 124 (Player Shortlist): each needs a new model.
- Screens 127 (Recruitment Meetings), 128 (Squad Planner), 130 (Agent and Intermediary Information), 131 (Trial and Assessment): each needs a new model and leans on Group J.
- Assignment duration, cadence, travel, priority, and competition, nation or region targets.
