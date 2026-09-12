# Agent Note: Team Scout Reports supersede the opponent-analysis cut

Status: implemented

## Problem

CONTEXT.md carried a flat exclusion — "Opponent analysis is cut from v1: no opponent-scouting or
pre-match report system exists" — parked inside the Tactical Acumen entry, and the Scouting section
enforced it from two directions: `Scouting Assignment` asserted "Only a Player is a valid target",
and `Scouting Report` was listed as an `_Avoid_` term on the grounds that it "implies a one-shot
document; this is an ongoing state, not a delivered artifact".

Screen 49 (Team Scout Report) is now in scope. Building it against that vocabulary would have meant
shipping a screen whose central noun the glossary forbids, and every downstream ticket would have
had to argue the point again from scratch. The exclusion had also drifted out of place: a claim
about which *systems* exist was being made inside the definition of a *Manager Pillar*, so a reader
looking for the scope of Scouting would never find it.

## Decision

Opponent analysis is in v1. A Scout may be assigned to watch a Club as well as a Player, and the
resulting Team Scout Report is a real, delivered artifact rather than a disallowed one.

Three constraints keep the new vocabulary consistent with the per-Player scouting that already
exists, and they are the reason this is a widening rather than a new subsystem:

1. **A Club target is shorthand for its squad.** Assigning a Scout to a Club advances the Scouting
   Progress of that club's Players under the same per-Player rules. There is no second accrual
   mechanism.
2. **No per-Club hidden value.** The original objection — "a Club carries no hidden value for
   Attribute Range to narrow" — was correct and survives. A report *aggregates* scouted knowledge of
   the club's Players; it never reads a hidden club-level number, because none exists. A Club with
   no scouted Players yields no report rather than an estimated one.
3. **A report cannot out-state its sources.** Nothing in a report gives an exact figure that the
   underlying Player's Attribute Range would withhold. Unknown stays Unknown.

The `_Avoid_: Scouting Report` entry is retired. Its stated reason was that "report" implies a
one-shot document while scouting is ongoing state — but that distinction turns out to be the useful
one rather than the fatal one, so the vocabulary now carries both nouns and names the difference: a
**Scouting Assignment** is the ongoing state, and a **Team Scout Report** is a dated, immutable
reading produced from it. Renewing takes a new reading alongside the previous ones rather than
rewriting one in place. Two supporting terms come with it, **Knowledge Confidence** (coverage) and
**Freshness** (calendar age), kept explicitly distinct because a report can be thoroughly scouted
and stale, or fresh and mostly gaps.

## What this supersedes in the persistence note

[Scouting persistence](../../proposed/architecture/2026-09-02-scouting-persistence.md) carries a section headed **"Assignments
target a Player, never a Club"**, which removed the Club target from CONTEXT.md in the first place.
Its argument was sound on its own terms and is worth restating rather than quietly reversing:

> A club has no fogged surface for scouting to reveal. […] there is no hidden club-level value […]
> so a club assignment would accrue progress against nothing readable. It would also consume one of
> the same N slots, making it a strictly worse use of a scout than any player assignment.

That note left one door open — "Club-scouting returns only if a hidden club-level value ships that
fog would be meaningful over." This decision does **not** walk through that door. No hidden
club-level value ships, and the note's premise is accepted in full: there is still nothing fogged at
the club level to narrow.

What the note did not anticipate is that a Club target need not have its own fog to be worth
assigning. Both of its objections are answered by aggregation rather than by a new hidden value:

- *"Accrues progress against nothing readable."* A Club assignment accrues progress against the
  club's **Players**, which are readable, under the existing per-Player rules. Nothing accrues at the
  club level. The Team Scout Report reads the resulting per-Player progress and summarizes it.
- *"A strictly worse use of a scout than any player assignment."* This is what changes. It was true
  when a Club target produced nothing; it is false once a Club target produces a report. A manager
  wanting breadth on an unfamiliar squad and a manager wanting depth on one signing target are now
  making a real trade rather than one obviously-correct choice.

The persistence note's storage decisions all survive unchanged and are the reason this is cheap: the
assignment primary key is `scout_id`, so a Club-targeted assignment still consumes exactly one scout
slot; `scouting_progress` stays sparse and keyed `(club_id, player_id)`; progress stays monotonic and
belongs to the club, not the manager. Two of its rules become load-bearing for the report rather than
incidental — a `results-only` club has no player rows and so cannot be scouted, which is precisely
the not-scouted state the report must return; and AI clubs hold no scouting state, so only the human
club's scouts ever produce reports.

That note stays in `proposed/`. Its persistence design has not shipped, so moving it to `rejected/`
would discard a live design over one revised section. This note is the record that the section is
superseded; nothing else in it is.

## Tactical Acumen keeps its non-binding

The Tactical Acumen entry says a Scouting binding "returns only if a surface ships that separates
what a Scout observed from what the manager concludes from it". The Team Scout Report is close
enough to that description to be worth ruling on explicitly rather than leaving for a later reader
to re-litigate: it is **not** such a surface. Its derivation is deterministic and reads no Pillar,
so a manager's Tactical Acumen changes nothing about a report's content. The entry now says so.
Only the "cut from v1" sentence was removed; the conditions under which a binding could return are
untouched.

