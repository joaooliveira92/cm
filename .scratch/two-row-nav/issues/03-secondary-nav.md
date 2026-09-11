# 03: SecondaryNav with section-specific tabs

**What to build:** The `SecondaryNav` component that renders the contextual secondary row below the primary row. When a primary section is active, it shows that section's tabs. Includes: optional context selector on the left (competition dropdown, squad dropdown), contextual tab buttons, horizontal scroll with fade-to-background gradient at edges for overflow, and conditional tab visibility computed from the route context.

The secondary row is replaced entirely when:
- An entity profile is opened (handled by ticket 04)
- A match context is active (handled by ticket 05)

Behavior rules (spec §12, §14):
- Exactly one visible secondary tab is active (`aria-current="page"`)
- Conditional tabs must not leave an invalid active state after context changes
- If the selected tab becomes unavailable, navigate to the context's default tab and notify assistive technology
- Overflow tabs scroll horizontally (CSS `overflow-x: auto` with `mask-image` linear-gradient fade) — no third row, no wrap
- Selected tabs scroll into view automatically
- Keyboard: arrow keys navigate between tabs in the tab list

**Decisions:**

- Config objects with visibility predicates. See [Agent Note](.agents/notes/proposed/architecture/2026-09-10-menu-nav-architecture.md).
- Horizontal scroll with fade gradient for overflow tabs. See [Agent Note](.agents/notes/proposed/architecture/2026-09-10-menu-nav-architecture.md).

**Blocked by:** 01 (Nav config).

**Status:** ready-for-agent

- [ ] Secondary row renders the correct tabs for the active primary section (all 10 sections covered)
- [ ] Context selector renders on the left when the section requires one (Competitions, Squad, Club)
- [ ] Exactly one secondary tab has `aria-current="page"` at all times
- [ ] Conditional tabs (Table, Tree, Draw, Coefficients, Awards, Stages, Live Table) appear only when their visibility predicate passes
- [ ] When a selected tab becomes invalid (context change), the default tab for the new context is selected
- [ ] Horizontal scroll with fade gradient on overflow — tabs do not wrap to a third row
- [ ] Keyboard: arrow keys navigate between tabs, selected tab scrolls into view
- [ ] Component tests with jsdom cover: tab rendering, context selector, conditional visibility, overflow scroll, fallback on invalid tab