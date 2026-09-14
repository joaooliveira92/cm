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
- [04 — Remaining screens disposition](issues/04-remaining-screens-disposition.md): All 19 screens disposed. 11 out-of-scope, 3 satisfied-inline (51, 52, 53), 2 deferred (55, 62, 68), 3 needs-design (50 Player Profile, 56 Player Contract, 61 Player Development/Training Focus display).
- [05 — Player read RPCs](issues/05-player-read-rpcs.md): `getPlayerProfile` and `getPlayerContract` RPCs implemented with schemas, handlers, renderer atoms. Committed 2026-09-14.
- [06 — Player Profile screen](issues/06-player-profile-screen.md): Replaced WIP placeholder with real screen showing identity, positions, attributes, club, contract info, injury status. Committed 2026-09-14.
- [07 — Player Contract display](issues/07-player-contract-display.md): Replaced WIP placeholder with real screen showing wage, length, signing and expiry dates. Committed 2026-09-14.
- [08 — Player Development display](issues/08-player-development-display.md): Implemented training focus management screen at `player/$playerId/development`. Committed 2026-09-14.

## Not yet specified

None. All 19 screens disposed. Three needs-design surfaces identified.

## Out of scope

- **Multiplayer, network sessions, multiple human managers** — inherited from Group A.
- **Worker pools, memory budgets, resource tuning** — inherited from Group A.
- **Off-device telemetry, crash reporting** — inherited from Group A.
- **Non-normative import scaffolding** — inherited from Group A.
- **Staff Profile / Contract / History (screens 64-66)** — per closed role set.
- **Coach Report (screen 67)** — no counterpart.
- **Player Happiness (screen 58)** — no morale system.
- **Player Discipline (screen 60)** — no card accumulation or ban model.
- **Player Comparison (screen 63)** — no comparison mechanism.
- **Player Statistics per-player (screen 54)** — no aggregated model.
- **Player Transfer Status (screen 57)** — transfer listing not modeled.
- **Player Form (screen 53)** — no match rating history model.
- **Player Injuries history (screen 59)** — injury is per-match event, no durable record.
- **Player Attributes dedicated screen (screen 51)** — satisfied inline in squad.
- **Player Positions dedicated screen (screen 52)** — satisfied inline in squad.