# Match engine runtime consumes resolved flat phase-slots, not Tactic

Type: task
Status: resolved

Blocked by: None (can start immediately)

## What to build

A match that resolves with an identical event timeline to today, but whose engine internals
no longer know what a formation or role is. Today the engine carries the full Tactic in its
per-team runtime and reads raw formation slots to pick who scores, who's booked, and who gets
injured (by hardcoded position names). This ticket closes the ADR-0002 boundary gap: at match
setup, each team's tactic resolves once into a flat, engine-owned shape that maps each on-pitch
slot to a phase (attack/midfield/defense), discarding formation/role vocabulary. Substitutions
swap a slot's player and keep its phase; a red card removes a player from the on-pitch set.
The five TacticalModifiers numbers plus that resolved shape are all the engine consumes.

## Acceptance criteria

- [ ] The engine runtime carries no reference to formation or role vocabulary anywhere; all tactic
      resolution happens once at the setup boundary.
- [ ] Event participant selection (attacking picks as well as discipline/injury picks) derives from
      the resolved phase shape, never from raw slots or hardcoded position names.
- [ ] Determinism is unchanged: the same seed plus commands produces byte-identical event timelines,
      including substitution, halftime, and red-card paths (existing tests pass without edits).

## Answer

Landed. Each tactic entering the engine (setup, and each mid-match `ChangeTactics`) resolves once,
at a new `resolveTeamTactics` boundary, into a flat engine-owned shape: `slots` as
`{ playerId, phase, fit }` dropping formation/role vocabulary, plus flat instruction multipliers.
Each slot's `fit` closure captures its Position/Role and rates whichever player occupies it, so
substitutions need no tactics knowledge. `TeamRuntimeState` carries only that resolved shape;
`pickPlayerId` selects event participants from the attack phase instead of hardcoded formation
positions. Red cards remove slots, substitutions swap a slot's `playerId`. Behavior verified
byte-identical to the pre-refactor engine across a 120-seed full-match sweep, three command
scenarios (incl. red-card + ChangeTactics + sub), and 40 seeds of phase/modifier parity with
on-pitch filters; the suite then turns green without edits.