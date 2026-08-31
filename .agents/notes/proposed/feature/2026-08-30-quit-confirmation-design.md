# Agent Note: Quit confirmation design — one intent, one exception, before-quit guard

Status: proposed

## Problem

Screen 21 of the imported Group A spec describes a quit confirmation dialog with five `QuitIntent` values, an `UnsavedCareerState` model, cloud and multiplayer status lines, save-vs-discard branching, and a multi-step shutdown pipeline. Durable-at-commit persistence eliminates the unsaved-progress axis entirely (see durable-at-commit note). The remaining design question is: what does the actual quit confirmation look like for a local single-player Electron app that has no unsaved state to protect?

## Proposal

### Intent set: exactly one

Only `close_application` is guarded. The other spec intents are register entries:

- `return_to_main_menu` → just navigation to the Save List via the existing `g b` binding or a UI back control. Cheap, reversible, no prompt.
- `leave_multiplayer_session` → out of scope (no multiplayer axis).
- `switch_career` → out of scope (single-manager, one save at a time).
- `restart_application` → out of scope (no application restart command in a local Electron app; the user relaunches manually).

### The one exception: the provisional career

The creation flow (`beginCareer` → club selection → `commitCareer`) creates a provisional SQLite world that is invisible to `listSaves`. If the user closes the application before `commitCareer`, that work is lost. This is the only scenario where closing destroys user-visible state.

The guard shows an informational dialog: "You'll lose this incomplete career creation. Are you sure?" with Continue (return to creation flow, dismisses the guard) and Discard & Quit (close the app; cleanup via `discardCareer` runs during shutdown). Not a general save-vs-discard choice — the creation state is not recoverable, so the prompt explains the consequence rather than asking the user to choose between recovery paths.

### Platform behaviour

The guard sits on Electron's `before-quit` event in the main process. This fires once for every quit path on every platform:

- **macOS**: Cmd+Q fires `before-quit`. Closing the last window does not (standard Cocoa convention — the app stays alive in the dock). No false prompt on window-close.
- **Non-macOS**: Both window-close and Cmd+Q (Ctrl+Q) route through `app.quit()` → `before-quit`. Either triggers the guard.

The renderer sends a `canQuit: boolean` flag over an IPC channel (`cm-quit` in the preload bridge). `before-quit` blocks `app.quit()` until the renderer sets `canQuit = true` (user confirmed or no guard needed). On timeout or renderer crash, the guard falls through to quit — a crashed renderer cannot show a dialog, so the guard should not prevent termination.

### Dialog

- **Title**: "Quit"
- **Body**: "Are you sure you want to close [AppName]?" (standard form)
- **When provisional**: "Your incomplete career creation will be lost. Are you sure?"
- **Buttons**: Cancel (default, Enter) and Quit (tab-order second)
- **Escape**: cancels (same as Cancel)
- **No keyboard shortcut** for confirming quit. The dialog is the only way to reach the quit action (besides the window close button on non-macOS). Cmd+Q remains unhandled at the renderer level — Electron's default menu bar intercepts it and routes to the main process quit path.
- **Focus trap**: standard modal focus trapping (the existing `dialogKeyboard.ts` pattern). Default button is Cancel.

### Where the dialog lives

A quit confirmation dialog is a modal overlay rendered by a new `QuitGuard` component in the renderer's overlay layer, triggered by the main process sending a `show-quit-guard` event. Not a route (no URL), not a screen (no destination entry in `NavigationDestination`). This matches the Retire pattern (ticket 07): a dialog owned by the surface that launches it.

### Quit binding

No global keyboard action is registered for quitting. The quit action is reachable through:
- Window close button (non-macOS)
- App menu (macOS default Quit item, or a custom one)
- No command palette entry
- No `g` key binding

Adding a keyboard shortcut later is possible; v1 deliberately omits one to avoid accidental quit from muscle memory.

## Alternatives considered

- **Per-intent guard on the spec's five `QuitIntent` values.** Rejected because three are out of scope and `return_to_main_menu` is ordinary navigation. The remaining intent is `close_application` — so there is no set to split.

- **Guard on the window `close` event instead of `before-quit`.** Rejected for macOS: `close` fires on every window-close, including the last window on macOS when the app should stay alive. The guard would prompt the user for closing a window, which is normal behaviour on Cocoa. `before-quit` has the correct firing semantics.

- **Renderer-side `beforeunload` handler.** Rejected: Electron's `beforeunload` fires per-renderer on navigation, not on application quit. It also cannot coordinate with the main process's `app.quit()` lifecycle in a clean way.

- **No guard at all (unconditional quit).** Rejected temporarily: the provisional-career exception means unconditional quit would silently destroy user work. Once the creation flow is hardened (crash recovery, durable session state, or other mitigations), unconditional quit becomes viable. Until then, the guard exists primarily for the creation-flow window.

## Acceptance criteria

- Closing the last window on macOS does not prompt (app stays alive, standard Cocoa behaviour).
- Closing the window on non-macOS prompts (goes through `before-quit`).
- Cmd+Q on macOS prompts.
- Ctrl+Q on non-macOS prompts (to the extent it reaches `before-quit`; Electron's default menu does not bind Ctrl+Q on non-macOS, so a custom app menu entry is needed for that platform).
- During creation flow (provisional career exists), the dialog body warns about lost creation state. Outside creation flow, the dialog is the standard "Are you sure?".
- Cancel or Escape returns to the app without quitting.
- Quit closes the app (or discards the provisional career and closes).
- On renderer crash or timeout, the guard does not block termination — `before-quit` falls through.

## Risks

- **No keyboard shortcut to quit.** Power users accustomed to Cmd+Q will find it still works (Electron's default menu bar provides it), but it goes through the guard and prompts. The slight friction is intentional for v1. Revisit if user feedback shows the guard is annoying for committed careers.

- **`before-quit` timing.** Electron fires `before-quit` early in the shutdown sequence. If the renderer is unresponsive (frozen, in a long RPC, crashed), the IPC handshake for `canQuit` may never arrive. The timeout-and-fall-through behaviour handles this: a crashed renderer is the unsafe case, and blocking termination would make it worse.

- **Provisional-career cleanup on quit.** `discardCareer` runs as part of the quit path when a provisional exists. If the discard fails (I/O error on the SQLite file), the quit still proceeds — the provisional file is dangling disk state until the next startup garbage collection (see new-game-flow-sequence note's unresolved fog). Acceptable for v1.