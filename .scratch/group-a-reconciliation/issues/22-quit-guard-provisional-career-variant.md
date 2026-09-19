# 22: The Quit dialog has no provisional-career variant

Split from [03 — Quit confirmation](03-quit-confirmation.md) on 2026-09-18. Ticket 03 shipped six of
its seven acceptance criteria and was closed on those; this is the seventh, which was never built and
would otherwise have been lost when 03 closed.

**What is missing.** `QuitGuard.tsx` has a single module constant —
`const QUIT_BODY = "Are you sure you want to close cm-clone?"` — and no branch for quitting mid
career-creation. Verified: the provisional copy ("Your incomplete career creation will be lost")
appears nowhere under `apps/`, there are no Continue / "Discard & Quit" buttons, and no
`discardCareer`-on-shutdown path exists.

So a player who quits partway through creating a career is told only that the app will close, and the
provisional world on disk is left behind without being named or cleaned up. The generic dialog is
strictly worse than no dialog here: it asks for confirmation of the wrong thing.

Acceptance:
- [x] When a career is provisional (built but not committed), the Quit dialog says what is lost
- [x] Its actions distinguish continuing from discarding, rather than offering one Quit
- [x] Discarding removes the provisional world rather than orphaning it on disk
- [x] A committed career still gets the existing generic dialog, unchanged
- [x] A test covers both variants, and the provisional one asserts the discard actually happens

Note the adjacent precedent: `fdb9230` ("leaving a built world is confirmed, not assumed") already
solved the same problem for *navigating* away from a provisional career. This should reuse that
confirmation's shape and its discard path rather than inventing a second one.

**Blocked by:** None

**Status:** resolved

## Answer

### The problem the ticket did not name

`QuitGuard` is mounted outside `<RouterProvider>` — deliberately, because it answers a question
asked of the application rather than of a route — so it cannot read `CreateSessionContext`, which
lives inside the router tree. That is why this was never built alongside `fdb9230`: the navigation
confirmation sits *inside* the flow and has the session in hand, and the quit dialog does not.

Moving either one would have been the wrong trade. The guard would become route state, or the
creation session would become application state, and neither is true. So the flow publishes one
fact and the guard subscribes to it: `create/provisionalCareer.ts`, a store holding
`{ present, id }` with a `useSyncExternalStore` subscription.

The two fields are not redundant. While `beginCareer` is in flight a world is being built and the
player must be warned, but the renderer has no id yet and can name nothing to delete. `present`
drives the copy; `id` drives the discard.

### The race the ticket did not name either

`confirmQuit()` makes main call `app.quit()`. A renderer-side `discardCareer` fired just before it
is an in-flight RPC racing process exit, and losing that race orphans the exact world the dialog
promised to remove — which is criterion 3 failing quietly.

So the id travels *with* the confirmation, and main does the deleting:
`confirmQuit(discardSaveId?)` → `ipcRenderer.send("quit-guard-confirmed", id)` → `main/quit.ts`
deletes, then quits. Main owns the exit, so main cannot lose the race to it.

`quit` runs either way. A player who asked to leave must leave, so a failed delete costs a stranded
file rather than an application they have to kill — and `discardCareer` is idempotent, so a later
pass could still clean it up.

### A pre-existing bug this uncovered

Writing the focus test showed the **generic** dialog never took initial focus either.
`useDialogKeyboard` claims the keyboard in a mount effect, and the hook was called in `QuitGuard`,
which stays mounted for the life of the app and merely returned `null` until asked. The effect ran
once at startup with no dialog on screen and nothing to focus, so the quit dialog opened with focus
wherever it happened to be and never handed it back on close — both halves of the hook's contract,
silently unmet since the guard was written.

Verified as pre-existing against `HEAD` before changing anything, rather than assumed. Fixed by
making the dialog body its own component, so the hook's lifetime is the dialog's. Covered by a
regression test on the generic variant, which is where the bug actually lived.

### Tests

- `quitGuard/QuitGuard.test.tsx` — both variants: the provisional copy and its two distinct
  actions, the committed career still getting the generic dialog unchanged, the id reaching
  `confirmQuit`, the mid-build case that warns with no id, focus on the safe choice in both, and
  the generic-variant focus regression.
- `main/quit/confirm-quit.test.ts` — the deleting half, against a real save on disk. Criterion 5
  asks that the discard *actually happens*, which a renderer test cannot show: its part ends at
  handing over the id. One test asserts the file is already gone **at the moment `quit` is called**,
  not merely that both happened, because the ordering is the whole reason this lives in main.
- `create/provisional-career.test.ts` — the store: the mid-build shape, reference stability for
  `useSyncExternalStore`, and the equal-value drop that stops the guard re-rendering at typing speed.
- `create/flow-leave-confirmation.test.tsx` — the publishing end, through the real router: nothing
  before a world exists, the id once one does, and cleared on the way out so a later quit cannot ask
  main to delete a save twice.

### Known gap

Quitting *during* `beginCareer` warns correctly but discards nothing: the renderer has no id to
name, so the half-built world is left on disk. This is the pre-existing gap the `Running` state
already had — `leavingDiscardsWorld` is true there while `provisionalIdOf` is null — and closing it
means main tracking the provisional career itself rather than being told about it. Out of scope
here, and recorded rather than left to be rediscovered.
