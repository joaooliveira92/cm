# Screen 21: Quit Game Confirmation

> **Clean-room notice:** Use original interface text and visuals. The workflow must protect unsaved career progress and distinguish quitting the career from closing the application.

## 1. Purpose

The **Quit Game Confirmation** screen prevents accidental loss of progress when leaving a career or closing the application.

It must allow the user to:

- Cancel and return to the game.
- Save and quit.
- Quit without saving when permitted.
- Understand whether local progress, cloud synchronization, multiplayer state, or background transactions remain pending.
- Wait for or safely cancel ongoing operations.
- Return to the Main Menu or close the application according to the initiating action.

## 2. Quit intents

```typescript
type QuitIntent =
  | "return_to_main_menu"
  | "close_application"
  | "leave_multiplayer_session"
  | "switch_career"
  | "restart_application";
```

The dialog must state the actual destination.

## 3. Conceptual layout

```text
+--------------------------------------------------------------------------+
| QUIT CAREER?                                                             |
|--------------------------------------------------------------------------|
| North United Journey                                                     |
|                                                                          |
| Unsaved progress exists.                                                 |
| Last successful save: 18 March 2005, 21:47                               |
| Current career date: 15 February 2005                                    |
|                                                                          |
| Cloud status: Local save synchronized                                    |
| Multiplayer status: All commands synchronized                            |
|                                                                          |
| [Cancel] [Quit Without Saving]                           [Save and Quit] |
+--------------------------------------------------------------------------+
```

No-unsaved-progress version:

```text
Quit to Main Menu?

All career progress is saved.

[Cancel] [Quit to Main Menu]
```

## 4. Unsaved-progress model

```typescript
interface UnsavedCareerState {
  readonly hasCanonicalChanges: boolean;
  readonly currentCareerRevision: number;
  readonly lastSavedCareerRevision?: number;
  readonly currentSequenceNumber: number;
  readonly lastSavedSequenceNumber?: number;
  readonly pendingLocalTransactions: readonly string[];
  readonly pendingNetworkCommands: readonly string[];
  readonly pendingCloudSynchronization: boolean;
}
```

Cloud upload pending does not necessarily mean canonical local progress is unsaved. Communicate these states separately.

## 5. Save and Quit

`Save and Quit` must:

1. Revalidate the quit intent.
2. Open or execute the standard Save Game workflow.
3. Wait for a local durable save.
4. Report cloud synchronization separately.
5. Stop simulation services safely.
6. Leave multiplayer sessions through the authoritative protocol.
7. Release runtime locks and resources.
8. Navigate to the requested destination.

If saving fails, remain in the career or confirmation flow. Do not quit automatically.

## 6. Quit Without Saving

This action discards canonical changes made after the last durable save revision.

It should be available only when:

- Policy permits it.
- No nonrollbackable transaction is committing.
- Multiplayer authority allows leaving.
- The user has permission to abandon unsaved host state.

Use a stronger secondary confirmation when substantial progress would be lost.

```text
Quit without saving?

Progress since the last save will be lost. This includes 9 in-game days and one
completed fixture.

[Keep Playing] [Quit Without Saving]
```

The loss summary should be authoritative and bounded, not guessed from UI history.

## 7. Pending operations

Potential blockers:

- Save promotion.
- Career migration.
- Manager activation or retirement.
- Match transaction commit.
- Day-processing commit.
- Network command synchronization.
- Cloud conflict resolution.

The screen should display:

```text
Finishing a safe career operation before quitting...
```

It must not offer force termination that risks canonical corruption, except the operating system may still terminate the process externally.

## 8. Cloud synchronization

If the local save is durable but upload is pending:

```text
Career is saved locally. Cloud synchronization is still pending.

[Wait for Sync] [Quit and Sync Later] [Cancel]
```

`Quit and Sync Later` is available only when the provider queue is durable.

## 9. Multiplayer behavior

For a client participant:

- Send a leave request.
- Flush acknowledged commands.
- Preserve manager ownership.
- Mark the participant disconnected.
- Do not retire the manager.

For a host:

- Save authoritative state when requested.
- Apply host migration policy.
- Notify participants.
- Block unsafe shutdown during an authoritative transaction.
- Avoid treating client caches as a replacement for a host save.

## 10. Host warning

```text
You are hosting a career with 3 connected participants.

Closing the session will disconnect them. The career will be saved before the
host closes unless you cancel.
```

If host migration is supported, offer it through a separate explicit action.

## 11. Quit command

```typescript
interface RequestQuitCommand {
  readonly careerId?: string;
  readonly expectedCareerRevision?: number;
  readonly intent: QuitIntent;
  readonly saveDecision: "save" | "discard" | "not_required";
  readonly controllerContextId: string;
  readonly acknowledgmentFingerprint?: string;
  readonly requestId: string;
}
```

The authoritative coordinator determines whether the selected decision remains valid.

## 12. Idempotency

Repeated quit requests with the same request ID must:

