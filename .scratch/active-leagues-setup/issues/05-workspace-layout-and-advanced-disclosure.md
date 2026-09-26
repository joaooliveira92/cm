# 05: Workspace layout, the advanced disclosure, and the introduction

**What to build:** the dense configuration workspace and its surrounding frame, per the spec's "density and layout from the brief", "workspace actions and the advanced disclosure", and "club identity and club-grounded recommendations do not exist at this step" decisions:

- A full-viewport grid with a flexible workspace and a narrow, clamped summary sidebar (18–22rem); the league list region is the only thing that scrolls when it overflows.
- Dense league rows (30–34px control height, 3–4px row gap, 8px column gap, 10–12px control padding, remove target never smaller than 30×30px), read as a repeated compact structure, never as spacious cards; repeated grid definitions are extracted rather than restated as arbitrary values.
- The introduction anchored to the current scope selection (an active-league summary) with an inline change action that opens Manage leagues — no "currently selected team" chip, because the club is chosen on a later step.
- Below the list, two secondary actions on opposite sides; setup preset (left) and Manage leagues (right), visually subordinate to the final action and never in the table header.
- A collapsible advanced-options section below a full-width separator: Base UI disclosure with `aria-expanded` and `aria-controls`, a two-column option grid, Base UI checkbox primitives, independently keyboard-accessible help controls (tooltips never the only home of anything essential), 28–32px option rows, split into labelled groups once the list outgrows a plain checklist.

The slice's edge promise: renderer-only composition — the workspace renders the grid, action, and introduction from the ticket-04 state, and the advanced disclosure commits through the same changed-option intent; no I/O and no new RPC method exist yet. Callers observe the layout, the disclosure behavior, and the intents fired.

**Blocked by:** 03 — Advanced options model (the disclosure renders the option set modeled there); 04 — Setup state, derived atoms, and the league grid (the workspace composes the grid and state).

**Status:** resolved

- [x] The screen uses the full viewport with a flexible workspace and a clamped sidebar; only the league-list region scrolls when rows overflow.
- [x] Rows are dense per the spec's dimensions, never spacious cards; repeated grid definitions are extracted rather than duplicated as arbitrary values.
- [x] The introduction shows the current scope selection with an inline change action opening Manage leagues; no team chip exists.
- [x] Setup preset (left) and Manage leagues (right) sit below the list, subordinate to the final action and absent from the table header.
- [x] The advanced section collapses below a full-width separator with correct `aria-expanded`/`aria-controls`; a two-column grid of Base UI checkboxes with independently keyboard-accessible help controls; labelled groups once the list outgrows a plain checklist.
- [x] Component tests cover the advanced section expanding and collapsing and keyboard navigation reaching every control.
- [x] `pnpm check:all` is green at this commit.
## Resolution note — the advanced controls are selects, not checkboxes

The spec inherited the brief's phrasing ("Base UI checkbox primitives") from a section the brief
imagined as a boolean checklist. Ticket 03 then modelled the four categories as **enumerated**
values — match-simulation detail alone has three — so a checkbox could only be honest here by
fabricating a boolean the domain does not have, which is the exact failure mode the spec's
"every advanced option changes something real" decision exists to prevent.

Each option therefore renders as a labelled native `<select>`, the same keyboard-complete control
the league grid's depth cell already uses on this screen. Everything else in that criterion ships
as written: the full-width separator, the Base UI `Collapsible` disclosure with `aria-expanded`
and `aria-controls`, the two-column option grid, the labelled `fieldset`/`legend` groups, the
28–32px rows, and help controls that are their own tab stops carrying inline text rather than
tooltips.
