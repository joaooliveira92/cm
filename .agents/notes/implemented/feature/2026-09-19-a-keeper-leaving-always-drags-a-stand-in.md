# Agent Note: A keeper leaving the pitch always drags a stand-in

Status: implemented

Settles group-g decision request 06.

## Problem

There are three ways a goalkeeper leaves the pitch mid-match, and the engine handles one of them
differently — by accident rather than by rule.

`emptySlot` moves an outfield player into goal when the last goalkeeper is severely injured or brought
off. `resolveCards` (`packages/game-engine/src/match/simulate/resolvers.ts`) removed a red-carded
player's slot **without** that stand-in step, so a team whose only keeper was sent off played on with an
empty goal.

The give-away that this was an oversight: `applyForcedOff`'s doc comment claimed it "reused the red
path's `emptySlot`", which was false. The code already believed the rule it did not implement.

## Decision

**A red-carded goalkeeper drags an outfield stand-in into goal, exactly as an injury or a bring-off
does.** *(Option A.)*

One rule for all three exits, which is both the simpler rule and the one the engine's own comments
assume. A side reduced to ten men keeps a keeper; it loses an outfield player instead, which is what the
laws of the game and every manager's expectation produce.

This changes what a seed produces for any saved match where the last keeper was sent off, so it is an
**engine-rule change and gated on
[ticket 31](../../implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md)**.

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

- `resolveCards` sends a red-carded player off through `applyForcedOff`, the bring-off's exit
  (`packages/game-engine/src/match/simulate/teamState.ts`): the slot empties, no substitution or window
  is spent, and a sent-off last goalkeeper drags an outfield player already on the pitch into goal at
  gk=1 (`emptySlot`). A red card to an outfielder, or to a keeper with another keeper on the pitch, only
  empties the slot, as before. `applyForcedOff`'s doc comment now says so. Shipped as group-g ticket 36.
- The drag emits the same forced `Substitution` (`forcedByInjury: true`) a bring-off's stand-in does.
  The flag means "forced", not "injured"; the event field keeps its name, and the read model already
  asks for the severe Injury before it wherever it means an injury.
- The read model needed one change. `classifySubstitutions` already classed any forced Substitution not
  right after a severe Injury as a stand-in, so it spends nothing, and the Match Report lists it as a
  **move into goal** ("moves into goal for", never "the injured") — ticket 30's reporting half, now
  backed by the engine. The pitch fold (`foldPitch` in `apps/desktop/src/main/match/pitch.ts`) took a
  red-carded player off at the card, which left the stand-in in their outfield slot; it now treats a
  red card like a severe Injury and lets the forced Substitution that follows move the stand-in into
  goal once revealed.
- It changes what a seed produces for a live, re-derived match in which the last keeper is sent off;
  nothing else moves. Committed matches keep their stored timeline (ticket 31), and a timeline stored
  before this change never holds a red card followed by a stand-in, so none reads differently.
- While here, `forcePlayerOff` flags a bench player as a goalkeeper stand-in only when he comes on in
  the goalkeeper slot. Flagging an outfielder in an outfield slot moved no result — a missing
  Goalkeeping attribute already rates 1 — so no seed moved.
