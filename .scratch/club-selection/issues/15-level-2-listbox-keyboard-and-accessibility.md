# 15: Level-2 listbox keyboard and accessibility

**What to build:** The whole Club Selection stage is operable without a pointer and speaks to a
screen reader. The club list is a bespoke `role="listbox"` built on the renderer's roving-focus
primitives — not a data table and not `aria-activedescendant`: rows are `role="option"` exposing
`aria-selected`; ↑/↓ rove, Home/End jump to the ends; Enter selects the focused row and Space
toggles selection (focus and selection stay separate); Tab moves in and out. Tab order runs club
list → `Pick a team for me` → Cancel → `Next: Review`, skipping the disabled league selector. The
detail panel carries exactly one polite live region, deduplicated like the existing status
announcer, that announces when the shown club changes — including the pick's announcement — and
says nothing on plain arrow navigation. The screen's keyboard tier is recorded as level 2 in the
screen-keyboard-tiers table. No keyboard shortcut for the assist and no Clear Selection control
ship; both are deliberate deviations recorded against the screen's spec register.

The slice's edge: keyboard and screen-reader semantics built on the renderer's existing
roving-focus machinery and announcer precedent — one roving tab stop for the list, one polite
announcer for the panel — with nothing new entering the RPC graph.

**Decisions:**

- The screen is level 2 — a bespoke `role="listbox"` on the renderer's roving primitives (not
  `DataTable`, not `aria-activedescendant`), Enter selects, ↑/↓ Home/End rove, focus order list →
  `Pick a team for me` → Cancel → `Next: Review`; one polite panel announcer on show-change; no key
  binding for the assist and no Clear Selection (both reconciliation deviations). See [Agent Note:
  Club Selection is a level-2 listbox, not a DataTable](../../../.agents/notes/proposed/architecture/2026-09-01-club-selection-keyboard-tier-and-listbox.md).

**Blocked by:** 10 — Two-column workspace in a full-width creation band; 11 — World-bound selection
record that reaches commitCareer; 13 — Degenerate league selector; 14 — Pick a team for me.

**Status:** ready-for-agent

- [ ] The club list is a `role="listbox"` with one roving tab stop; rows are `role="option"` with
      `aria-selected`; ↑/↓ rove, Home/End jump, Enter selects the focused row, Space toggles, Tab
      moves in and out.
- [ ] Tab order reaches exactly club list → `Pick a team for me` → Cancel → `Next: Review`; the
      disabled league selector is skipped.
- [ ] The detail panel carries exactly one polite announcer that updates only when the shown club
      changes; arrow navigation does not narrate per row.
- [ ] The screen-keyboard-tiers table lists Club Selection at level 2 with a rationale.
- [ ] No key binding for the assist and no Clear Selection control ship with this screen; both are
      recorded as deliberate deviations in the Screen 11 register restatement.