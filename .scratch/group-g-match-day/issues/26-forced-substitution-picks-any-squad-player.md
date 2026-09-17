# 26: A forced injury substitution can bring back a dismissed or already-used player

**What to fix:** `forcePlayerOff` (`packages/game-engine/src/match/simulate/teamState.ts`) chooses the
replacement with `[...team.playersById.keys()].find(id => not on the pitch)`. `playersById` follows
`setup.squad`, and `loadSquadPlayers(clubId)` has no `ORDER BY` and returns the whole club squad. The
replacement is simply the first squad player not on the pitch. That can be someone already sent off,
injured off or substituted, or someone outside the match-day squad. The commentary can then say a
sent-off player replaced an injured one.

Nothing in CONTEXT.md or Screen 97 spec §17 lets a dismissed player return, so this is a defect. The
wider question of whether a manager's substitution may use a non-bench player is
[decision request 04](../decision-request-04-who-may-come-on-as-a-substitute.md). Choose the forced
replacement consistently with its answer, and never from players who have already been on.

A related engine gap: a red card to the only goalkeeper leaves no goalkeeper (`resolveCards` removes
the slot without `emptySlot`'s stand-in). The `applyForcedOff` doc comment wrongly says it "reuses the
red path's `emptySlot`". Fix the comment here. Whether a red-carded goalkeeper should drag a stand-in
changes game behaviour, so it moved to
[decision request 06](../decision-request-06-red-carded-goalkeeper-stand-in.md) (2026-09-17, orchestrator).

Fixing this changes seeded match results for existing saves that hit the branch. State that in the
change. Found in review of [ticket 19](19-substitution-picker-lists-the-tactic-not-the-pitch.md).

**Blocked by:** None

**Status:** claimed

- [ ] A forced substitution never brings on a player who has already been on the pitch
- [ ] The replacement's selection is deterministic and independent of squad row order
- [ ] The `applyForcedOff` comment matches the code; the red-carded goalkeeper rule itself is [decision request 06](../decision-request-06-red-carded-goalkeeper-stand-in.md)
- [ ] A seeded test pins each, and the change note says which saved matches replay differently
