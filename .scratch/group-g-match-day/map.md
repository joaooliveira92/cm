# Map: Group G — Match Day and Match Review

Label: `wayfinder:map`

## Destination

A reconciled spec covering all 14 Group G screens (91-104) — match preview, team sheet, live match overview/commentary/statistics/ratings/tactics, half-time team talk, post-match summary/statistics/ratings/team talk, match report, incidents/review — stating per screen what is already built and what needs new surfaces.

## Notes

The match engine and several match screens are partially built. Match commentary, events, Condition, injuries, substitutions, and tactical commands exist. Full-screen match live view, half-time talk, post-match flow, and disciplinary review are not built.

Inherited from Group A: multiplayer, worker pools, telemetry, non-normative scaffolding.

## Decisions so far

- [01 — Group G screen inventory survey](issues/01-screen-inventory.md): 1 built, 8 partial, 3 absent (98/102 need morale model; 104 cut from v1)
- [02 — Scope decision for absent screens](issues/02-scope-absent-screens.md): 104 out of scope (cut from v1); 98/102 out of scope for Group G (deferred — require new domain model)
- [03 — Build sequence for 8 partial screens](issues/03-partial-screen-build-sequence.md): Priority order set; shared component pairs identified
- [04 — Team Sheet screen](issues/04-team-sheet-screen.md): Implemented. New `getTeamSheet` RPC + screens for both team lineups with formation and substitutes.
- [05 — Match Preview screen](issues/05-match-preview-screen.md): Implemented. Fixture context, recent form, head-to-head from existing fixture data.
- [06 — Standalone Commentary screen](issues/06-standalone-commentary-screen.md): Implemented. Commentary lines with polling for live updates.
- [07 — Tactics/Substitutions UI](issues/07-tactics-substitutions-ui.md): Implemented. Standalone live screens share one live tactic with the Match day panel; tab-bar reachability deferred to 13. Follow-ups: [12](issues/12-live-panel-controlled-club.md), [13](issues/13-mount-live-match-tab-bar.md), [decision request 01](decision-request-01-live-change-tactics-scope.md) (live Change Tactics scope).
- [08 — Post-Match Summary](issues/08-post-match-summary-enhancement.md): Implemented. `getPostMatchSummary` read RPC; summary shown only after the result is committed; fixed accepted results reverting to Accept result. Follow-ups: [14](issues/14-post-match-summary-penalties.md), [15](issues/15-full-time-session-lost-before-accept.md).
- [Spec published](spec.md): Reconciled spec marking handoff from charting to slicing.
- [Implementation tickets](issues/): 8 vertical slices (04–11), all unblocked.

## Not yet specified

None — all known decisions resolved, spec written, tickets sliced.

## Out of scope

- Screen 104 (Match Incidents and Disciplinary Review) — cut from v1 per CONTEXT.md.
- Screens 98/102 (Half-Time and Post-Match Team Talk) — require new morale/team-talk domain model; deferred to a future effort.
- Post-match flow — integration with Season Summary and Continue (Group H scope).