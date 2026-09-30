# 09: When a live tactical change takes effect

Type: grilling
Blocked by: 04, 08

## Question

A complete Tactic (formation, slot assignments, every instruction) may now change mid-match; the
bench and substitution rules stay as they are. Decide what a "valid stoppage or tactical application
boundary" is in this engine (today a live `ChangeTactics` applies only Team Instructions, at the
engine's chunk boundary), how a change queued between boundaries is held, and how a move of a
player to another slot interacts with substitutions made at the same stoppage. Confirm determinism:
a match with the same seed and the same changes at the same boundaries resimulates identically.
Supersedes the "mid-match only Team Instructions take effect" clause of **Tactic** in `CONTEXT.md`.
