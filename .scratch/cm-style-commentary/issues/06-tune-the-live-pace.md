# 06: Tune the live pace

Spec: [spec.md](../spec.md)

**What to build:** measure how long a live match plays at each speed over simulated matches, and tune the
shipped delays or the default speed so a match at Normal plays in a time a player sits through.

**Acceptance:** the measured durations are recorded in the answer; a test pins the Normal duration range.

**Blocked by:** 02

**Status:** resolved

## Answer

Measured over 200 simulated matches with the shipped file (61.5 lines a match on average):

| Speed | Average | 10th to 90th percentile |
|---|---|---|
| Slow (x1.5) | 129 s | 87 s to 166 s |
| Normal (x1) | 86 s | 58 s to 110 s |
| Fast (x0.4) | 34 s | 23 s to 44 s |

Shots on target, shots missed and goals take about 60 % of the time. Kept as they are: Normal is a
minute and a half, close to CM's feel without dragging, and Fast is about the pace before playback
existed (35 s). Normal stays the default. `commentary-file.test.ts` pins the Normal average between 60 s
and 120 s, so a delay edit that drifts far is caught.
