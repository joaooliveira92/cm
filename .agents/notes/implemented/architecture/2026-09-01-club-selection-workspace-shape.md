# Agent Note: The Club Selection two-column workspace

Status: implemented

## Problem

Club Selection is a single scrolling column of cards, each card repeating all six facts the
`ClubSelectionRow` contract carries — name, stature tier, board objective range, squad quality band,
transfer budget, wage budget. Nothing on the screen selects anything; `router/createFlow.tsx` passes
a hardcoded `temp-club-id` into `commitCareer`.

Turning it into a left rail beside a detail panel is settled as an intent, but the intent does not
decide the questions that make the layout work: which of the six facts survive into a narrow row,
whether the panel is populated before a club is chosen, whether the rail loads independently of the
panel, and how a selected row reads differently from a focused one.

Those are not answerable from prose. Five variants were built against real `getClubSelection` data
on the live `/create/step-2` route and judged side by side; the set is captured on the throwaway
branch `prototype/club-selection-workspace`.

## Decision

Adopt the shape the prototype settled on.

- **The row carries three facts: name, stature tier, and squad quality as a six-segment meter.**
  Squad quality earns the slot because it is the only fact a narrow rail can render
  *comparatively* — a column of meters answers "which of these is a rebuild" at a glance, where a
  column of the word `Competitive` does not. Board objective and both budgets are detail-panel only:
  they are wanted once, about the club already under consideration, and as truncated currency in a
  row they read as noise.

- **No auto-selection, and no empty state. The panel shows a league summary until a club is
  picked** — club count and stature-tier distribution. Auto-selecting the first club keeps the panel
  populated by asserting something false, which then has to be untangled from Continue gating and
  from `Pick a team for me`. An empty state is honest but wastes the larger half of the workspace at
  the moment the user knows least. The league summary is true before any selection exists and says
  nothing about what has been chosen.

- **The rail loads independently of the panel.** Rail shows skeleton rows; the panel keeps its
  league-summary shell throughout. A load failure renders inline in the rail, so the selector and
  chrome stay put and a retry does not feel like a different screen. The current whole-body spinner
  and whole-body error paragraph both go.

- **Selection is redundantly coded three ways; focus is the single ring.** Selected: `bg-row-selected`
  fill, a `text-highlight` left accent bar, and a marker in the row's badge slot. Focused:
  `FOCUS_RING`, nothing else. This is the split `renderer/table/DataTable.tsx` already enforces, and
  it survives being read without colour. A filled `chrome-gradient` selected row was tried and
  rejected: at chrome saturation it competes with the header band and the focus ring at once.

- **One parent owns the selection state; rail and panel are sibling children taking props.** Three
  regions and one piece of state do not earn a context or a compound component, and props keep both
  regions testable against a fixed selection.

## Consequences

What shipped:

- A club row renders exactly name, stature tier and the squad-quality meter; no budget or objective
  appears in the rail.
- With no club selected, the detail panel renders the league summary — not a spinner, not an empty
  state, not a club.
- A `getClubSelection` failure leaves the league selector and `Pick a team for me` mounted, with the
  error inline in the rail.
- A selected row and a focused row are distinguishable from each other, and a selected row is
  identifiable in greyscale.
- The selected row still shows its stature tier — the selection marker does not displace a fact.

What it costs:

- **The creation shell had to change, and did.** `CreateFlowLayout`'s `<main>` is a `max-w-5xl` centred,
  `overflow-y-auto` column and `RouteView`'s wrapper passes no height down, so nothing inside can be
  a full-height two-column workspace. The prototype faked it with a viewport calc and a
  negative-margin breakout, which is not shippable. What shipped instead is the shared-layout
  change: the shell's `<main>` becomes a flex-height, full-width band on the club step and keeps the
  centred reading column everywhere else, and `RouteView` gained an opt-in `fill` so a step can own
  the height its parent gives it.
- **The squad-quality meter is a six-step ordinal over `SQUAD_QUALITY_BANDS`.** It inherits whatever
  the band thresholds are; if generation retunes, the meter's spread retunes with it silently.
- **Virtualization stays undecided.** Twenty meter rows are cheap. The threshold is a question for
  whenever a second league actually generates.

## Related

- Ticket: `.scratch/club-selection/issues/01-two-column-workspace-shape.md`
- Selection state that survives into `commitCareer`:
  `.scratch/club-selection/issues/02-selected-club-in-the-creation-session.md`
- Selection-vs-focus precedent: [Table and grid navigation](../feature/2026-08-29-table-and-grid-navigation.md)
- Row density precedent: [Dense table visuals and the player-status vocabulary](2026-08-31-dense-table-and-status-vocabulary.md)
