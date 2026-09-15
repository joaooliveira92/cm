# 01 — Group E screen inventory survey

**What to build:** Survey the existing codebase against each of the 11 Group E screens and determine which are already satisfied by shipped code (the Squad screen), which describe systems that don't exist, and which genuinely need new surfaces.

Key questions:
1. Squad selection/view/filters/sorting (69-72) — how much is in the existing Squad screen?
2. Shirt numbers (73) — does the schema support `squad_slot` as a display number?
3. Captain (74) — any captain model exists?
4. Set-piece takers (75) — any set-piece model?
5. Squad registration (76) — competition registration concept?
6. Availability/eligibility (77) — condition/injury system adequate?
7. Player interaction (78), team meeting/discipline (79) — these systems exist?

**Blocked by:** None (can start immediately).

**Status:** resolved

## Answer

Per-screen survey of 11 Group E screens:

| Screen | Name | Status | Detail |
|--------|------|--------|--------|
| 69 | Squad selection | **satisfied** | Single-selection model via `selectedId`/`setSelection`. Space toggles, Enter sets primary. |
| 70 | Squad view selector | **satisfied** | `SQUAD_VIEWS` with position list and all column presets. `<Select>` picker in toolbar. View persisted to localStorage. |
| 71 | Selection filters | **partial** | Position filter dropdown exists. `FilterClause` union supports more kinds but no UI for attribute/status filters. "Clear filters" button. |
| 72 | Player sorting | **satisfied** | TanStack sorting on all columns. Sort state persisted. |
| 73 | Shirt numbers | **out-of-scope** | No `shirtNumber` field in schema, model, or UI. |
| 74 | Captain | **out-of-scope** | Navigation stub in spec-nav-config.ts but no data model, no route, no component. |
| 75 | Set-piece takers | **out-of-scope** | `SetPieceStatusView` hardcoded to `status: "none"`. Tactic carries no set-piece fields. |
| 76 | Squad registration | **out-of-scope** | Reserved status `Ine` exists but no registration model. |
| 77 | Availability/eligibility | **partial** | Condition/Tired is live. Injury drill-down route exists. No standing injury durations, suspensions, card accumulation, or eligibility model. |
| 78 | Player interaction | **out-of-scope** | Reserved status `Unh` exists but no morale/happiness state. |
| 79 | Team meeting/discipline | **out-of-scope** | No evidence of any meeting or discipline system. |

**Summary**: 4 satisfied (69, 70, 72, partially 71), 2 partial (71 filters could be extended, 77 eligibility), 6 out-of-scope (73-76, 78-79). The Squad screen's core functionality is shipping.