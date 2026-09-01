# 06 — Keyboard and accessibility tier

Type: grilling
Status: open

Blocked by: 01, 02

## Question

What keyboard and screen-reader behaviour does this screen commit to?

`RECONCILIATION.md:302` currently marks Screen 11's keyboard navigation, Enter/Space selection,
Clear Selection, and accessible announcements as `deferred`, citing the project's screen
keyboard-tiers policy. Turning a static list into a selection surface reopens that: a list you
can only click is a regression against a keyboard-first renderer.

The renderer already owns the machinery — `renderer/table/DataTable.tsx` implements roving row
focus, selection separate from focus, and Enter as the row primary action; `renderer/focus.ts`
and the Action registry own the focus model and `g <key>` navigation.

Decisions this ticket owns:

- **Which tier this screen lands in** under the existing keyboard-tiers note.
- **Whether the club list reuses `DataTable`** and inherits roving focus, or is a bespoke
  listbox with its own `aria-activedescendant` handling.
- **Focus order across three regions** — selector, list, button — plus the non-focusable detail
  panel, and whether the panel is a live region when selection changes.
- **Whether `Pick a team for me` gets a key binding**, and whether Clear Selection exists at
  all given that Continue is gated on having a club.
