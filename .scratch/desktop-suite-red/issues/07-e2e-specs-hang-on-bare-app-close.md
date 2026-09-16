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

**Status:** ready-for-agent

- [ ] Neither spec hangs on close
- [ ] `keybindings.spec.ts`'s stored-binding and relaunch assertions execute and pass
- [ ] `journeys.spec.ts`'s save-restart journey executes past the close
