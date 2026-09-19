# Decision Request: How should a player's 1-10 match rating be computed?

## Question

[Ticket 10](issues/10-match-player-ratings-component.md) asks for a rating from 1 to 10 for each player
who took part in a match, derived from the match. No formula exists. Which inputs should it use, and
who decides the weights?

## Why this is blocking

A rating formula is a balance rule, and the contract says balance numbers are a design decision. The
choice also changes what the player sees on Screens 96 and 101: the same match produces different
ratings under each option below.

The Match Events give very little to work with per player
(`packages/game-engine/src/match/events.ts`). Only the scorer or shooter is named on Goal,
ShotOnTarget, ShotMissed and BigChance. Cards and Injury name the player who got them, and
Substitution names who went off and who came on. No event names a goalkeeper for a save, a defender
for a tackle, or an assist. A ForceOff (going down to 10 men) emits no event at all. A formula built
only from events therefore gives every goalkeeper and most defenders the same rating in every match.

## What is already settled

- Ratings are derived projections and are never persisted (note
  `2026-08-29-player-ratings-are-derived-projections`). A match rating is recomputed from the match
  stream, the way ticket 09's statistics are.
- Match simulation is seeded and replayed from its journal (note
  `2026-08-27-match-engine-three-phase-and-deterministic-seed`).
- Screens 96 §17 and 101 §17: ratings must not expose hidden event weights, unused substitutes get no
  rating, and dismissed and injured states are shown explicitly.
- CONTEXT.md has no term for this value yet. "Position Rating" and "Overall Rating" are taken, and
  "rating" on its own is ambiguous, so the answer also needs a CONTEXT.md term (for example
  **Match Rating**).

## Options

### Option A — Event-only rating

- **What the player experiences**: every participant starts at a base rating (say 6.0). Goals and
  shots move attackers up, cards move players down, and the result
  nudges everyone. Goalkeepers and defenders mostly sit at the base rating plus the result nudge.
- **What it costs to build**: a pure fold plus a small weight table in `packages/shared`. Ticket 10
  as written.
- **What it forecloses**: nothing; weights can change later.
- **Save compatibility**: none; the rating is derived.

### Option B — Event rating plus phase share of the result

- **What the player experiences**: Option A, plus each player's rating also reflects how their phase
  did (the Defense phase is credited for goals conceded or clean sheets, Attack for goals scored),
  using the kickoff formation slots already recorded in the match stream. Defenders' ratings vary
  from match to match.
- **What it costs to build**: Option A plus reading the phase of each formation slot and tracking
  substitutions into slots. It needs no engine change and no new randomness.
- **What it forecloses**: nothing.
- **Save compatibility**: none; derived, and it reads only what `MatchStarted` already stores.

### Option C — The engine records per-player involvement

- **What the player experiences**: ratings that reflect saves, tackles, key passes and assists.
- **What it costs to build**: new Match Event kinds or per-slice involvement tracking in the engine,
  commentary templates, and balance work. This is its own match-engine effort.
- **What it forecloses**: nothing, but it has the same seed problem as decision request 02 Option B:
  every existing seed replays differently if new events consume randomness.
- **Save compatibility**: an in-progress match started before the change replays a different
  timeline.

## Recommendation

Option B. It is the smallest rule under which a goalkeeper's rating means something, it needs no
engine change, and it stays a pure function of the stored stream. A human still has to set the base
rating and the weights, and name the term in CONTEXT.md.

## What is blocked, and what is not

- Blocked: all of ticket 10. Every one of its criteria renders or serves the rating.
- Proceeding meanwhile: ticket 11 (Match Report) and the other ready tickets in this effort.

---

## Answer — 2026-09-19

Settled with group-g request 02 under one rule: **a screen may derive from the stream; it may
not invent what the stream does not contain.** Recorded as
[the match model shows only what it produces](../../.agents/notes/proposed/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md).

**Option B**, with Option C sequenced behind it. A **Match Rating** is an event-derived rating plus a
share of the phase result, so a player who appears in no event still has a rating that means something.
Three things this fixes beyond the option text: it is a pure function of the **stored** timeline, so a
rating cannot drift between two reads; base and weights are named constants in one module rather than
scattered through a formula; and **Match Rating** is named in `CONTEXT.md`. Base is set at **6.0** and the
weights are documented tunables — they are balance numbers, and balance numbers get tuned by playing.

**Option C — the engine records per-player involvement — is the right end state and is newly safe.**
Before request 07 was answered it would have rewritten every saved match's ratings; after ticket 31 it
only affects new matches. The rating module is the seam that makes the swap invisible to the screens.

Decided under the human's standing delegation ("i need you to solve the decisions").
