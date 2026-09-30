# 15: Team instruction effects

Type: grilling
Blocked by: 08
Status: resolved

## Question

For each of the nine Team Instructions and each value, fix its effect within [the engine framework note](../../../.agents/notes/proposed/architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md): which team
modifier or per-slot behaviour weight it moves, in which direction, and roughly how far relative to
the others (the absolute numbers are tuning constants). Include Closing Down's `default`, Men Behind
The Ball, Counter Attack, Zonal Marking and the Offside Trap's Offside-event and beaten-trap
mechanics, and how a Player Instruction override replaces the team value for one slot. The agent
drafts the table; the human approves or amends it.

## Answer

**Approved table.** Directions are fixed; sizes are relative (S/M/L) and the numbers are tuning
constants set against the calibration targets in
[the engine framework note](../../../.agents/notes/proposed/architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md).
Each effect is against the instruction's default.

| Instruction | Value | Effect |
|---|---|---|
| Mentality | ultra defensive → gung ho | Five steps. Each step toward attacking: attack-attempt rate and forward-run weight ↑ (M), defence strength ↓ (M). Ultra defensive also counts AM and F slots partly in defence out of possession. |
| Passing | short | possession retention ↑ (M), attempt rate ↓ (S), through-ball and cross weight ↓ (S) |
| | direct | attempt rate ↑ (S), through-ball and counter weight ↑ (M), retention ↓ (S) |
| | long | attempt rate ↑ (M), midfield partly bypassed in the attack roll, cross and hold-up weight ↑ (M), retention ↓ (L) |
| Focus Passing | both flanks / left / right | cross weight ↑ (M); creator weight to wide slots (or one side) |
| | through the middle | through-ball and hold-up weight ↑ (M); creator weight to central slots |
| Tackling | easy | fouls and cards ↓ (M), contact injuries ↓ (S), defence ↓ (S) |
| | hard | fouls and cards ↑ (L), contact injuries both ways ↑ (M), defence ↑ (S) |
| Closing Down | default | baseline, between stand off and own half only |
| | own half only | defence ↑ (S), fatigue ↑ (S) |
| | always | opponent retention ↓ (M), fouls ↑ (M), fatigue ↑ (L), opponent through-ball success ↑ (S) |
| Offside Trap | on | opponent through balls and forward runs end in `Offside` more (L), scaled by our defenders' positioning, teamwork and pace against the runner; a beaten trap becomes a one-on-one big chance (M) |
| Zonal Marking | on (off = man) | zonal: chance defence reads the team's positioning and teamwork average, fouls ↓ (S); man: each chance is defended by the nearest marker's tackling, strength and pace, stronger against weak finishers and weaker against strong ones, fouls ↑ (S) |
| Counter Attack | on | counter weight after a turnover ↑ (L), scaled by our forwards' pace against the opponent's; settled attempt rate ↓ (S); the bonus grows with the opponent's mentality |
| Men Behind The Ball | on | out of possession every slot counts partly in defence (L); attempt rate ↓ (M); counters stay slow unless Counter Attack is also on |

A Player Instruction override replaces the team value in that slot's behaviour vector only. No Agent
Note: the table is design detail under the framework note, and this answer is its record.
