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

**Status:** ready-for-agent

- [ ] Each of the 8 remaining screens has a disposition.
- [ ] Combined total: 19 screens all disposed (either out-of-scope, satisfied, deferred, or needs-design).