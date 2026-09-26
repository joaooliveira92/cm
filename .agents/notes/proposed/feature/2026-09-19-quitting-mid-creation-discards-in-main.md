# Agent Note: Quitting mid-creation discards in main

Status: proposed

## Problem

Leaving career creation by *navigating* was confirmed and discarded correctly (`fdb9230`). Leaving
it by *quitting* was not: the player got the generic "Are you sure you want to close cm-clone?" and
the provisional world was left on disk unnamed. The generic dialog is worse than none here — it asks
for confirmation of the wrong thing.

Two structural obstacles, neither of them named in the ticket, are why this was not built alongside
its sibling.

**The guard cannot see the session.** `QuitGuard` is mounted outside `<RouterProvider>`, because it
answers a question asked of the application rather than of a route. `CreateSessionContext` lives
inside the router tree. The navigation confirmation sits *inside* the flow and has the session in
hand; the quit dialog does not.

**The renderer cannot win the race.** `confirmQuit()` makes main call `app.quit()`. A renderer-side
`discardCareer` fired just before is an in-flight RPC racing process exit, and losing that race
orphans the exact world the dialog promised to remove — the failure being silent, and indistinguish-
able from success in any renderer test.

## Decision

**The flow publishes one fact; main does the deleting.**

- `create/provisionalCareer.ts` holds `{ present, id }` with a `useSyncExternalStore` subscription.
  The creation flow publishes from an effect on its generation state; `QuitGuard` subscribes. The
  two fields are not redundant: while `beginCareer` is in flight a world is being built and the
  player must be warned, but there is no id yet to name. `present` drives the copy, `id` the discard.
- The id travels with the confirmation — `confirmQuit(discardSaveId?)` →
  `ipcRenderer.send("quit-guard-confirmed", id)` → `main/quit.ts` deletes, then quits. Main owns the
  exit, so it cannot lose the race to it.
- `quit` runs whether or not the delete succeeded. A player who asked to leave must leave: a failed
  delete costs a stranded file, and `discardCareer` is idempotent so a later pass can still clean it
  up. Failing closed would mean an application the player has to kill.
- The dialog's shape is `DiscardCareerDialog`'s. Leaving by navigating and leaving by quitting are
  the same loss, and a player who has seen one should recognise the other.

## Alternatives considered

- **Move `QuitGuard` inside the router.** Rejected: the mount position is deliberate and documented
  in `theme.ts`, and the guard would become route state to answer an application question.
- **Lift the creation session to application state.** Rejected for the mirror reason. One fact
  crossing the boundary is a smaller claim than a session crossing it.
- **Let main track the provisional career itself**, recording the id at `beginCareer` and clearing
  it at `commitCareer`/`discardCareer`. Genuinely attractive: main would know even if the renderer
  crashed, and it would close the mid-build gap below. Rejected *for now* because it makes the RPC
  server stateful, which is an architectural change larger than this ticket and one that deserves
  to be decided on its own terms rather than smuggled in.
- **Discard in the renderer and hope.** Rejected: that is the race, and it is invisible when lost.

## Consequences

- **A pre-existing bug surfaced and is fixed.** `useDialogKeyboard` claims the keyboard in a mount
  effect, and the hook was called in `QuitGuard` — mounted for the life of the app, merely returning
  `null` until asked. The effect ran once at startup with nothing to focus, so the quit dialog never
  took initial focus and never restored it on close, in *either* variant. The dialog body is its own
  component now, so the hook's lifetime is the dialog's. Confirmed against `HEAD` before changing
  anything, and covered by a regression test on the generic variant, where the bug lived.
- **A gap remains, deliberately.** Quitting *during* `beginCareer` warns correctly but discards
  nothing: `leavingDiscardsWorld` is true in `Running` while `provisionalIdOf` is null, so there is
  no id to hand over. Closing it is the third alternative above.
- `main/quit.ts` exists so the guarantee is testable against a real save file. The ordering — gone
  before `quit` is called, not merely both having happened — is the assertion worth making, and it
  is not one a renderer test can make.
