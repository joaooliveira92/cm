# 09: The e2e harness waits 5s and then kills every app it closes

**What to fix:** `closeOrKill` in `apps/desktop/e2e/launchApp.ts` never finishes a graceful close.
Playwright's `ElectronApplication.close()` calls `app.quit()`, and the app's `before-quit` guard
(`src/main/index.ts`) cancels it to show the Quit dialog whenever a window exists. Every close
therefore waits the full `CLOSE_TIMEOUT_MS` and ends in SIGKILL. That covers the `app` fixture
teardown and every `launchExtraApp`, and costs about 5s for each app the suite launches.

The comments on `CLOSE_TIMEOUT_MS`, `closeOrKill` and `launchExtraApp` blame "a wedged renderer".
The cause the review of ticket 07 confirmed is the unanswered quit guard.

Found during [ticket 07](07-e2e-specs-hang-on-bare-app-close.md).

Suggested fix: confirm the guard from the harness before closing (the main process listens on
`quit-guard-confirmed`), keep the kill as the fallback for a genuinely wedged app, and correct the
comments. Confirming through the renderer's dialog is blocked while a router overlay covers it
(group-a-reconciliation ticket 20), so confirm through main.

**Blocked by:** None

**Status:** resolved

- [x] A normal e2e teardown quits gracefully, well under `CLOSE_TIMEOUT_MS`
- [x] The kill fallback still bounds a wedged app
- [x] The comments name the quit guard

## Answer

Resolved 2026-09-16. `closeOrKill` now confirms the quit guard from main with
`app.evaluate(({ ipcMain }) => ipcMain.emit("quit-guard-confirmed"))` and then calls `app.close()`.
The listener takes no arguments, and it only sets `quitGuardConfirmed` and quits, which is exactly
what the dialog's Quit button sends. The `evaluate` and the close share the `CLOSE_TIMEOUT_MS`
ceiling, and SIGKILL remains the fallback. No product code changed.

Evidence, gathered by the implementator with temporary timing logs (since removed):

- All 10 closes in a keybindings and router run returned in 138–155ms with `exitCode=0`, and none
  took the kill path.
- A throwaway probe that busy-looped main showed `closeOrKill` killing it and returning in 5055ms.
- `keybindings.spec.ts` plus `router.spec.ts` went from 1.1m to 15.6s.

The comments in `launchApp.ts`, `keybindings.spec.ts`, `journeys.spec.ts` and `playwright.config.ts`
now name the quit guard.
