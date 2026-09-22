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
- [09 — Match Statistics](issues/09-match-statistics-component.md): Implemented. `getMatchStatistics` projection; live totals cut by revealed-event count; possession/corners/fouls/offsides unavailable pending [decision request 02](decision-request-02-unsimulated-match-statistics.md). Follow-up: [16](issues/16-live-commands-stamped-by-revealed-minute.md).
- [10 — Match Player Ratings](issues/10-match-player-ratings-component.md): Parked, not built. No rating formula exists and the Match Events name no goalkeeper or defender contribution; inputs and weights await [decision request 03](decision-request-03-match-player-rating-formula.md).
- [11 — Match Report](issues/11-match-report-screen.md): Implemented. `getMatchReport` read, refused until the result is committed; route carries `matchId`; embeds full-match statistics. Follow-up: [17](issues/17-stoppage-minutes-read-as-second-half.md).
- [13 — Mount live-match tab bar](issues/13-mount-live-match-tab-bar.md): Implemented. `SecondaryNav` mounted in `CareerShell`; flat `match-*` routes detected by parser; tab-to-destination mapping covers all match contexts. Follow-up: none.
- [Spec published](spec.md): Reconciled spec marking handoff from charting to slicing.
- [Implementation tickets](issues/): 8 vertical slices (04–11), all unblocked.
- [32 — Saves need a migration path](issues/32-saves-need-a-migration-path.md): resolved 2026-09-21.
  Saves are disposable during development: a save is stamped with a DDL-derived `SAVE_SCHEMA_VERSION`
  and `loadSave` refuses any other with `SaveSchemaMismatchError`, proved against a real 2026-09-02
  save. [31](issues/31-committed-matches-store-their-timeline.md) is unblocked and needs no backfill.
- [31 — A committed match stores its timeline](issues/31-committed-matches-store-their-timeline.md):
  resolved 2026-09-21. One `MatchTimelineRecorded` event on the match stream, appended in the commit
  transaction; report, summary and statistics load it, a live match re-derives. Proved by flipping a
  mocked engine rule after commit. Unblocks 26 and 29; the restart message split out as
  [33](issues/33-a-restarted-live-match-says-so.md).
- [29 — Substitution windows are keyed by half and minute](issues/29-substitution-windows-share-a-minute-across-halves.md):
  resolved 2026-09-21. A first-half stoppage forced Substitution and a second-half one at the same
  minute now spend two windows; engine and view agree. Only re-derived (live) matches replay differently.
- 2026-09-21, orchestrator: [26](issues/26-forced-substitution-picks-any-squad-player.md) re-blocked on
  [34](issues/34-ai-clubs-name-a-bench.md). Decision request 04 makes the named bench the only source of
  substitutes and no AI club names one. [35](issues/35-manager-substitutions-come-from-the-bench.md) and
  [36](issues/36-a-red-carded-keeper-drags-a-stand-in.md) slice decision requests 04 and 06.
- 2026-09-21, orchestrator: [33](issues/33-a-restarted-live-match-says-so.md) re-blocked on
  [37](issues/37-match-day-resumes-a-started-match-after-a-restart.md). A started, uncommitted match cannot
  be reopened after an app restart: Match day never reads `pending.matchId` and `startMatch` refuses, so
  the career is stranded rather than replaying from kickoff as 31 and decision request 05 assumed.
- [34 — AI clubs name a bench](issues/34-ai-clubs-name-a-bench.md): resolved 2026-09-21. A spare
  Natural-tier goalkeeper first, then by Position Rating. Unblocks [26](issues/26-forced-substitution-picks-any-squad-player.md).
  Review split out [38](issues/38-pure-packages-sort-without-locale.md) (locale-free sorting in the pure packages).
- [26 — A forced substitution comes from the named bench](issues/26-forced-substitution-picks-any-squad-player.md):
  resolved 2026-09-21. Never-on bench players only, like for like first, then bench order; none left →
  10 men. Review split out [39](issues/39-an-empty-bench-is-flagged-before-kickoff.md) (empty-bench advisory).
- [35 — A manager's substitution comes from the bench](issues/35-manager-substitutions-come-from-the-bench.md):
  resolved 2026-09-21. Off-bench and re-entry refused; the picker lists the kickoff bench minus been-on. The
  bench is fixed at kickoff. Decision request 01's line-up half filed as
  [40](issues/40-a-live-change-tactics-changes-only-instructions.md).
- [36 — A red-carded keeper drags a stand-in](issues/36-a-red-carded-keeper-drags-a-stand-in.md):
  resolved 2026-09-21. One rule for every way a keeper leaves; decision request 06's note is implemented.
- [37 — Match day resumes a started match after a restart](issues/37-match-day-resumes-a-started-match-after-a-restart.md):
  resolved 2026-09-21. `getAwaitingMatch` reads the started match back; the feed replays from kickoff.
  Unblocks 33. Review split out [41](issues/41-accepting-a-result-refreshes-the-season-read.md) and
  [42](issues/42-quick-result-skips-the-live-reveal.md).

## Not yet specified

None — all known decisions resolved, spec written, tickets sliced.

## Out of scope

- Screen 104 (Match Incidents and Disciplinary Review) — cut from v1 per CONTEXT.md.
- Screens 98/102 (Half-Time and Post-Match Team Talk) — require new morale/team-talk domain model; deferred to a future effort.
- Post-match flow — integration with Season Summary and Continue (Group H scope).