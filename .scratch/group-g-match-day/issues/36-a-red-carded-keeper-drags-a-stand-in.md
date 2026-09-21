# 36: A red-carded goalkeeper drags an outfield stand-in into goal

Split from [26](26-forced-substitution-picks-any-squad-player.md), 2026-09-21, orchestrator.

**What to build:** `resolveCards` removes a sent-off player's slot directly, so a red card to the only
goalkeeper leaves the team with no keeper. Route it through `emptySlot`
(`packages/game-engine/src/match/simulate/teamState.ts`) so an on-pitch outfield player moves into
goal as a stand-in, exactly as an injury or a bring-off already does. A red card uses no substitution.

**Decisions:** [decision request 06](../decision-request-06-red-carded-goalkeeper-stand-in.md), Option A,
recorded as [a keeper leaving always drags a stand-in](../../../.agents/notes/proposed/feature/2026-09-19-a-keeper-leaving-always-drags-a-stand-in.md).
It changes what a seed produces for matches with a red-carded last keeper; committed matches keep their
stored timeline ([31](31-committed-matches-store-their-timeline.md)).

**Blocked by:** None

**Status:** ready-for-agent

- [ ] A red card to the last goalkeeper leaves an outfield stand-in in goal, and the Match Report lists it as a move into goal
- [ ] A red card to an outfield player, or to a keeper with another on the pitch, is unchanged
- [ ] A seeded test pins each; `pnpm check:all` green

## Comments

- 2026-09-21, orchestrator: while here, `forcePlayerOff` calls `normalizeGoalkeeper` whatever the slot, so
  an outfielder replacing an outfielder joins `gkStandIns` (found in 26's rework). Only Goalkeeping
  attributes are penalised, so it should not move a result; restrict it to goalkeeper slots if a seeded
  test confirms that.