This also settles what the CONTEXT.md clause was drifting from. It originated in
[Manager Pillar bindings in v1](../../proposed/feature/2026-08-29-manager-pillar-bindings-v1.md), which classifies fifteen candidate
Pillar effects as shipped, deferred, or cut and lists "opponent analysis" among the **cut** ones.
That classification is about *Pillar bindings*, and it still holds — no Pillar reads into opponent
analysis. What did not hold is the jump CONTEXT.md made from "Tactical Acumen has no
opponent-analysis binding" to "no opponent-scouting or pre-match report system exists", which
promoted a statement about one Pillar's reach into a statement about the game's scope. That note is
left as-is: read its "cut" entry as scoped to bindings, which is what it says.

## Alternatives considered

**Keep the cut and rename screen 49.** Ship the screen as a squad-list view of an opposing club and
avoid the word "report". Rejected: it preserves the letter of the vocabulary while building the
thing it excludes, which is worse than changing the vocabulary — the glossary would then be actively
misleading about what the game contains.

**Give a Club its own hidden values to scout.** Model club-level strength, morale, or tactical
tendency as hidden numbers that Scouting Progress narrows, symmetric with a Player's Attributes.
Rejected: it duplicates the accrual machinery, creates a second thing that can be Fully Scouted, and
introduces a way for a club-level reading to contradict the per-Player readings underneath it.
Aggregation has none of those problems.

**Leave the note in `proposed/` until screen 49 ships.** Rejected: the vocabulary change *is* the
shipped artifact here. Tickets 02-08 depend on the terms being settled, and a proposed-status
glossary would leave each of them re-deciding the same question.

## Consequences

- CONTEXT.md's Scouting section gains `Team Scout Report`, `Scouting Report`, `Knowledge Confidence`,
  and `Freshness`; `Scout` and `Scouting Assignment` admit a Club target; the `_Avoid_: Scouting
  Report` entry is gone, replaced by an `_Avoid_` against scouting a formation or tactic directly.
- A report has an **observed half and a predicted half**, and the glossary keeps them apart. The
  observed half is never wrong, only partial. The predicted half — likely shape, set-piece
  tendencies — is inferred from the target's public results and performances and may be wrong, per
  spec §16. A report never reads the target's own tactical record: spec §8 lists tactical information
  among the things requiring explicit permission, so scouting must infer it rather than unlock it.
  This is why `Knowledge Confidence` avoids "accuracy" — that word conflates the two halves.
- The Tactical Acumen entry no longer asserts the v1 cut and instead records why the report is not a
  Pillar-binding surface.
- Constraint 2 is the load-bearing one for tickets 02-06: it is why the wire shape carries
  `knowledgeConfidence` and a not-scouted failure state rather than a club rating, and why the
  derivation in ticket 03 is a pure function over squad knowledge with `R = never`.
- The `world-data-model` map's **Out of scope** list no longer carries "Scouting a Club rather than a
  Player" as a permanent exclusion; the entry is struck through and points here. That list is meant
  to hold permanently-ruled-out items, so leaving a reversed one in it is worse than an edit.
- No source, contract, or schema file changed with this note. The glossary therefore describes a Club
  target the running code cannot yet accept: `packages/contracts/src/rpc.ts` types `assignScout` as
  `{saveId, scoutId, playerId}` with a `PlayerNotFoundError`, which admits no Club.

## Left open

Three things this decision touches but does not settle. They are recorded here so the next session
finds them rather than rediscovering them:

- **The Club-target command is unticketed.** Tickets 02-06 build the *read* path only — the report
  shape, its derivation, its RPC, its route, its screen — all of which work off Scouting Progress
  that a Player-targeted assignment already produces. Nothing in 02-06 widens `assignScout`, and
  ticket 07, which would, is parked as a follow-on. So the first slice ships a report about a Club
  the manager cannot yet point a Scout at as a Club. That is coherent as a tracer bullet, but it is
  not what a reader of the glossary alone would assume, and the widening needs its own ticket.
- **The technical contract still models assignments per Player.**
  [Scouting technical contract](../../proposed/architecture/2026-08-28-scouting-technical-contract.md)
  specifies `scouting_assignments (clubId, playerId)` and an `AssignScout(playerId)` that rejects at
  the Stature-Tier scout cap. Taken literally, a Club target expands into N player rows against an
  N-slot cap and would exhaust it instantly — contradicting the one-Scout-per-assignment rule this
  note asserts. The [persistence note](../../proposed/architecture/2026-09-02-scouting-persistence.md)'s
  later `scout_id` primary key is the shape that makes one-slot-per-Club-target work. Both notes are
  `proposed`; whichever ships must carry the Club target on the assignment row, not fan out into it.
- **Club and Player assignments can collide on the same Player.**
  [Scout resource and assignment model](../../proposed/feature/2026-08-28-scout-resource-and-assignment-model.md)
  forbids stacking two Scouts on one target. A Club assignment advances every squad member, so it
  overlaps any existing Player assignment on one of them. Nothing rules on whether that is a
  rejection, a no-op on the overlapping Player, or simply permitted because progress is monotonic and
  the double-count is harmless. Monotonic progress makes the third option most likely correct, but it
  needs deciding before either assignment path ships.