- Return the current quit transaction state.
- Avoid duplicate saves.
- Avoid sending duplicate multiplayer leave messages.
- Avoid repeated resource disposal.
- Return the original completed result where possible.

## 13. Shutdown sequence

```text
Validate quit request
  -> Reach safe simulation boundary
  -> Save if selected
  -> Complete or queue cloud sync
  -> Stop simulation clock
  -> Close match and processing workers
  -> Leave or close multiplayer session
  -> Flush safe logs and preferences
  -> Release save and career locks
  -> Dispose runtime resources
  -> Navigate to Main Menu or close process
```

Disposal must be deterministic and bounded.

## 14. State model

```typescript
interface QuitConfirmationState {
  readonly intent: QuitIntent;
  readonly careerId?: string;
  readonly unsavedState?: UnsavedCareerState;
  readonly localSaveState: "not_required" | "required" | "saving" | "saved" | "failed";
  readonly cloudState: "not_configured" | "synchronized" | "pending" | "failed" | "offline";
  readonly multiplayerState?:
    "not_applicable" | "client" | "host" | "host_migration_available" | "synchronizing";
  readonly blockingOperations: readonly string[];
  readonly transactionState:
    | "reviewing"
    | "waiting_for_safe_boundary"
    | "saving"
    | "leaving_session"
    | "disposing"
    | "completed"
    | "failed";
}
```

## 15. State transitions

```text
EVALUATING_QUIT
  |
  v
READY
  |
  +-- Cancel ----------------------------> CAREER
  |
  +-- Save and Quit -> SAVE_WORKFLOW
  |                       |
  |                       +-- failed -> READY_WITH_ERROR
  |                       +-- success -> DISPOSING -> DESTINATION
  |
  +-- Quit Without Saving -> CONFIRM_DISCARD
                                  |
                                  +-- cancel -> READY
                                  +-- confirm -> REVERTING_RUNTIME -> DISPOSING
```

## 16. Failure states

```text
The career could not be saved. The game remains open and your current progress
is still available in memory.
```

```text
The multiplayer session could not close safely. Retry or return to the career.
```

```text
The application could not release one or more runtime resources. A safe shutdown
will be attempted again.
```

Do not claim the process closed until it actually transitions.

## 17. Application close without active career

When no career is active, the dialog may simply confirm application exit.

It should still consider:

- Pending cloud uploads.
- Preference writes.
- Background downloads.
- Recoverable transactions.

## 18. Accessibility

- State the exact destination in the title and actions.
- Focus Cancel by default when unsaved progress exists.
- Associate the loss summary with Quit Without Saving.
- Announce save, sync, multiplayer leave, and shutdown progress.
- Do not use color alone for destructive or safe states.
- Support keyboard-only operation and 200% scaling.
- Keep button order consistent with platform conventions while preserving the safe default.

## 19. Keyboard interaction

- `Escape`: Cancel and return to the career.
- `Enter`: activate the focused action.
- `Tab` and `Shift+Tab`: move between actions.
- `Ctrl+S`: select Save and Quit only when clearly defined by policy.
- No shortcut may activate Quit Without Saving without its required confirmation.

## 20. Security and integrity

- Recalculate unsaved state in a trusted process.
- Use expected career revisions and idempotency keys.
- Never trust renderer claims that a save completed.
- Do not terminate during atomic save promotion.
- Preserve local durability separately from cloud state.
- Enforce host and participant permissions.
- Sanitize manager, career, and provider labels.

## 21. Edge cases

- Save completes while the dialog is open: refresh to the no-unsaved-progress state.
- Autosave starts: join, wait, or queue according to save policy.
- Cloud provider goes offline: allow locally safe exit when the upload queue is durable.
- Host loses network connection: apply host recovery policy.
- Current match reaches a safe boundary: resume shutdown automatically.
- Same quit request retries after timeout: return current status.
- Operating system requests shutdown: use the same bounded safe-shutdown coordinator.

## 22. Acceptance criteria

1. The dialog names the actual quit destination.
2. Unsaved local progress and pending cloud synchronization remain distinct.
3. Save and Quit uses the standard validated save transaction.
4. Save failure never closes the career automatically.
5. Quit Without Saving requires explicit consequential confirmation.
6. Pending canonical commits block unsafe disposal.
7. Multiplayer client leave does not retire the manager.
8. Host shutdown follows authoritative save and migration policy.
9. Duplicate requests do not duplicate saves or leave messages.
10. Runtime resources are disposed deterministically.
11. Cancel always returns safely before shutdown commit.
12. Keyboard and assistive-technology users can understand and select every outcome.
13. No proprietary source-game assets or wording are required.

## 23. Recommended tests

- Quit with no unsaved progress.
- Save and quit successfully.
- Save failure.
- Quit without saving with second confirmation.
- Pending cloud upload.
- Cloud offline with durable queue.
- Client leaves multiplayer.
- Host closes multiplayer.
- Safe-boundary wait.
- Duplicate quit request.
- Operating-system shutdown request.
- Keyboard and screen-reader flow.

## Suggested Git commit

```text
docs(game-ui): specify quit game confirmation workflow
```
