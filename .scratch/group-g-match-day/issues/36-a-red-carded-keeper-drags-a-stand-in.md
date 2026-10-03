# 36: A red-carded goalkeeper drags an outfield stand-in into goal

Split from [26](26-forced-substitution-picks-any-squad-player.md), 2026-09-21, orchestrator.

**What to build:** `resolveCards` removes a sent-off player's slot directly, so a red card to the only
goalkeeper leaves the team with no keeper. Route it through `emptySlot`
(`packages/game-engine/src/match/simulate/teamState.ts`) so an on-pitch outfield player moves into
goal as a stand-in, exactly as an injury or a bring-off already does. A red card uses no substitution.

**Decisions:** [decision request 06](../decision-request-06-red-carded-goalkeeper-stand-in.md), Option A,
recorded as [a keeper leaving always drags a stand-in](../../../.agents/notes/implemented/feature/2026-09-19-a-keeper-leaving-always-drags-a-stand-in.md).
It changes what a seed produces for matches with a red-carded last keeper; committed matches keep their
stored timeline ([31](31-committed-matches-store-their-timeline.md)).

**Blocked by:** None

**Status:** resolved

- [x] A red card to the last goalkeeper leaves an outfield stand-in in goal, and the Match Report lists it as a move into goal
- [x] A red card to an outfield player, or to a keeper with another on the pitch, is unchanged
- [x] A seeded test pins each; `pnpm check:all` green

## Comments

- 2026-09-21, orchestrator: while here, `forcePlayerOff` calls `normalizeGoalkeeper` whatever the slot, so
  an outfielder replacing an outfielder joins `gkStandIns` (found in 26's rework). Only Goalkeeping
  attributes are penalised, so it should not move a result; restrict it to goalkeeper slots if a seeded
  test confirms that.

## Answer

Resolved 2026-09-21. `resolveCards` now takes a sent-off player off through `applyForcedOff` / `emptySlot`,
so a red card to the last goalkeeper drags an on-pitch outfielder into goal, spending no substitution or
window; an outfield red, or a keeper red with another keeper on, is unchanged (same slot order, and
`emptySlot` draws no random numbers). `foldPitch` needed a real fix: it took the carded keeper off at the
card, so the stand-in's move found no slot. A RedCard now waits for an immediately following forced
Substitution of that player, as a severe Injury does. The Match Report lists the move as a
`GoalkeeperStandIn`. The comment's item is done too: `normalizeGoalkeeper` runs only for a goalkeeper
slot, which moves no result (a missing Goalkeeping attribute already reads as 1).

**Change note.** A re-derived (live, uncommitted) match replays differently only where the last keeper is
sent off, from that event on, score included (seed 506: 1-0 became 1-1, because the keeperless defence now
counts a gk=1 stand-in). Committed matches keep their stored timeline, and none reads differently: the old
engine could never emit a forced Substitution after a RedCard for the same player.

Known lows, left: between the RedCard line and the stand-in's line, the pitch still shows the sent-off
keeper, as with a severe Injury today; the stand-in's commentary uses the generic substitution template.
Note promoted: [a keeper leaving always drags a stand-in](../../../.agents/notes/implemented/feature/2026-09-19-a-keeper-leaving-always-drags-a-stand-in.md).
Report: [group-g-match-day](../../../.ai/reports/group-g-match-day.md).
