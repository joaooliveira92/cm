# Map: Group D — Player and Staff Records

Label: `wayfinder:map`

## Destination

A reconciled spec covering all 19 Group D screens (50-68) — player profile, attributes, positions, form, statistics, history, contract, transfer status, happiness, injuries, discipline, development, action menu, comparison, staff profile/contract/history, coach report, and scout report — stating per screen what the implementation must do, and which screens are already satisfied by shipped code.

## Notes

**Domain**: local single-player football-management sim. Key glossary terms in CONTEXT.md that this group touches: **Attribute**, **Position**, **Position Rating**, **Overall Rating**, **Transfer Value**, **Contract**, **Free Agent**, **Injury** (match event), **Condition**, **Natural Fitness**, **Injury Proneness**, **Player Development**, **Training Focus**, **Scouting Progress**, **Attribute Range**, **Fully Scouted**, **Scout**, **Coach**, **Staff**, **Bound Staff**, **Presence Staff**.

**Skills every session should consult**: `grilling` and `domain-modeling` by default; `doc-standards` for anything written under `docs/`; `effect-code` for any session that touches source.

**The imported specs are not requirements.** All 19 files are the same generated template. Treat them as a reconciliation checklist.

**Several screens may already be satisfied by shipped work:**

- **Screen 61 (Player Development)** — Player Development, Training Focus, and the per-season step are modeled and built. See [deterministic Player Development](../../.agents/notes/implemented/feature/2026-08-28-deterministic-fractional-player-development.md).
- **Screen 56-57 (Contract/Transfer Status)** — Contract, Transfer Value, Bid, Free Agent are modeled. Screen 57 may be satisfied by existing transfers screens.
- **Screen 67 (Coach Report), Screen 68 (Scout Report)** — Scouting system exists. Coach Report may have no counterpart.
- **Screen 59 (Injuries)** — Match injury model exists as match events; a player injury history screen may not.

**Standing decisions inherited from Group A**: multiplayer/multi-manager axis is out of scope; worker pools and memory budgets out of scope; off-device telemetry out of scope; non-normative import scaffolding disposed.

## Decisions so far

<!-- one line per closed ticket -->

## Not yet specified

- Which screens are fully satisfied by existing code vs need new surfaces.
- Whether Staff screens (64-68) are in scope given Staff roles closed at four and no hiring/firing.
- The Coach Report screen has no known counterpart — may be entirely out of scope.
- Player Comparison (Screen 63) — no comparison mechanism exists.
- Player Happiness (Screen 58) and Player Discipline (Screen 60) — no morale/discipline system exists.
- Player Action Menu (Screen 62) — what actions are available per context.

## Out of scope

- **Multiplayer, network sessions, multiple human managers** — inherited from Group A.
- **Worker pools, memory budgets, resource tuning** — inherited from Group A.
- **Off-device telemetry, crash reporting** — inherited from Group A.
- **Non-normative import scaffolding** (Condensed LLM brief, Suggested Git commit) — inherited from Group A.