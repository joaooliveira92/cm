# Agent Note: Section items open in a flyout beside the sidebar

Status: implemented

## Problem

The sidebar expanded the route's section in place, listing its items under its row. That made the
sidebar a two-level tree whose height changed with the section: Recruitment's ten items pushed every
section below it, and the footer, down the 800px window. Collapsing to the icon rail hid the items
entirely, so a manager who collapsed the sidebar for a wide table could reach a section but none of
its items.

The request was a panel like shadcn's navigation menu: the sidebar holds only the primary sections,
and clicking one shows its items beside it.

## Decision

1. **Clicking a section row opens its item panel and does not navigate.** An item in the panel
   navigates. A row that both navigated and opened a panel would do two things per click, and the
   rail and the expanded sidebar would read differently. The cost is a second click to reach a
   section's default screen.

2. **The panel is a click-only Base UI popover, not shadcn's navigation menu.** The navigation menu
   was the reference, but its Base UI root opens on hover, and in 1.7 the trigger has no prop to turn
   that off. A sidebar invites the pointer down its edge, which would flash a panel over the screen
   for every row crossed. The navigation menu also wants one list, while the sidebar renders one per
   `NAV_GROUPS` heading. The popover opens to the right of the row (`side="right"`, `align="start"`)
   and is portalled, so it works the same in the icon rail.

   It is **one** popover, `SectionFlyout`, with the section rows as detached triggers (a
   `Popover.createHandle` handle, the section as each trigger's payload), not a popover per row.
   That is what gives it the navigation menu's motion: moving to another section is a trigger change
   on the same popup, so the positioner glides to the new row, the popup resizes to the new list,
   and Base UI's `Popover.Viewport` slides the old list out and the new one in along the direction of
   travel. Popovers per row could only close one panel and open another. The transitions are plain
   CSS on `data-section-flyout` in `index.css`, keyed on Base UI's `data-starting-style`,
   `data-ending-style` and `data-activation-direction`, and switched off under
   `prefers-reduced-motion`.

3. **One panel at a time, closed on navigation.** `use-nav-state.ts` holds `openSectionId`; `goTo`
   clears it. There is no route-following default any more, because a panel floating over the
   screen should open only when asked. Base UI unmounts a closed popup, so an item label two
   sections share ("Transfers") still resolves to exactly one control.

4. **A caption under the active row names the current item.** With the item list behind a click, the
   sidebar would otherwise show only the section. The caption is left off when the item's label
   repeats the section's ("Squad" under Squad), and it hides in the icon rail, where the panel marks
   the current item instead.

5. **The level-1 keyboard prefix opens the panel.** `g <n>` still reaches a section; during
   `g <n> <q,w,e,…>` the prefix's section opens its panel so the item hints are visible. That open
   does not take focus, so the next key still reaches the prefix handler, and it closes when the
   prefix ends.

6. **The panel keeps the `"<Section> submenu"` landmark name.** It is portalled out of the
   `Primary navigation` landmark, so it carries its own `nav`, named as the inline submenu was. The
   e2e specs and screen readers address it the same way.

7. **An item click does not hand focus back to the row.** Navigation moves focus to the new screen
   (AC-15); the popover's default of returning focus to its trigger on close would undo that. Escape
   and outside-click still return it.

## What this supersedes

[Primary navigation is a sidebar](2026-09-26-primary-navigation-is-a-sidebar.md), in part: decision 2
(one section expanded inline, following the route) and the item half of decision 7 (hints on the
expanded section's items). Decision 3's ban on hover-intent stands, now for a different reason: hover
would not reflow anything, but it would flash panels.

## Alternatives considered

- **shadcn's navigation menu, with hover opens filtered out in a controlled `onValueChange`.** Closer
  to the reference, but it fights the primitive: hover and dismiss handlers attach per list, the
  sidebar has one list per group, and the close-on-leave behaviour is tied to the same hover
  machinery. Rejected for the popover, which is click-only by default.
- **Row navigates to the section's default screen and also opens the panel.** Keeps one-click
  access to the default screen. Rejected in review: one control with two effects, and the panel
  would open over a screen that just changed under it.
- **No caption; rely on the screen's heading.** Rejected because screen headings do not always map
  onto the sidebar's labels, so the heading alone does not say which item led there.

## Consequences

- `components/ui/collapsible.tsx` and `components/ui/sidebar-menu-sub.tsx` are deleted; nothing else
  used them. `SidebarMenuBadge` moved into `sidebar.tsx`.
- e2e `goto` names an item for every screen, including a section's default screen, because a
  section click no longer navigates.
- Tests that want the current item's `aria-current` open the section's panel first.
- While the panel moves between sections it briefly holds an inert snapshot of the outgoing list,
  so a test that counts submenu landmarks right after a switch waits for the transition to finish.
- `docs/menu.md` §1 and §19 describe the panel rather than an expanded section.
