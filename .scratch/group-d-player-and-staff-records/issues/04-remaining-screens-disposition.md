# 04 — Remaining screens disposition

Type: grilling

## Question

After tickets 01-03 disposed 11 of 19 screens (all staff screens, happiness, discipline, comparison, statistics, transfer status), eight screens remain:

| Screen | Current State | Question |
|--------|--------------|----------|
| 50 Player Profile | WIP route, no RPC | Does a dedicated player profile screen exist elsewhere (squad row click?), or does this effort build one? |
| 51 Player Attributes | Satisfied inline in squad table | Does the inline display suffice, or does this need a dedicated attributes-only screen? |
| 52 Player Positions | Satisfied inline (position list + squad column) | Does the inline display suffice, or does this need a dedicated positions screen? |
| 53 Player Form | WIP route, no form data modeled | Is per-player form (last N matches) something the game needs? Requires new data model. |
| 55 Player History | WIP route, no career history data | Career timeline — does this need to exist? Related to Season Summary and Manager History. |
| 56 Player Contract | WIP route, no getPlayerContract RPC | Contract terms exist in the domain — does this need a dedicated screen or can it be a modal/detail panel? |
| 59 Player Injuries | WIP route, injury as per-match event only | Injury history screen? Injury exists as match event with no durable per-player record. |
| 61 Player Development / Training Focus | Training Focus column exists inline | Development progress display? The per-season step exists; does it need a UI? |
| 62 Player Action Menu | Deferred (ticket 03) | Still deferred or elevated to in-scope? |
| 68 Scout Report (Player) | Deferred (ticket 02) | Still deferred? |

For each: needs-design / satisfied-inline / out-of-scope / deferred.

**Blocked by:** 01, 02, 03.

**Status:** resolved

## Answer

Eight screens remain after tickets 01-03. Dispositions:

| Screen | Disposition | Rationale |
|--------|-------------|-----------|
| 50 Player Profile | **needs-design** | Squad screen shows players as table rows with no drill-down. Profile is the natural surface a player row leads to. Needs RPC + screen + route. |
| 51 Player Attributes | **satisfied-inline** | All attributes are toggleable squad table columns. A dedicated screen with no new data adds no value. The WIP placeholder route should be removed. |
| 52 Player Positions | **satisfied-inline** | Positions + familiarity shown in squad position list and table column. Same reasoning as 51. |
| 53 Player Form | **out-of-scope** | Form (last N matches) would require a new data model (per-player match rating history) and has no shipping feature depending on it. A dedicated effort if needed. |
| 55 Player History | **deferred** | Career history (clubs played for, seasons, transfer dates) requires modeling the sequence of contracts/transfers a player passes through. Related to Season Summary. Not urgent. |
| 56 Player Contract | **needs-design** | Contract terms (wage, length, expiry) are modeled but have no dedicated surface. A contract detail panel accessible from squad or profile would be useful. Needs getPlayerContract RPC. |
| 59 Player Injuries | **out-of-scope** | Injuries are per-match events with no durable per-player record (no injury history table). Building one is a data-modeling effort not justified by current needs. |
| 61 Player Development / Training Focus | **needs-design** | Training Focus is set per-player (setTrainingFocus RPC exists) and shown as a column. Development progress (attributes changing season to season) has no display. A dedicated screen or detail panel is the natural surface. |
| 62 Player Action Menu | **deferred** (unchanged) | Actions exist through specific surfaces. A unified menu can be built when there's a stable action set to compose. |
| 68 Scout Report (Player) | **deferred** (unchanged) | Team Scout Report is built. Player-level scouting progress surfaces as Attribute Ranges inline. A dedicated player report is deferred. |

**Summary**: 11 of 19 screens disposed out-of-scope, 3 satisfied-inline, 2 deferred, 3 needs-design (50 Profile, 56 Contract, 61 Development). The needs-design screens should be the implementation scope if this effort continues to slicing. The 2 deferred and 3 satisfied-inline screens can be ticketed as instructions to remove their WIP route stubs.