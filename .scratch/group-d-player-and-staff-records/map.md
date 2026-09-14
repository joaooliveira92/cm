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

- [01 — Screen inventory](issues/01-screen-inventory.md): All 19 screens surveyed. All dedicated player/staff routes exist as WIP placeholders registered during Group A reconciliation — none show real data because no player-read RPCs exist. Screens 51 (Attributes), 52 (Positions), and 61 (Development/Training Focus) are partially satisfied by inline squad-table display. Screens 58 (Happiness), 60 (Discipline), 63 (Comparison), 54 (Statistics), 57 (Transfer Status), and 62 (Action Menu) have no modeled data.
- [02 — Staff screens scope](issues/02-staff-screens-scope.md): All five staff screens (64-68) disposed. Screens 64-66 (Staff Profile, Contract, History) out-of-scope per closed role set. Screen 67 (Coach Report) out-of-scope — no counterpart. Screen 68 (Player Scout Report) deferred — Team Scout Report exists, player-level scouting is inline via Attribute Ranges.
- [03 — Missing systems disposition](issues/03-missing-systems-disposition.md): Screens 58 (Happiness), 60 (Discipline), 63 (Comparison) out-of-scope — none of these systems exist. Screen 62 (Action Menu) deferred — actions exist through specific surfaces but no unified menu.

## Not yet specified

- **Which in-scope screens need dedicated surfaces vs are satisfied by inline display.** Screens 51 (Attributes), 52 (Positions), 61 (Development raise through Training Focus) are readable in the squad table — do they need dedicated screens? The WIP route stubs suggest they were expected.
- **Remaining screens' disposition**: 50 (Profile), 53 (Form), 54 (Statistics), 55 (History), 56 (Contract), 59 (Injuries) — all have WIP route stubs but no data model. In scope or out?
- **Whether the WIP placeholder routes are harmful** (dead UX paths a player can reach with a blank screen) vs acceptable scaffolding.
- **What minimal RPCs and data models the in-scope screens need** — design decision for the remaining surfaces.

## Out of scope

- **Multiplayer, network sessions, multiple human managers** — inherited from Group A.
- **Worker pools, memory budgets, resource tuning** — inherited from Group A.
- **Off-device telemetry, crash reporting** — inherited from Group A.
- **Non-normative import scaffolding** (Condensed LLM brief, Suggested Git commit) — inherited from Group A.
- **Staff Profile / Contract / History (screens 64-66)** — out of scope per closed role set and no contracts.
- **Coach Report (screen 67)** — out of scope, no counterpart exists.
- **Player Happiness (screen 58)** — out of scope, no morale system exists.
- **Player Discipline (screen 60)** — out of scope, no card accumulation or ban model.
- **Player Comparison (screen 63)** — out of scope, no comparison mechanism.
- **Player Statistics per-player (screen 54)** — out of scope, no per-player aggregated stats model.
- **Player Transfer Status (screen 57)** — out of scope, transfer listing status has no model.