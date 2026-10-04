# 18: Match lines are written when a Matchday is committed

**What to build:** Committing a Matchday stores one Match Player Line per matchday-squad member for the
user's fixture and every squad-bearing AI fixture, in the same transaction as the results. Lines hold
counts and squad facts, never a rating or condition. Fixtures settled without squads get no lines.
Squad discard deletes a club's players' lines. The save schema version changes, so older saves are
refused with the existing mismatch error. The commit's error channel gains no new failure: a write
failure aborts the transaction like any other.

**Decisions:**

- A new `player_match_lines` table, one row per player per squad-bearing fixture, written in the Matchday's commit transaction for the user's fixture and every AI fixture alike; it stores counts, never a rating. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-10-03-player-match-lines-are-written-at-resolution.md).

**Blocked by:** 12

**Status:** resolved

- [x] After one commit, every squad member of every squad-bearing fixture has exactly one line; unused substitutes have started false and no on-minute.
- [x] The user's fixture's lines equal the fold of its stored timeline; an AI fixture's lines equal the fold of a same-seed re-simulation.
- [x] A failure inside the commit leaves neither results nor lines.
- [x] Squad discard deletes the lines, and its comment counts seven tables.
- [x] The DB schema gate passes with the generated migration; commit duration is measured before and after and recorded in the commit body.
