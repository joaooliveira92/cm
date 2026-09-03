# 07: Manage leagues retention, responsive behavior, and accessibility

**What to build:** the retained tree, the responsive behavior at every breakpoint, and the full accessibility contract — per the spec's "tree is retained as Manage leagues", "responsive behavior", and "accessibility contract" decisions:

- **Manage leagues** — the existing League & Nation tree stays reachable through the workspace's Manage leagues action, opened for the full-pyramid and scope work the grid cannot express: two presentations (the grid and the tree) editing the same intent model, so no second state exists to drift; the intro's inline change action also opens it.
- **Responsive** — at 1280px and above: workspace and sidebar side by side, all columns visible, two-column advanced options. Between 960 and 1279px: the sidebar persists, recommendation labels truncate, nonessential padding yields, and the remove button never overlaps content. Below 960px: the sidebar summary flows into the main column after the league list and before the advanced section, the footer becomes sticky, and each league row folds to two lines — with desktop controls never shrinking until unreadable.
- **Accessibility** — every control keyboard-reachable with focus order following visual order; selector triggers expose their expanded and controlled states; remove buttons name the league they remove; every recommendation carries visible text; performance changes announced through a polite live region; validation failures connect to their control; the advanced trigger exposes expansion; tooltips never hold essential information; icon-only buttons have accessible names; reduced-motion honored (restrained layout transitions only, never large entrances or spring-heavy movement); and focus after removing a league moves to the next row's equivalent control, else the previous row's, else the Manage leagues action.
- **Density-of-motion** — `motion` used only for a restrained layout transition on add and remove, respecting reduced-motion preferences; excessive animation explicitly avoided.

The slice's edge promise: renderer-only — no I/O and no new RPC method exist yet; the tree opens against the same intents and state the grid already owns. Callers observe the retained surface, the layout as windows resize, and the accessibility behavior below.

**Blocked by:** 05 — Workspace layout, the advanced disclosure, and the introduction (Manage leagues hangs off the workspace and the intro's change action); 06 — Sidebar, footer, handoff, and draft persistence (the responsive reflow and footer-sticky behavior complete the screen it ships).

**Status:** resolved

- [x] Manage leagues opens the retained tree, which edits the same intent model as the grid; both the workspace action and the intro's inline change action reach it.
- [x] Responsive behavior at the three breakpoints: side-by-side with all columns at 1280px+; truncated recommendation labels and reduced padding at 960–1279px; sidebar inline and rows on two lines below 960px, with the footer sticky and no control shrunk until unreadable.
- [x] Every control is keyboard-reachable with focus order following visual order; triggers expose expanded/controlled state; remove buttons name the league; recommendations carry visible text; a polite live region announces performance changes; validation failures connect to their control; tooltips never hold essential information.
- [x] Focus after removal moves to the next row's equivalent control, else the previous row's, else Manage leagues.
- [x] Layout transitions are restrained and reduced-motion-aware; no large or spring-heavy animations.
- [x] `pnpm check:all` is green at this commit.