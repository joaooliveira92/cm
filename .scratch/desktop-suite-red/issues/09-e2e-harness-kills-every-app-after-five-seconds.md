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

**Status:** claimed

- [ ] A normal e2e teardown quits gracefully, well under `CLOSE_TIMEOUT_MS`
- [ ] The kill fallback still bounds a wedged app
- [ ] The comments name the quit guard
