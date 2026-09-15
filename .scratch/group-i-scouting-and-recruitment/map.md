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

## Not yet specified

- Whether recruitment surfaces (123, 127, 128, 129) belong to Group I or overlap Group J (transfers,
  contracts and negotiations), which has no effort yet.
- Which knowledge-limited rules (search and comparison through Attribute Ranges) need new shared
  projections rather than UI work.

## Out of scope
