# 08 — Screen 21: Quit confirmation as an accident guard

Type: grilling
Status: open
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

## Done when

The guarded intent set, the provisional-career decision, and the dialog behaviour are specified.

**Owed by ticket 02.** Screen 21's `contradicted` ledger rows currently anchor to the domain-bounded
deciders note, which establishes the single-writer local SQLite premise but never states "there is no
unsaved progress". This ticket owes that explicit Agent Note, and the reanchoring of those rows in
`docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md`. The out-of-scope
and renamed rows for this screen are already written there; this ticket adds the design rows.
