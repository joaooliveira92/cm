# 08 — Screen 21: Quit confirmation as an accident guard

Type: grilling
Status: resolved
Blocked by: 03

## Question

Settled on the map: there is no unsaved progress to warn about — commands are durable at commit — so the
confirmation exists only to catch an accidental keypress on closing the application. What remains is the
design.

- **Which intents confirm**: spec 21 lists five `QuitIntent` values. Leaving a career for the save list
  is cheap and reversible and probably needs no prompt; closing the app is the one worth guarding. Decide
  the set.
- **The one genuine exception**: `beginCareer` creates a provisional world that is invisible to
  `listSaves` until the career is confirmed. Abandoning mid-creation *does* lose work. Whether that
  warrants a prompt, and whether the provisional world is cleaned up, is the real unsaved-state question
  in this app.
- **Platform behaviour**: `main/index.ts` currently calls `app.quit()` on non-darwin window-close. Where
  the guard sits relative to Electron's own lifecycle, and how it behaves on macOS where closing the
  window is not quitting.
- **Keyboard**: whether a quit binding exists at all, and what the dialog's focus trap and default button
  are.

The whole `UnsavedCareerState` model, the save-and-quit flow, and the loss-summary dialog are register
entries explaining why durable-at-commit persistence makes them unnecessary.

## Answer

**One intent guarded (close_application); one exception (provisional career warns of lost creation state); before-quit guard with renderer IPC; dialog-only (no keyboard shortcut for quit).** The owed durable-at-commit note is written. See:

- [Durable-at-commit persistence eliminates unsaved-progress model](../../../.agents/notes/proposed/architecture/2026-08-30-durable-at-commit-persistence.md) — the designed premise for the reconciliation ledger.
- [Quit confirmation design](../../../.agents/notes/proposed/feature/2026-08-30-quit-confirmation-design.md) — intent set, platform behaviour, dialog, provisional-career exception.
