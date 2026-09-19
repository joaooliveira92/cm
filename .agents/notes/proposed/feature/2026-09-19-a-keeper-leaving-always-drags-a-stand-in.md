# Agent Note: A keeper leaving the pitch always drags a stand-in

Status: proposed

Settles group-g decision request 06.

## Problem

There are three ways a goalkeeper leaves the pitch mid-match, and the engine handles one of them
differently — by accident rather than by rule.

`emptySlot` moves an outfield player into goal when the last goalkeeper is severely injured or brought
off. `resolveCards` (`packages/game-engine/src/match/simulate/resolvers.ts`) removes a red-carded
player's slot **without** that stand-in step, so a team whose only keeper is sent off plays on with an
empty goal.

The give-away that this is an oversight: `applyForcedOff`'s doc comment claims it "reuses the red path's
`emptySlot`", which is false. The code already believes the rule it does not implement.

## Decision

**A red-carded goalkeeper drags an outfield stand-in into goal, exactly as an injury or a bring-off
does.** *(Option A.)*

One rule for all three exits, which is both the simpler rule and the one the engine's own comments
assume. A side reduced to ten men keeps a keeper; it loses an outfield player instead, which is what the
laws of the game and every manager's expectation produce.

This changes what a seed produces for any saved match where the last keeper was sent off, so it is an
**engine-rule change and gated on
[ticket 31](../architecture/2026-09-19-committed-matches-store-their-timeline.md)**.

Decided by the agent on 2026-09-19 under the human's standing delegation ("i need you to solve the
decisions"), adopting the request's recommendation.

## Alternatives considered

**No automatic stand-in on a red card (Option B)** — the team plays with an empty goal until the manager
acts. Rejected on two counts. It is a different rule for the same situation depending on *why* the keeper
left, which nothing justifies; and it makes the outcome depend on whether the manager is watching, since
a quick-result match has nobody to intervene.

**Make all three paths ask the manager.** Rejected: a severe injury already forces the substitution
without asking, and adding a prompt here would make the quick-result path diverge from the live one.

## Consequences

- `resolveCards` calls the same stand-in path as `emptySlot`, and `applyForcedOff`'s doc comment becomes
  true.
- Gated on ticket 31 with the rest of the engine-rule work.
- Ticket 30 already shipped the reporting half: the Match Report lists a goalkeeper stand-in as a **move
  into goal** rather than a substitution, and its incident list agrees with its substitutions statistic.
  That work was done under this reading and is now backed by it.
