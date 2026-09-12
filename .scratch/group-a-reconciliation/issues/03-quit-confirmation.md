# 03: Quit confirmation guard

**What to build:** A before-quit guard on Electron's `before-quit` event that shows a modal dialog ("Are you sure you want to close [AppName]?") on window-close and Cmd+Q; during the creation flow, the dialog body warns about lost provisional-career state; on renderer crash or timeout the guard falls through to termination.

**Decisions:**
- One intent guarded (`close_application`); other spec intents are register entries (return_to_main_menu is cheap reversible navigation, leave_multiplayer_session and switch_career and restart_application are out of scope) (source: `.agents/notes/proposed/feature/2026-08-30-quit-confirmation-design.md`).
- The one genuine exception: provisional career warns of lost creation state — if user closes before `commitCareer`, that work is lost; dialog body: "Your incomplete career creation will be lost. Are you sure?" with Continue (return to creation flow) and Discard & Quit (close app; cleanup via `discardCareer` runs during shutdown) (source: `.agents/notes/proposed/feature/2026-08-30-quit-confirmation-design.md`).
- Platform behaviour: guard sits on Electron's `before-quit` event; on macOS Cmd+Q fires it, closing the last window does not (Cocoa convention — app stays alive in dock); on non-macOS both window-close and Cmd+Q route through `app.quit()` → `before-quit` (source: `.agents/notes/proposed/feature/2026-08-30-quit-confirmation-design.md`).
- On renderer crash or timeout, the guard falls through to quit — a crashed renderer cannot show a dialog, so the guard should not prevent termination (source: `.agents/notes/proposed/feature/2026-08-30-quit-confirmation-design.md`).
- Dialog: title "Quit", body "Are you sure you want to close [AppName]?"; when provisional: "Your incomplete career creation will be lost. Are you sure?"; buttons Cancel (default, Enter) and Quit (tab-order second); Escape cancels (same as Cancel) (source: `.agents/notes/proposed/feature/2026-08-30-quit-confirmation-design.md`).
- No keyboard shortcut for confirming quit; quit action reachable through window close button (non-macOS), App menu (macOS), no command palette entry, no `g` key binding (source: `.agents/notes/proposed/feature/2026-08-30-quit-confirmation-design.md`).
- Dialog is a modal overlay rendered by a new `QuitGuard` component in the renderer's overlay layer, triggered by the main process sending a `show-quit-guard` event; not a route, not a screen (source: `.agents/notes/proposed/feature/2026-08-30-quit-confirmation-design.md`).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Acceptance criterion 1: Closing the last window on macOS does not prompt (app stays alive, standard Cocoa behaviour)
- [ ] Acceptance criterion 2: Closing the window on non-macOS prompts (goes through `before-quit`)
- [ ] Acceptance criterion 3: Cmd+Q on macOS prompts (goes through guard, Electron's default menu bar intercepts it)
- [ ] Acceptance criterion 4: During creation flow (provisional career exists), the dialog body warns about lost creation state; outside creation flow, the dialog is the standard "Are you sure?"
- [ ] Acceptance criterion 5: Cancel or Escape returns to the app without quitting
- [ ] Acceptance criterion 6: Quit closes the app (or discards the provisional career and closes)
- [ ] Acceptance criterion 7: On renderer crash or timeout, the guard does not block termination — `before-quit` falls through