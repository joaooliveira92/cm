# group-a-reconciliation ticket 22 — the Quit dialog's provisional variant

**Outcome:** resolved. group-a-reconciliation is complete — the last open ticket in the effort.

## What the ticket asked for, and what it did not say

A player quitting mid-creation got the generic "Are you sure you want to close cm-clone?" while the
provisional world was left on disk, unnamed and uncleaned. Ticket 03 shipped six of its seven
criteria; this was the seventh.

Two structural obstacles explain why it was never built alongside `fdb9230`, which solved the same
problem for *navigating* away. Neither is in the ticket.

**The guard cannot see the session.** `QuitGuard` is mounted outside `<RouterProvider>` — documented
in `theme.ts` as deliberate, because it answers a question asked of the application, not of a route.
`CreateSessionContext` lives inside the router tree. Its sibling confirmation sits inside the flow
and has the session in hand.

**The renderer cannot win the race.** `confirmQuit()` makes main call `app.quit()`. A renderer-side
`discardCareer` fired just before it is an in-flight RPC racing process exit. Losing that race
orphans the exact world the dialog promised to remove, and the loss is silent — indistinguishable
from success in any renderer test.

## Design

The flow publishes one fact; main does the deleting.

- `create/provisionalCareer.ts` holds `{ present, id }` behind `useSyncExternalStore`. The two
  fields are not redundant: while `beginCareer` is in flight a world is being built and the player
  must be warned, but no id exists yet to name. `present` drives the copy, `id` the discard.
- The id travels with the confirmation — `confirmQuit(discardSaveId?)` → IPC → `main/quit.ts`
  deletes, then quits. Main owns the exit, so it cannot lose the race to it.
- `quit` runs either way. A failed delete costs a stranded file, not an application the player has
  to kill; `discardCareer` is idempotent, so a later pass can still clean up.
- The dialog's shape is `DiscardCareerDialog`'s, per the ticket's instruction to reuse rather than
  invent: leaving by navigating and leaving by quitting are the same loss.

## A pre-existing bug, found and fixed

Writing the focus test showed the **generic** dialog never took initial focus either.
`useDialogKeyboard` claims the keyboard in a mount effect, and the hook was called in `QuitGuard`,
which stays mounted for the life of the app and merely returned `null` until asked. The effect ran
once at startup with no dialog on screen — so the quit dialog opened with focus wherever it happened
to be and never handed it back on close. Both halves of the hook's contract, silently unmet since
the guard was written.

Verified as pre-existing by probing `HEAD` before changing anything, rather than assumed. Fixed by
making the dialog body its own component, so the hook's lifetime is the dialog's. The regression
test sits on the generic variant, which is where the bug actually lived.

## Validation

- `quitGuard/QuitGuard.test.tsx` — both variants, the id reaching `confirmQuit`, the mid-build case,
  focus on the safe choice in both, and the generic-variant focus regression.
- `main/quit/confirm-quit.test.ts` — the deleting half against a real save on disk. Criterion 5 asks
  that the discard *actually happens*, which no renderer test can show. One case asserts the file is
  already gone **at the moment `quit` is called**, because the ordering is the whole reason this
  lives in main.
- `create/provisional-career.test.ts` — the store.
- `create/flow-leave-confirmation.test.tsx` — the publishing end, through the real router.
- `pnpm check:all` green.

## Known gap, recorded not hidden

Quitting *during* `beginCareer` warns correctly but discards nothing: the renderer has no id to hand
over. This is the pre-existing shape of the `Running` state — `leavingDiscardsWorld` true,
`provisionalIdOf` null — and closing it means main tracking the provisional career itself instead of
being told about it, which makes the RPC server stateful. That is a larger architectural call than
this ticket, and it is written down in the note rather than left to be rediscovered.
