# 03 — Missing systems disposition

Type: grilling
Status: resolved

## Question

Several Group D screens describe features with no counterpart in this game:

- Screen 58 (Player Happiness) — morale, happiness, discontent. No morale system exists.
- Screen 60 (Player Discipline) — fines, warnings, red/yellow card tracking. Discipline exists only as a match event; no player discipline record.
- Screen 63 (Player Comparison) — side-by-side player comparison. No comparison UI exists.
- Screen 62 (Player Action Menu) — a context menu of actions per player. Some actions (scout, approach to sign, offer contract) may exist; many do not.

For each: is it out of scope, deferred to a future spec group, or does this effort need a design decision on whether to build it?

**Blocked by:** 01 (the inventory must confirm unbuilt status before scoping disposition).

**Status:** resolved

## Answer

All four missing-system screens have clear dispositions:

| Screen | Disposition | Rationale |
|--------|-------------|-----------|
| 58 Player Happiness | **out-of-scope** | No morale/happiness system exists in the game. Not planned. |
| 60 Player Discipline | **out-of-scope** | Cards are simulated per-match with no accumulation or ban model. No fine/discipline system exists. Not planned. |
| 63 Player Comparison | **out-of-scope** | No comparison mechanism exists. Would require a dedicated comparison UI and data model. Deferred indefinitely. |
| 62 Player Action Menu | **deferred** | Some player actions exist through specific surfaces (scouting via assignment, signing via transfers screen, training focus via squad). A unified context menu would consolidate these but is not built. Deferred until the existing actions have a stable pattern to compose. |

The WIP route stubs for these screens should be removed to avoid navigable dead ends.