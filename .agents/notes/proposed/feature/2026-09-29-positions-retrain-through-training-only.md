# Agent Note: Line and side ratings change only through retraining

Status: proposed

## Problem

Players now store CM 03/04's Line and Side Ratings (see
[Players store CM 03/04's line and side ratings](../architecture/2026-09-29-players-store-cm-line-and-side-ratings.md)).
Something has to decide whether those ratings ever change. CM 03/04 let a manager retrain a
player's position or side; whether ratings also grew from playing in a position, or decayed from
disuse, is not documented for CM 03/04 (see the
[positional research](../../../../docs/research/player-positional-model-cm0304-positional-fields.md)).

## Proposal

The manager may set one retraining target per player: a line or a side. That rating rises gradually
once per Microcycle (at the human club's Matchday commit; the calendar has no weeks), faster for younger and more determined players; the rate is a
tuning constant. Nothing decays from disuse, and ratings do not grow from match minutes. Retraining
belongs to training, not to the end-of-season Player Development pass.

## Alternatives considered

- **Growth from playing in a position.** Rejected for now: unverified for CM 03/04, and it would make
  every selection a hidden development decision.
- **Decay from disuse.** Rejected for now: unverified, and it punishes squad rotation.
- **No change at all.** Rejected: CM had retraining, and without it a player's positions are fixed
  for life.

Either rejected mechanism may be added if later research shows CM 03/04 had it.

## Acceptance criteria

- A player with a retraining target gains in that rating over Microcycles of training and in no other.
- A player without one keeps identical positional ratings through a season.

## Risks

- A fast rate would let managers convert anyone to anything; the rate needs tuning against a season.
