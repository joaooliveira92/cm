# 10-table-and-grid-navigation

Type: grilling
Status: resolved
Blocked by: 04, 06

## Question

Where does TanStack Table go, and how does keyboard grid navigation layer on top of it?

TanStack Table is headless: it supplies row and column models, sorting, filtering, column
visibility and grouping, and it renders nothing and manages no focus. The keyboard half is entirely
ours, sitting on the focus model from ticket 06.

The candidate tables are `SquadScreen.tsx` (~25 rows × 30+ attribute columns, currently no sorting,
filtering or column visibility at all), the transfers market list in `TransfersScreen.tsx` (up to
~475 rows, since `getTransfersScreen` loads every player and filters), the bid queue on the same
screen, and the 20-row league table.

Decide:

- **Which tables adopt it**, and which stay hand-rendered. A 20-row league table may not earn the
  abstraction.
- **The feature set per table**: sorting, filtering, column visibility, column pinning. The squad's
  30 columns make visibility close to mandatory; whether the player configures it or it is preset
  is a design call.
- **Grid navigation model**: whether arrow keys move by row or by cell. Cell-level navigation is the
  right answer for a 30-column attribute grid and the wrong answer for a 6-column market list, so
  this may vary per table — if so, state the rule.
- **Sorting and filtering by keyboard**: how a player re-sorts or filters without a mouse, and
  whether these become Actions or direct bindings.
- **Row actions**: how a focused market row triggers Bid or Sign, and where the bid amount is
  entered given that the input currently lives in the row.
- **Interaction with the roving-focus decision** from ticket 06: whether a table is one focus region
  or many, and what a sort re-order does to the currently focused row.

## Answer

**TanStack Table for Squad, Market, and Free Agents; semantic `<table>` with row-oriented roving, no ARIA grid; contextual Actions region for bid entry; sortable header buttons + palette Actions; identity-based focus restoration across sort/filter/refetch.** See [Agent Note](/.agents/notes/proposed/feature/2026-08-29-table-and-grid-navigation.md).
