# Decision Request: Should the match model simulate possession, corners, fouls and offsides?

## Question

[Ticket 09](issues/09-match-statistics-component.md) asks the statistics projection to compute
possession, corners, fouls and offsides. The match engine produces none of them. Should the engine be
extended to simulate them, or do the Match Statistics screens show only what the model simulates?

## Why this is blocking

The engine's attacking phase ends every attack in exactly one of Goal, BigChance, ShotOnTarget or
ShotMissed, and cards are rolled per defender (`packages/game-engine/src/match/simulate/resolvers.ts`).
There is no ball-possession model, no set-piece event and no foul or offside event. Deriving these
numbers from the existing events would invent a statistical model, and Screen 95 §17 says "Values
unavailable to the match model remain unavailable". Adding them to the engine changes what a seed
produces, which is a game-design decision.

## What is already settled

- Match simulation is seeded and replayed from its journal (note
  `2026-08-27-match-engine-three-phase-and-deterministic-seed`).
- Statistics derive from the one Match Event stream (Screen 95 §8, §17).

## Options

### Option A — Keep the model; the screens name these four as unavailable (shipped in ticket 09)

- **What the player experiences**: goals, attempts, shots on/off target, big chances, cards, injuries
  and substitutions, with a line naming the four statistics that are not tracked.
- **What it costs to build**: nothing further.
- **What it forecloses**: nothing; the view already lists them separately.
- **Save compatibility**: none.

### Option B — Extend the engine with possession and set-piece/foul/offside events

- **What the player experiences**: the full familiar statistics panel.
- **What it costs to build**: a possession model and new Match Event kinds, commentary templates, and
  balance work; ticket 09's aggregation adds rows.
- **What it forecloses**: nothing, but every existing seed replays differently if new events consume
  randomness.
- **Save compatibility**: a match started before the change replays a different timeline — needs a
  stream version or a rule that in-progress matches keep the old engine.

## Recommendation

Option A for now. The numbers would be decorative until something in the model depends on them, and
Option B is a match-engine effort of its own rather than a statistics ticket.

## What is blocked, and what is not

- Blocked: ticket 09's criterion listing possession, corners, fouls and offsides.
- Proceeding meanwhile: ticket 09 ships every statistic the model backs; tickets 10–11.

---

## Answer — 2026-09-19

Settled with group-g request 03 under one rule: **a screen may derive from the stream; it may
not invent what the stream does not contain.** Recorded as
[the match model shows only what it produces](../../.agents/notes/proposed/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md).

**Option A.** Possession, corners, fouls and offsides stay **unavailable** and are named as such — not
computed, not estimated, not blank. Zero is a claim. This is the same ruling as Group L's **Unplayed**
fixture: an unsimulated value gets no fabricated figure. Ticket 09's criterion naming the four is
**withdrawn**, not deferred.

Extending the engine is a match-engine effort of its own, and safe only after ticket 31.

Decided under the human's standing delegation ("i need you to solve the decisions").
