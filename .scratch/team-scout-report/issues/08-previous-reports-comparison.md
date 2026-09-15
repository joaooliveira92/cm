# 08: Previous reports comparison

Type: task

**Follow-on (parked for a later session):** beyond the first tracer-bullet pass (tickets 01-06).

**What to build:** The Previous Reports tab becomes functional: the screen lists the target club's earlier reports and lets the manager compare the current report against a previous one, seeing how knowledge confidence, findings, key players, and predicted formation have changed between observations. Reports are keyed by stable report id, listed newest-first with a deterministic tie-breaker, and comparing is read-only. A report whose target club has changed competition mid-season still reads correctly (spec §19).

**Blocked by:** 06 (the report screen).

**Status:** resolved

- [x] The Previous Reports tab lists the target club's earlier reports, newest first, each keyed by a stable report id.
- [x] Selecting a previous report shows the differences from the current report (confidence, findings, key players, predicted formation).
- [x] Comparing is read-only and cancellation-safe: switching reports discards the in-flight previous-response.
- [x] A report from a season in which the club changed competition renders without error.

## Answer

Built on 2026-09-13, after the human asked to start decision request 01. The recommendation was
taken; see the request's Answer and the Agent Note
[Team Scout Report readings are kept when a Club watch ends](../../../.agents/notes/implemented/feature/2026-09-13-team-scout-readings-kept-when-a-watch-ends.md).

- **Storage and read.** `team_scout_readings` holds each whole reading, filed when a Club watch
  ends. `getTeamScoutReadings` lists them newest first, keyed by the stable report id. The primary key
  makes date order total, so no further tie-breaker is needed.
- **Tab.** Lists each reading's date, knowledge level and scout. Choosing one shows the changes since
  it: confidence, predicted formation, findings added and removed, key players added and removed, and
  ability ranges. Read-only.
- **Cancellation safety.** Choosing a reading is local state over a list already loaded, so switching
  starts no request that could land late. The list is shown only when it names the club the screen is
  aimed at.
- **Changed competition (spec §19).** A reading stores the whole encoded view and rendering it reads
  nothing else, so a later competition change cannot affect it. I tried to stage a competition move in
  a test world, but every competition already held the club, so this criterion rests on that
  construction rather than a dedicated test.

Proven by `apps/desktop/test/main/club/club-scouting.test.ts` (filing rules, newest first, never
rewritten), `apps/desktop/test/renderer/scouting/compare-reports.test.ts` (2 tests), and
`apps/desktop/test/renderer/scouting/previous-reports-panel.test.tsx` (2 tests).
