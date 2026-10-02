# 01: Set-piece instructions reach the engine

Spec: [spec.md](../spec.md)

**What to build:** each slot's `setPieceRoles` travels with the slot into `MatchTactic` and the runtime team
state, and survives substitutions and tactic changes the way slot instructions do. No behaviour change.

**Acceptance:** the roles of every player on the pitch are readable at a corner and a free kick; seeded
matches produce identical events before and after.

**Blocked by:** None

**Status:** ready-for-agent
