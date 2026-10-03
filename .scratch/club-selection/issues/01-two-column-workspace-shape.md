# 01 — Two-column workspace shape

Type: prototype
Status: resolved

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

## Answer

**Variant D wins.** The full five-variant set is captured on the throwaway branch
`prototype/club-selection-workspace`; it is deleted from the main line.

### What a club list row shows

Three facts: **club name**, **stature tier**, and **squad quality as a six-segment meter** with its
band label. Board objective, transfer budget and wage budget are detail-panel only.

Squad quality earns the row slot because it is the one fact a narrow rail can render
*comparatively* — twenty meters scanned down a column say "which of these is a rebuild" in a way
twenty copies of the word `Competitive` do not. The two budgets lose their slot for the mirror
reason: as truncated currency they read as noise, and they are the facts a manager wants precisely
once, about the club they are already considering.

The variants that showed a budget in the row (`A`) or the objective range (`B`) were legible but
answered no question at a glance. Name-only (`C`) was the cleanest rail and the least useful one —
picking a club became twenty round trips to the panel.

### The detail panel before a club is chosen

**No auto-selection, and no empty state.** Before a club is picked the panel shows a **league
summary**: the club count and the stature-tier distribution.

Auto-selecting the first club (`A`, `C`) keeps the panel populated by asserting something false —
that the manager has chosen a club — which then has to be untangled from Continue gating
([02](02-selected-club-in-the-creation-session.md)) and from `Pick a team for me`
([05](05-pick-a-team-for-me-semantics.md)). An empty state (`B`) is honest but wastes the larger
half of the workspace at exactly the moment the user knows least. The league summary is honest
*and* useful: it is true before any selection exists, and it says nothing about what has been
chosen.

### Loading and error states

**The rail loads independently of the panel.** The rail renders skeleton rows; the panel renders
its league-summary shell throughout and fills in as the count arrives. A load failure renders
**inline in the rail**, not as a whole-screen replacement — the selector and the chrome stay put, so
a retry does not feel like a different screen.

`B`'s whole-workspace spinner (today's behaviour, kept deliberately as a control) was the clearest
loser: it makes a two-column layout flash into existence, and it throws away the chrome that was
already correct.

### How selection reads against focus

**Selection is redundantly coded three ways; focus is the single ring.**

- Selected row: `bg-row-selected` fill, plus a left accent bar in `text-highlight`, plus a
  `Selected` badge in the row.
- Focused row: `FOCUS_RING` only.

This matches the split `renderer/table/DataTable.tsx` already enforces (`Space` toggles selection;
focus ≠ selection) and survives being read without colour. `B`'s filled `chrome-gradient` row was
the most striking and the worst behaved — at chrome saturation it competed with the header band and
with the focus ring simultaneously.

One wart to fix on the way in: in the prototype the `Selected` badge *replaces* the stature-tier
badge, so the selected row silently drops a fact. The implementation should keep the tier badge and
carry selection some other way in that slot.

### Where the component boundary falls

This also settles the map's open question. **One parent owns the selection state; the rail and the
panel are two sibling children taking props.** No provider, no compound component: three regions
and a single piece of state do not earn a context, and props keep both regions trivially testable
against a fixed selection. Revisit only if a third consumer of the selection appears.

### The shell change this requires

`CreateFlowLayout`'s `<main>` is a `max-w-5xl` centred `overflow-y-auto` column, and `RouteView`'s
wrapper passes no height down — so nothing inside it can be a full-height two-column workspace. The
prototype faked it with a viewport calc and a negative-margin breakout, which is not shippable.
**Implementing D means making the creation shell a flex-height, full-width band for this step.**
That belongs in the spec ([08](08-assemble-spec.md)) as an explicit change to the creation flow
layout, not as a workaround inside the club screen.

### Still open

Virtualization stays unanswered — twenty meter rows are cheap, and the threshold is a question for
whenever a second league actually generates.
