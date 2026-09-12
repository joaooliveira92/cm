# 04: Save List chrome bar + keyboard tier

**What to build:** An app-chrome bar at the top of the Save List with three icon-only buttons (Preferences, Credits, Quit), all lightweight dialogs matching Retire and Quit patterns; Save List keyboard tier at Level 2 with Enter to select focused save row and C to Continue on the most-recent save.

**Decisions:**
- Save List chrome bar at top of Save List with three icon-only buttons — Preferences, Credits, Quit — all lightweight dialogs matching Retire and Quit patterns (source: `.agents/notes/proposed/feature/2026-08-29-screen-keyboard-tiers.md`).
- Save List keyboard tier at Level 2; Enter to select focused save row; C to Continue on most-recent save (source: `.agents/notes/proposed/feature/2026-08-29-screen-keyboard-tiers.md`).
- Command palette: no entries for boot-screen destinations; palette is for career-mode navigation and screen-local actions only (source: `.agents/notes/proposed/feature/2026-08-29-screen-keyboard-tiers.md`).
- Preferences, Credits, and Quit buttons are lightweight dialogs (no routes, no navigation entries, no keyboard tier assignment) (source: `.agents/notes/proposed/feature/2026-08-29-screen-keyboard-tiers.md`).

**Blocked by:** 03 (Quit button reuses the before-quit guard from Ticket 03)

**Status:** ready-for-agent

- [ ] Acceptance criterion 1: Save List has an app-chrome bar at the top with three icon-only buttons (Preferences, Credits, Quit)
- [ ] Acceptance criterion 2: Save List keyboard tier is Level 2; Enter selects focused save row; C Continues on most-recent save
- [ ] Acceptance criterion 3: Quit button reuses the before-quit guard from Ticket 03 (clicking it opens the quit confirmation dialog)
- [ ] Acceptance criterion 4: Preferences and Credits buttons open lightweight dialogs (no routes, no navigation entries)