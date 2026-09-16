# Decision Request: Does a mid-match Change Tactics replace the line-up, or only the Team Instructions?

## Question

When the manager changes tactics during a live match, should the command replace the whole on-pitch
line-up (today's behaviour), or change only the Team Instructions (Mentality, Tempo, Pressing) and
leave who is on the pitch to substitutions, red cards and injuries?

## Why this is blocking

Found in review of [ticket 07](issues/07-tactics-substitutions-ui.md). In
`packages/game-engine/src/match/simulate/teamState.ts`, a `ChangeTactics` command sets
`team.resolved = resolveTeamTactics(command.tactic)`, rebuilding all eleven slots from the command. A
red card or forced-off player removes a slot (`emptySlot`), so any later live tactics change puts a
dismissed player back on the pitch. The renderer cannot prevent this: no match response says who was
sent off. It is a game rule question, not a rendering one, and it changes a seeded outcome for any
save whose match journal holds a `TacticsChanged` after a dismissal.

## What is already settled

- Match commands are journaled and the match is re-derived from its seed and journal (note
  `2026-08-27-domain-bounded-deciders-and-chunked-resimulation`).
- The live panel and Screen 97 keep the formation fixed while the match is live; live adjustments are
  the three Team Instructions.
- Screen 97 spec §17: "Dismissed and injured-player constraints are explicit".

## Options

### Option A — Change Tactics carries Team Instructions only while live

- **What the player experiences**: a live tactics change never alters who is playing; dismissals stick.
- **What it costs to build**: a narrower live command payload or engine-side merge of instructions onto
  the current slots; renderer stops sending slots.
- **What it forecloses**: live formation changes, unless added later as their own command.
- **Save compatibility**: journaled `TacticsChanged` entries replay differently — any existing match
  with a tactics change after a dismissal re-derives a different result.

### Option B — Keep full tactics, but the engine drops players no longer eligible

- **What the player experiences**: the line-up can still be redrafted live; dismissed and forced-off
  players are filtered out, leaving the team short.
- **What it costs to build**: an eligibility filter in `applyCommand`; the question of how a filtered
  slot is filled needs its own answer.
- **What it forecloses**: nothing now, but it keeps two ways to change personnel live.
- **Save compatibility**: same replay change as A, for the same matches.

## Recommendation

Option A. The live UI already treats formation as fixed, substitutions already own personnel changes
and their caps, and it removes the whole class of resurrected-player bugs rather than patching one.

## What is blocked, and what is not

- Blocked: any claim that live tactics respect dismissals; spec §17's dismissed-player acceptance.
- Proceeding meanwhile: ticket 07 ships the screens with today's engine behaviour, and tickets 08–11.

## Evidence added 2026-09-16 (tickets 19 and 22)

The live head-count and both substitution pickers now come from a main-process fold (`pitch.ts`).
It assumes a live `ChangeTactics` does not change who is on the pitch, which is this request's Option
A. The engine still rebuilds all 11 slots. The disagreement is now visible to the player: after a red
card, the "Playing with 10 men — rearrange the remaining players in the tactics panel" alert stays
when the manager follows its advice, while the simulation is back to 11. Before ticket 22 the count
followed the engine, so the alert cleared, because the dismissed player had been put back on.
Answering this request settles both.
