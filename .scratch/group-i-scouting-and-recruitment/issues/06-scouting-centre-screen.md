# 06: Scouting Centre screen (Screen 118)

**What to build:** Replace the `ScoutingScreen.tsx` placeholder with the Scouting Centre: the Scout roster (reusing ticket 04's row), a coverage summary (reusing ticket 05's component), and links to Scouting Assignment and Scouting Knowledge.

**Decisions:**

- Group I v1 scope: 3 screens in scope, 11 deferred. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-15-group-i-v1-scope.md).

**Blocked by:** 04, 05

**Status:** resolved

- [x] Scouting Centre renders the Scout roster and the coverage summary from existing reads
- [x] Links to Scouting Assignment and Scouting Knowledge
- [x] Empty states for a club with no Scouts and for no scouting yet

## Answer

The `ScoutingScreen` placeholder on the `scouting` route is now the Scouting Centre: the Scout roster (`ScoutRosterRow` with no actions) from `getScouting`, the coverage summary (`ScoutingCoverageSummary`) from `getScoutingKnowledge`, and links to Scouting Assignment and Scouting Knowledge. Each read has its own loading, failure and empty state; "nothing scouted yet" is the summary's own. With 06 all three Group I v1 screens have shipped, so the scope note is promoted to `implemented/`. The repeated read-state code across five screens is filed as [08](08-shared-read-state-helper.md).

