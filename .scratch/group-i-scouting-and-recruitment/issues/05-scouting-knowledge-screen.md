# 05: Scouting Knowledge screen (Screen 126)

**What to build:** A Scouting Knowledge screen with a Club view and a Player view of what the manager's club has scouted. A new read-only RPC over `scouting_progress` returns, per Club with scouted Players, the number scouted, `squadCoverage` and Knowledge Confidence; and per scouted Player, name, Club and Scouting Progress. It returns no Attribute, Attribute Range or Transfer Value, and never lists own-squad Players.

**Decisions:**

- Group I v1 scope: 3 screens in scope, 11 deferred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-i-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] New read returns per-Club coverage and Knowledge Confidence and per-Player Scouting Progress, with an RPC roundtrip test
- [ ] A save with no scouting reads as empty, not an error; own-squad Players never appear
- [ ] Coverage summary is a component reusable on Screen 118
