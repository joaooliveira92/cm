# 01 — Two-column workspace shape

Type: prototype
Status: open

## Question

What does the Club Selection workspace look like once the single scrolling column of cards
becomes a left rail (league selector, club list, `Pick a team for me`) beside a right detail
panel?

The layout intent is settled and is not up for re-decision: list left, detail right; the
selector and button are fixed-height chrome and the list consumes the remaining height, as a
flex column rather than literal 5% / 90% percentages.

What the prototype must answer:

- **What a club list row shows.** Today's card renders name, stature tier, board objective
  range, squad quality band, transfer budget, and wage budget. A row in a narrow left rail
  cannot carry all six. Which survive into the row, and which move exclusively to the detail
  panel?
- **The detail panel before a club is chosen.** Empty state, or auto-select the first club on
  load so the panel is never blank? Auto-selection interacts with `Pick a team for me` and with
  Continue gating (see [02 — Selected club in the creation session](02-selected-club-in-the-creation-session.md)).
- **Loading and error states.** The screen currently replaces its whole body with a spinner or
  an error paragraph. In a two-column layout, does the left rail load independently of the
  right panel?
- **How selection reads visually** — the difference between the focused row and the selected
  row, which the shared `renderer/table/DataTable.tsx` already treats as distinct concepts.

Build a throwaway prototype and put it in front of the user; do not settle this from prose.

## Prototype (awaiting verdict)

Built, not yet judged. `pnpm dev`, then New Career → pick a league → fill Step 2 → **Next: Select
Club**. Five variants sit on the real `/create/step-2` route against real `getClubSelection` data;
cycle them with the floating pill at the bottom or the `←`/`→` keys. Switching does not reload, so
the world survives — the click-through is once per app launch.

| Key | Variant | Row carries | Panel before a club is chosen | Loading |
|-----|---------|-------------|-------------------------------|---------|
| `0` | Today — single scrolling column | all six facts | n/a | whole body |
| `A` | Dense rail, dossier right | name, tier, transfer budget | auto-selects first club | rail skeleton + panel spinner, independent |
| `B` | Three-fact rows, empty until chosen | name, tier, objective | empty state; `Pick a team for me` is the panel's CTA | whole workspace, as today |
| `C` | Name-only rail, grouped by stature | name only (tier is a sticky group heading) | auto-selects first club | rail skeleton + panel spinner, independent |
| `D` | Quality meters, league-summary fallback | name, tier, squad-quality meter | league summary — never blank, never implies a selection | rail skeleton, inline rail error |

Code: `apps/desktop/src/renderer/create/clubSelectionPrototype/`, dev-only, mounted from
`ClubSelectionScreen.tsx`. Throwaway — the whole directory gets deleted and the winner rewritten
properly.

**Finding the prototype forced out, ahead of any verdict:** `CreateFlowLayout`'s `<main>` is a
`max-w-5xl` centred `overflow-y-auto` column and `RouteView`'s wrapper passes no height down, so
nothing inside can be a full-height two-column workspace. The variants fake it with a viewport
calc and a negative-margin breakout. Shipping any of them means making the creation shell a
flex-height, full-width band for this step.
