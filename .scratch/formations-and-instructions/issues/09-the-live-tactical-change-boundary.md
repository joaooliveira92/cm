# 09: When a live tactical change takes effect

Type: grilling
Blocked by: 04, 08
Status: resolved

## Question

A complete Tactic (formation, slot assignments, every instruction) may now change mid-match; the
bench and substitution rules stay as they are. Decide what a "valid stoppage or tactical application
boundary" is in this engine (today a live `ChangeTactics` applies only Team Instructions, at the
engine's chunk boundary), how a change queued between boundaries is held, and how a move of a
player to another slot interacts with substitutions made at the same stoppage. Confirm determinism:
a match with the same seed and the same changes at the same boundaries resimulates identically.
Supersedes the "mid-match only Team Instructions take effect" clause of **Tactic** in `CONTEXT.md`.

## Answer

**The complete Tactic uses the existing live-command boundary: it applies at the start of the first
unseen minute (M+1), or at the break for a half-time change, with no separate stoppage concept.** A
live `ChangeTactics` is validated on submit against the revealed pitch (sent-off players cannot be
assigned; ten men leave a slot empty); substitutions at the same boundary apply first, then the slot
layout. Replaying the seed and journaled commands reproduces the match. No Agent Note: this extends
the existing command-timing rule in `game-engine/match/commandTiming.ts` to the complete Tactic.
