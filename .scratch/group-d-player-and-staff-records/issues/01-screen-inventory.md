# 01 — Screen inventory: which screens are already satisfied

Type: task
Status: resolved

## Question

Survey the existing codebase against each of the 19 Group D screens and determine which are already satisfied by shipped code (no new surface needed), which need partial work, and which are entirely unbuilt.

Screens likely satisfied: 56 (Contract — existing Transfer view), 57 (Transfer Status — existing market screens), 61 (Player Development — existing per-season step), part of 51 (Attributes — shown in Squad screen). Screens known to have no counterpart: 58 (Happiness), 60 (Discipline), 63 (Comparison), 67 (Coach Report).

Produce a per-screen status table (Satisfied / Partial / Unbuilt) as the ledger that subsequent tickets reference.

**Blocked by:** None (can start immediately).

**Status:** resolved

## Answer

Per-screen status after codebase survey:

| Screen | Status | Evidence |
|--------|--------|----------|
| 50 Player Profile | Placeholder | Route at `player/$playerId/profile` → WIP placeholder. No RPC. |
| 51 Player Attributes | Inline only | Placeholder at `player/$playerId/attributes` → WIP. **Satisfied inline**: squad table shows all attribute columns (Physical, Technical, Mental, Goalkeeping) as toggleable columns. |
| 52 Player Positions | Inline only | No dedicated screen. **Satisfied inline**: squad position list shows color-coded familiarity; squad table shows `position (familiarity, rating)`. |
| 53 Player Form | Unknown | Placeholder at `player/$playerId/form` → WIP. No form data modeled anywhere. |
| 54 Player Statistics | Unbuilt | No route. Competition stats are competition-scoped; match stats are match-scoped. No per-player statistics. |
| 55 Player History | Placeholder | Route at `player/$playerId/history` → WIP. No career history data. |
| 56 Player Contract | Placeholder | Route at `player/$playerId/contract` → WIP. No getPlayerContract RPC. Commands exist (placeBid, signFreeAgent, renewContract) but no read. |
| 57 Player Transfer Status | Unbuilt | No route. Transfer listing status has no model. |
| 58 Player Happiness | Unbuilt | No route. No morale/happiness system exists. |
| 59 Player Injuries | Placeholder | Route at `player/$playerId/injuries` → WIP. Injury exists as per-match event, not as season-long state. |
| 60 Player Discipline | Unbuilt | No route. Cards simulated; no accumulation or ban model. |
| 61 Player Development | Inline only | No dedicated screen. Training focus shown as squad column. setTrainingFocus RPC exists. |
| 62 Player Action Menu | Unbuilt | No component found. No contextual player actions component. |
| 63 Player Comparison | Unbuilt | No route or component. |
| 64 Staff Profile | Placeholder | Route at `staff/$staffId/profile` → WIP. No RPC beyond getClubStaff. |
| 65 Staff Contract | Placeholder | Route at `staff/$staffId/contract` → WIP. No staff contracts in game model. |
| 66 Staff History | Placeholder | Route at `staff/$staffId/history` → WIP. No staff turnover. |
| 67 Coach Report | Placeholder | Route at `player/$playerId/coach-report` → WIP. No coach evaluation report. |
| 68 Scout Report (Player) | Placeholder | Route at `player/$playerId/scout-report` → WIP. Distinct from Team Scout Report which is fully implemented. |

**Key insight**: All dedicated player/staff screens exist as WIP route stubs registered during Group A reconciliation. None show real data because no player-read RPCs exist beyond `setTrainingFocus` (write) and `getClubStaff` (club-scoped). Several screens are partially satisfied by inline squad-table display (51 Attributes, 52 Positions, 61 Development/Training Focus). The remaining screens describe features that have no modeled data at all.