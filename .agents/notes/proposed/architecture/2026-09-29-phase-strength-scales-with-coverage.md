# Agent Note: Phase Strength scales with how many players cover the phase

Status: proposed

## Problem

A phase's strength was the average rating of its slots, so three strikers were no stronger than one
and a back two defended like a back four. With 29 CM presets ranging from 5-4-1 to 2-3-5, averaging
makes most of them play alike.

## Proposal

Phase Strength becomes the average rating × a coverage factor for the number of players counted in
the phase: 1.0 at a normal count (four in defence, four in midfield, two in attack), rising with
diminishing returns above it and falling below it. A separate width coverage, from players in wide
columns, scales how well a phase produces and defends crosses. Players count in their run target's
row while their team has the ball and in their base row otherwise; running players tire slightly
faster. The out-of-position factor on decision-making and positional attributes is 1.0 at
suitability 20, falls gently to about 0.9 at 15, then steeply (about 0.7 at 10, 0.5 at 1). The curves'
shapes are fixed here; their points are tuning constants.

## Relationship to existing notes

Refines [the engine framework note](2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md)
and the three-phase match engine note's Phase Strength definition, which it supersedes in part when
it ships.

## Alternatives considered

- **Keep averages.** Rejected: shape stops mattering.
- **Sum ratings.** Rejected: an eleventh defender would always help, and shapes with many players in
  one phase would dominate without limit.

## Acceptance criteria

- Directional tests: adding a player to a phase raises it, with a smaller gain each time; removing
  one lowers it.

## Risks

- The normal counts bias the game toward 4-4-2-like balance; that is a tuning choice.
