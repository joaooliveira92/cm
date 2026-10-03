# Event volume: individual events or tallies?

Type: grilling
Status: resolved
Blocked by: 02

## Question

A match today emits on the order of a hundred Match Events. Passes alone run to several hundred per
side. Are high-volume actions individual events (`Pass`, `Tackle`), or per-slice tallies per player
(one event carrying counts), or both, with individual events only for the notable ones? The answer
sets the size of every stored timeline, the cost of simulating every AI fixture each Matchday, the
cost of the live re-derivation on each command, and how the revealed-event cut behaves. Include a
measured budget: current timeline size and Matchday commit time, and the ceiling this effort may
reach.

## Answer

**Individual events, no tallies, under a measured budget of three times today's event count.**

Passes are ruled out ([02](02-record-or-simulate.md)), which removes the only statistic whose volume
would have forced tallies. What remains is modest enough to record one event per credited action, which
keeps every per-player figure a plain count of events and keeps the live cut exact.

**New event kinds** (fields beyond the usual minute, half, team club):

| Event | Fields | Credits |
|---|---|---|
| `Tackle` | `playerId` (defender who won the ball) | Tck won; Tck attempted = won + fouls |
| `Interception` | `playerId` | Int |
| `HeaderDuel` | `winnerId`, `loserId`, `attacking: boolean` (true when the winner is the header shooter) | Hea attempted for both, Hea won for the winner |
| `PossessionTally` | `homeSlices`, `awaySlices` (cumulative) | Possession ([04](04-recording-possession.md)) |

`Foul` gains optional `fouledPlayerId` ([07](07-naming-the-fouled-player.md)). The attacking header
shooter's attempt comes from the `HeaderDuel` he won, so the fold does not also count the shot-kind
rule; that rule stays the engine's way of deciding when to emit the duel.

**Baseline, measured 2026-10-03** on the current engine (200 seeded matches, the engine test fixtures'
4-4-2 squads): **59.8 events and 6.7 KB of JSON per match.** Per match: 14.6 `KeyPass`, 7.4
`ShotOnTarget`, 6.6 `ShotMissed`, 4.2 `Goal`, 3.6 `Foul`, 2.8 `Corner`, 1.3 `Offside`, the chance-type
events about 14 together.

**Expected additions per match:** tackles and interceptions at the credit rate tuned to the
calibration targets (10–13 tackles won and 8–12 interceptions per team per [05](05-cm-calibration-figures.md), so 36–50), defensive headers (a few, from corners and cleared
crosses), and `PossessionTally` at the end of each eventful slice (at most one per slice, about 40–50).
The fouled player is a field, not an event. Roughly 150–160 events and 16 KB per match, inside the budget below.

**Budget, asserted in the implementing tickets:**

- Event count per match at most 3× the baseline (≤ 180) averaged over 200 seeds; a test asserts it.
- A stored timeline's JSON at most 20 KB on average.
- Matchday commit time grows by at most 25%, measured before and after on a seeded save and recorded in
  the commit body. Every AI fixture simulates the same detail; there is no cheaper AI path, because
  `player_match_lines` folds AI timelines and needs the same events.

The volume risk retires the map's "AI-fixture cost" fog: AI fixtures take the full path, and the
commit-time budget above is the check.
