# 17: player_match_lines gain the new counts

**What to build:** The `player_match_lines` table (created by [match-screen 18](../../match-screen-cm-layout/issues/18-match-lines-written-at-matchday-commit.md))
gains nullable count columns for tackles, interceptions, headers attempted and won, and fouls suffered.
Because the columns are DDL, `SAVE_SCHEMA_VERSION` moves and older saves are refused with the existing
mismatch error; pre-change rows read "-". Counts only, never a rating. If the line table has not shipped
when this lands, its columns are added to match-screen ticket 18 instead.

**Decisions:**

- Player match lines are written at resolution; nullable new counts, schema bump, old data "-".
  See [ticket 10](10-saves-and-in-progress-matches.md) and [Agent Note](../../../.agents/notes/proposed/architecture/2026-10-03-player-match-lines-are-written-at-resolution.md).

**Blocked by:** 14, [match-screen 18](../../match-screen-cm-layout/issues/18-match-lines-written-at-matchday-commit.md)

**Status:** resolved

- [x] Committed lines carry the new counts; the save schema version moves with its migration.
- [x] Pre-change rows read "-".
