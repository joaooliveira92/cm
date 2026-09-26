# Agent Note: The Performance Report shows what it can prove

Status: proposed

Settles group-h decision requests 01 and 02. Both are about Screen 113, and both are cases of a screen
promising more than the data behind it supports.

## Problem

**"Coach rating" names two different things** (request 01). The Group H spec says Screen 113 shows
"coach rating"; the same spec calls the **Coach**'s 1–20 value a "quality rating" when describing Screen
111; the screen spec lists "coach ratings" beside attendance and unit ratings, which reads as a rating
*of the player*; and the stub being filled is called `PlayerCoachReportScreen`, which leans the same way.
A rating the Coach gives this player does not exist in any model.

**The report cannot show a player's first Season** (request 02). `PlayerDeveloped` stores only the
outcome Attributes (`main/club/development.ts`) and no table keeps a starting snapshot, so the report can
only diff one concluded Season against the previous one. In a new career it shows no progress at all
until Season 2 concludes, which reads as broken rather than as empty.

## Decision

### Coach quality, and say so

The field shows the **club Coach's quality** — the same 1–20 value Coaching Assignments shows — and is
**labelled "Coach quality", not "coach rating"**. *(Request 01, Option A.)*

This is a true statement about the player's training: the Coach's quality drives this player's baseline
development, so it belongs on a report about that development. The relabel is the load-bearing half of
the decision. "Coach rating" beside a player's name reads as a judgment of the player, and the whole
reason this request existed is that two readers of the same spec read it two ways. A rating the Coach
gives the player is a post-v1 feature and needs a model before it needs a screen.

### `PlayerDeveloped` carries its baseline

New `PlayerDeveloped` events record the player's Attributes **before** that Season's development as well
as after. *(Request 02, Option A.)*

It is a small, backward-compatible payload addition. Two things it does not do, which must be visible
rather than assumed:

- **It cannot be backfilled.** The pre-development Attributes of an already-recorded Season are gone —
  not expensive to recover, genuinely absent. Existing saves keep their blind first Season.
- **So the report needs an explicit no-comparison state**, not an empty table, for any Season whose event
  predates this change. Ticket 08 already established that pattern for the Development Centre's
  no-comparison case; Screen 113 uses the same one.

Decided by the agent on 2026-09-19 under the human's standing delegation ("i need you to solve the
decisions"), adopting both recommendations.

## Alternatives considered

**A coach's rating of the player (request 01 Option B).** Rejected for v1: nothing generates it, and
inventing a number for a coach's opinion is the same error as inventing possession — see
[the match model shows only what it produces](../architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md).

**Drop coach rating from Screen 113 entirely (Option C).** Reasonable, and rejected narrowly: Coach
quality is genuinely relevant to a training report, and the confusion was in the label rather than the
content.

**Keep outcome-only events (request 02 Option B)** and accept a blind first Season forever. Rejected: it
makes every new career's report look broken for a full Season, and the fix gets no cheaper by waiting —
every Season that concludes before it lands is another Season that can never show its changes.

**Snapshot Attributes into a separate table instead of the event payload.** Rejected: a second source of
truth for the same fact, when the event is already the record of the change.

## Consequences

- Screen 113's `needs-info` status clears; both open rows in the
  [Group H ledger](../../../../docs/specs/group_h_training_and_player_development/RECONCILIATION.md) close.
- An event payload change, which is a persistence decision — new events only, no migration needed to
  read old ones, and an explicit no-comparison state for Seasons recorded before it.
- The label "Coach quality" should be used on Screen 111 too, so one value has one name.
