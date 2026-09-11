# 02: PrimaryNav component

**What to build:** The `PrimaryNav` component that renders the stable top row of 10 navigation items. Includes: club crest area on the far left, primary items in center-left, and global controls on the right (Continue button slot, current date, Inbox with unread count, Back/Forward buttons, Search shortcut). The component is independent of `SecondaryNav` — it reads the top-level route segment to light the active item and receives badge counts for notification indicators.

Responsive behavior (spec §13):
- Wide (≥1200px): all 10 items visible
- Medium (≥768px, <1200px): hide World and Search (show as icon-supported items or move to More), keep Continue visible
- Narrow (<768px): compact top bar with current section label, Continue always visible

The "More" item opens a dropdown/panel (not a full page) with items: History, Game Status, Hall of Fame, Add Manager, Preferences, Save, Save As, Help, Credits, Quit Game.

No animation on nav state changes (snap transitions). Uses `react-hotkeys-hook` for keyboard navigation.

**Decisions:**

- Two independent nav components. See [Agent Note](.agents/notes/proposed/architecture/2026-09-10-menu-nav-architecture.md).
- Responsive breakpoints (≥1200px / ≥768px / <768px). See [Agent Note](.agents/notes/proposed/architecture/2026-09-10-menu-nav-architecture.md).
- "More" as dropdown/panel, not full page. See [Agent Note](.agents/notes/proposed/architecture/2026-09-10-menu-nav-architecture.md).
- Snap transitions for nav rows. See [Agent Note](.agents/notes/proposed/architecture/2026-09-10-menu-nav-architecture.md).

**Blocked by:** 01 (Nav config).

**Status:** ready-for-agent

- [ ] All 10 primary items render in spec order (Manager → Squad → Tactics → Training → Transfers → Club → Competitions → World → Search → More)
- [ ] Active item receives `aria-current="page"` and appropriate styling
- [ ] Club crest area renders on the far left
- [ ] Continue button slot is always visible, positioned on the far right
- [ ] Inbox badge shows unread count
- [ ] Responsive: medium layout hides World and Search (± icon-only fallback), narrow layout shows compact top bar
- [ ] "More" opens a dropdown/panel with all spec-defined items
- [ ] No sidebar is introduced at any breakpoint
- [ ] Snap transitions — no animation on nav state change
- [ ] Component tests with jsdom cover: rendering, active state, responsive hiding, More dropdown