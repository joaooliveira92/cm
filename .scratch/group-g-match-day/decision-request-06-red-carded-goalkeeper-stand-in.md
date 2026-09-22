# Decision Request: Does a red-carded goalkeeper leave the team without a keeper, or drag an outfield player into goal?

## Question

When the only goalkeeper on the pitch is sent off, should an outfield player automatically move into
goal (as the engine already does when the last goalkeeper is severely injured or brought off), or
should the team play on with no goalkeeper until the manager makes a change?

## Why this is blocking

Found in review of [ticket 19](issues/19-substitution-picker-lists-the-tactic-not-the-pitch.md) and
carried into [ticket 26](issues/26-forced-substitution-picks-any-squad-player.md).

- `resolveCards` (`packages/game-engine/src/match/simulate/resolvers.ts`) removes a red-carded
  player's slot without `emptySlot`'s goalkeeper stand-in.
- `applyForcedOff`'s doc comment claims it "reuses the red path's `emptySlot`", which is false.

The two readings produce different match results, and choosing one changes the replay of saved
matches that hit the case, so an engineer should not pick one inside a bug fix.

## What is already settled

- CONTEXT.md: a Severe injury is forced off, substituted or the team plays with 10.
- The engine drags an outfield stand-in into goal when the last goalkeeper leaves through a severe
  Injury or a bring-off (`emptySlot`).
- Tickets 19 and 25 already model that stand-in in the pitch fold and the substitution counts.

## Options

### Option A — a red-carded keeper drags an outfield stand-in, like an injury

- **What the player experiences**: the team always has someone in goal. Consistent with injuries and
  bring-offs.
- **What it costs to build**: `resolveCards` calls the same stand-in path. The view already handles
  stand-ins. Saved matches with a keeper sent off replay differently.
- **What it forecloses**: a manager choosing which outfield player goes in goal.

### Option B — no automatic stand-in on a red card

- **What the player experiences**: the team concedes more easily until the manager substitutes a
  keeper on or rearranges.
- **What it costs to build**: fix only the `applyForcedOff` comment. Consider a prompt in the Match day
  panel.
- **What it forecloses**: consistency with the injury path.

## Recommendation

**Option A**, for consistency with the rule the engine already applies to the other two ways a
goalkeeper leaves.

---

## Answer — Option A, 2026-09-19

**A red-carded goalkeeper drags an outfield stand-in into goal, exactly as an injury or a bring-off
does.** One rule for all three ways a keeper leaves the pitch.

The give-away that the current behaviour is an oversight rather than a decision: `applyForcedOff`'s doc
comment already claims it "reuses the red path's `emptySlot`", which is false. The code believes the rule
it does not implement.

Option B — no automatic stand-in — was rejected on two counts. It applies a different rule to the same
situation depending on *why* the keeper left, which nothing justifies; and it makes the outcome depend on
whether the manager is watching, since a quick-result match has nobody to intervene.

This changes what a seed produces, so it is **gated on
[ticket 31](issues/31-committed-matches-store-their-timeline.md)** with the rest of the engine-rule work.

Ticket 30 already shipped the reporting half — the Match Report lists a stand-in as a **move into goal**
rather than a substitution — and that work was done under this reading and is now backed by it.

Recorded as
[a keeper leaving always drags a stand-in](../../.agents/notes/implemented/feature/2026-09-19-a-keeper-leaving-always-drags-a-stand-in.md).
Decided under the human's standing delegation ("i need you to solve the decisions").
