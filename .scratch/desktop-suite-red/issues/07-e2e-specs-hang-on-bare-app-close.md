# 07: Two e2e specs hang on a bare `app.close()`

**What to fix:** `apps/desktop/e2e/keybindings.spec.ts:56` (`firstApp.close()`) and
`apps/desktop/e2e/journeys.spec.ts:85` (`app.close()`) close a career-loaded Electron app directly.
Both runs stall on `electronApplication.close()` until the 45s test timeout, then report "Worker
teardown timeout". `launchApp.ts`'s `closeOrKill` exists for exactly this hang and bounds it at 5s.

Found during navbar-keyboard-intent ticket 03, observed with `DEBUG=pw:api` in both the before and
after runs. It hides assertions that have never executed: `keybindings.spec.ts`'s check that
`keybindings.json` stores the rebind, and its relaunch check.

Take care with the persistence test. Killing the app can drop a write that a graceful close would
flush, so confirm the binding is written before close, or wait for it, instead of swapping in
`closeOrKill` and hoping.

**Blocked by:** None

**Status:** resolved

- [x] Neither spec hangs on close
- [x] `keybindings.spec.ts`'s stored-binding and relaunch assertions execute and pass
- [x] `journeys.spec.ts`'s save-restart journey executes past the close

## Answer

Resolved 2026-09-16. The hang comes from the test harness. The app has no defect here, and it does
not depend on a loaded career. Playwright's `close()` runs `app.quit()`, and the `before-quit` guard
in `src/main/index.ts` cancels the quit to show the Quit dialog, which no test answers. A real player
who confirms quits in about 1s.

Both specs now stop the app with `closeOrKill`. `keybindings.spec.ts` first polls `keybindings.json`
until the rebind is on disk, while the app is still running. `setKeyBindingOverride` awaits its
write, so the old comment "only flushed on shutdown" was wrong. The relaunch assertion now proves the
binding survives a hard stop. `journeys.spec.ts` loses nothing to the kill: `seedFresh` writes the
save before launch, and opening it reads through `readonly` clients.

Follow-ups: [09](09-e2e-harness-kills-every-app-after-five-seconds.md) (every harness close pays 5s
and SIGKILL) and
[group-a-reconciliation 20](../../group-a-reconciliation/issues/20-quit-dialog-hidden-under-router-overlays.md)
(the Quit dialog paints under router overlays).
