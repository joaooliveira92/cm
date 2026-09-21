# Agent Note: The match model shows only what it produces

Status: proposed

Settles group-g decision requests 02 and 03. Both ask what a screen may show when the engine does not
produce it, and they get opposite answers for the same reason.

## Problem

The match engine's attacking phase ends every attack in exactly one of Goal, BigChance, ShotOnTarget or
ShotMissed, and rolls cards per defender. There is **no ball-possession model, no set-piece event, and
no foul or offside event**. The Match Event stream names the scorer or shooter, the player who got a
card or injury, and who went off and on in a substitution. Nothing else. A `ForceOff` emits no event at
all.

Two screens were specified against a richer model than exists:

- **Screens 95 and 100 (Match Statistics)** ask for possession, corners, fouls and offsides. Deriving
  them from the existing events would invent a statistical model (request 02).
- **Screens 96 and 101 (Player Ratings)** ask for a 1–10 rating per player. A formula built only from
  events gives every goalkeeper and most defenders the same rating in every match, because no event
  names a save, a tackle or an assist (request 03).

## Decision

**A screen may derive from the stream. It may not invent what the stream does not contain.**

That single rule answers both, differently:

### Statistics: the four stay unavailable

Possession, corners, fouls and offsides are **not shown, and are named as unavailable** rather than
computed, estimated or left blank. *(Request 02, Option A — already shipped in ticket 09.)*

Extending the engine to simulate them is a match-engine effort of its own, and until something in the
model depends on them the numbers would be decorative. This is the same ruling as Group L's **Unplayed**
fixture — an unplayed match gets no fabricated `0 - 0`, and an unsimulated statistic gets no fabricated
figure. Screen 95 §17 already said so: "Values unavailable to the match model remain unavailable."

### Ratings: derive from the result, do not invent per-player detail

A **Match Rating** is an event-derived rating *plus a share of the phase result*, so that a player who
appears in no event still has a rating that means something. *(Request 03, Option B.)*

The shape, which is the part a note can fix:

- It is a **pure function of the stored timeline** — the committed match's persisted events
  ([note](../../implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md)), not of a live re-derivation. A rating
  that drifts between two reads of the same match is worse than no rating.
- A player's rating is a documented **base** adjusted by their own events and by the phase outcomes
  their unit was on the pitch for. A goalkeeper's rating therefore moves with goals conceded while he
  played, which is a proxy — but an honest one, derived from the result rather than from an invented save
  count.
- **Base and weights live as named constants in one module**, not scattered through a formula, and
  **Match Rating** is named in `CONTEXT.md`. I am setting a base of **6.0** and leaving the weights as
  documented tunables with defaults; they are balance numbers, and balance numbers get tuned by playing,
  not by deciding once.

**Option C — have the engine record per-player involvement — is the right end state, and it is newly
safe.** Before [ticket 31](../../implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md), adding involvement
events would have rewritten every saved match's ratings. Once committed matches store their timelines it
only affects new matches. So: Option B now, Option C when the engine is next opened, and the rating
module is the seam that makes the swap invisible to the screens.

Decided by the agent on 2026-09-19 under the human's standing delegation ("i need you to solve the
decisions"). Request 02 adopts its own recommendation; request 03 adopts its recommendation and adds the
Option C sequencing, which only became available when request 07 was answered the same day.

## Alternatives considered

**Estimate the four statistics from shots and cards.** Rejected: a possession figure derived from shot
counts is a number with no referent, and it would be indistinguishable on screen from one the engine
produced.

**Show the four as blank or zero.** Rejected: zero is a claim. "Unavailable" is the honest word and the
spec already asked for it.

**Event-only ratings (request 03 Option A).** Rejected: it is not a weak rating, it is a wrong one —
every goalkeeper identical in every match is worse than no ratings screen, because it looks like
information.

**Extend the engine now for both (request 02 Option B, request 03 Option C together).** Tempting once
ticket 31 lands, and rejected only on sequencing: it is a match-engine effort that should be scoped as
one, not smuggled in behind two screens.

## Consequences

- Screens 95 and 100 ship as they are. Ticket 09's criterion naming the four statistics is **withdrawn**,
  not deferred.
- Screens 96 and 101 become buildable — they were the corpus's only `Parked` rows. The ticket depends on
  [ticket 31](../../implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md), since the rating must read a stored
  timeline.
- `CONTEXT.md` gains **Match Rating**.
- A follow-up is owed on the engine: per-player involvement events (Option C), plus possession and
  set-piece events if the four statistics are ever wanted. Both are safe after ticket 31 and unsafe
  before it.
