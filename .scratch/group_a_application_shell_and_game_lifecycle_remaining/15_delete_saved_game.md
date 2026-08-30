# Screen 15: Delete Saved Game

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, databases, source code, logos, exact interface wording, or other protected assets. Use an original visual identity and fictional or properly licensed football data.

---

## 1. Purpose

The **Delete Saved Game** workflow removes one or more selected save artifacts without accidentally deleting unrelated versions, backups, cloud branches, or the currently active career.

It is normally opened from **Load Saved Game**, **Manage Saves**, cloud-conflict review, or storage-management settings.

The workflow must allow the user to:

- Identify exactly which save, revision, location, and backup set will be affected.
- Delete one revision, one save identity, or selected local and cloud copies according to permission and policy.
- Distinguish soft deletion from permanent deletion.
- Preserve protected backups and recovery checkpoints unless explicitly authorized.
- Prevent deletion of a save currently being loaded, written, migrated, synchronized, or used as the active career.
- Warn when deleting the only valid revision of a career.
- Handle multiplayer host ownership and participant permissions.
- Move eligible saves to a trash or recycle area when supported.
- Restore soft-deleted saves within the retention period.
- Perform permanent deletion only after an appropriately strong confirmation.
- Recover safely from partial local or cloud deletion failures.
- Return to the save library with a consistent selection and focus state.

Deletion must be scoped, transactional where possible, and explicit about what remains recoverable.

---

## 2. Entry points

```text
Load Saved Game
  -> Select save
  -> Delete
  -> Delete Saved Game
```

```text
Manage Saves
  -> Select one or more revisions
  -> Delete
```

```text
Cloud Conflict Review
  -> Remove one branch
  -> Delete Saved Game
```

```text
Trash or Deleted Saves
  -> Permanently Delete
```

The workflow may appear as a modal dialog for a simple single-version deletion or a full screen for multi-location and multi-revision deletion.

---

## 3. Core concepts

### 3.1 Save identity

A save identity groups one or more immutable revisions under a stable library entry.

### 3.2 Save revision

A save revision is one completed immutable version of a save identity.

### 3.3 Save copy

A save copy is one repository-specific representation of a revision, such as a local copy or cloud copy.

### 3.4 Soft delete

Soft delete removes the save from the normal library and places it in a recoverable trash state until the retention deadline.

### 3.5 Permanent delete

Permanent delete removes the selected artifact from the target repository without an ordinary restore path.

### 3.6 Protected save

A protected save is a revision or identity that policy prevents from ordinary deletion.

Examples:

- Migration backup.
- Recovery checkpoint.
- User-marked milestone.
- Last known valid revision while a newer revision is unverified.
- Server-authoritative multiplayer save.

### 3.7 Active save

An active save is associated with the currently running career session.

Deleting it while the career is open can break future Save Game behavior and recovery expectations, so it requires a separate lifecycle policy.

### 3.8 Deletion plan

A deletion plan is an authoritative preview of every artifact to remove, retain, soft-delete, or skip.

---

## 4. Deletion scopes

```typescript
type SaveDeletionScope =
  | "selected_revision"
  | "selected_repository_copy"
  | "save_identity_all_revisions"
  | "local_copies_only"
  | "cloud_copies_only"
  | "all_known_copies"
  | "trash_item_permanent";
```

The available scopes depend on repository capabilities, ownership, protection state, and whether the save is active.

---

## 5. Deletion modes

```typescript
type SaveDeletionMode = "soft_delete" | "permanent_delete";
```

Soft delete should be the default when supported.

Permanent deletion should never masquerade as ordinary removal from the library.

---

## 6. Entry contract

```typescript
interface OpenDeleteSaveRequest {
  readonly selectedSaveId: string;
  readonly selectedRevisionIds: readonly string[];
  readonly selectedRepositoryIds: readonly string[];
  readonly expectedLibraryRevision: number;
  readonly controllerContextId: string;
  readonly sourceRoute: string;
}
```

Before presenting a deletion plan, verify:

- The save identity exists.
- Selected revisions still exist.
- Selected repositories are known.
- The current controller may inspect deletion details.
- The save is not hidden by a changed ownership policy.
- Current protection, synchronization, and active-operation states are available.

---

## 7. Conceptual single-save dialog

```text
+--------------------------------------------------------------------------+
| DELETE SAVED CAREER                                                      |
|--------------------------------------------------------------------------|
| North United Journey                                                     |
| Manual save                                                              |
| Career date: 12 February 2005                                            |
| Last saved: 18 March 2005, 21:47                                         |
|                                                                          |
| Selected copies                                                          |
| [x] Local Saves             438 MB             Move to Trash             |
| [ ] Cloud Storage           Synchronized       Keep                      |
|                                                                          |
| Earlier local backups: 3 retained                                        |
| Protected recovery checkpoints: 1 retained                               |
|                                                                          |
| The selected local copy can be restored for 30 days.                     |
|                                                                          |
| [Cancel]                                       [Move Local Copy to Trash]|
+--------------------------------------------------------------------------+
```

---

## 8. Conceptual permanent-deletion dialog

```text
+--------------------------------------------------------------------------+
| PERMANENTLY DELETE CAREER                                                |
|--------------------------------------------------------------------------|
| This action cannot be undone through the game.                            |
|                                                                          |
| Career: North United Journey                                              |
| Copies: Local Saves and Cloud Storage                                     |
| Revisions: 4                                                              |
| Total size: approximately 1.7 GB                                          |
|                                                                          |
| This includes the only valid playable revision.                           |
|                                                                          |
| Type the save name to continue:                                           |
| [____________________________________________________________]           |
|                                                                          |
| [Cancel]                                           [Permanently Delete]  |
+--------------------------------------------------------------------------+
```

Typed confirmation should be reserved for genuinely high-impact actions, not every ordinary soft delete.

---

## 9. Deletion review screen regions

### 9.1 Header

Display:

- `Delete Saved Career` or `Permanently Delete Saved Career`.
- Save display name.
- Save identity suffix when needed for disambiguation.
- Back or Cancel action.

### 9.2 Save summary

Show:

- Save display name.
- Career date.
- Last saved date.
- Save type.
- Human-manager summary subject to privacy rules.
- Current club or national team when visible.
- Active-career state.

### 9.3 Copy and revision selector

Allow selection of deletable:

- Revisions.
- Local copies.
- Cloud copies.
- Removable-storage copies.
- Imported copies.

### 9.4 Retention and protection summary

Show:

- Backups retained.
- Recovery checkpoints retained.
- Protected revisions skipped.
- Trash retention deadline.
- Cloud-provider retention behavior when known.

### 9.5 Consequence summary

Clearly state:

- What will disappear from the normal library.
- What remains available.
- What can be restored.
- What cannot be restored.
- Whether the career can still be loaded from another copy.

### 9.6 Confirmation controls

Use an appropriate confirmation strength based on risk.

---

## 10. Save deletion target model

```typescript
interface SaveDeletionTarget {
  readonly saveId: string;
  readonly revisionId: string;
  readonly repositoryId: string;
  readonly copyId: string;
  readonly locationType: "local" | "cloud" | "removable" | "imported";
  readonly storedBytes: number;
  readonly state:
    | "available"
    | "trash"
    | "synchronizing"
    | "loading"
    | "writing"
    | "migrating"
    | "locked"
    | "missing";
  readonly protectionReasons: readonly SaveProtectionReason[];
  readonly softDeleteSupported: boolean;
  readonly permanentDeleteSupported: boolean;
}
```

---

## 11. Deletion plan model

```typescript
interface SaveDeletionPlan {
  readonly planId: string;
  readonly saveId: string;
  readonly expectedLibraryRevision: number;
  readonly requestedMode: SaveDeletionMode;
  readonly requestedScope: SaveDeletionScope;
  readonly actions: readonly SaveDeletionPlanAction[];
  readonly retainedTargets: readonly SaveDeletionTarget[];
  readonly skippedTargets: readonly SaveDeletionTarget[];
  readonly totalBytesAffected: number;
  readonly leavesPlayableRevision: boolean;
  readonly removesOnlyValidRevision: boolean;
  readonly affectsActiveCareer: boolean;
  readonly requiresTypedConfirmation: boolean;
  readonly confirmationFingerprint: string;
  readonly warningCodes: readonly string[];
  readonly blockingReasonCodes: readonly string[];
  readonly expiresAt: string;
}
```

A plan expires because repository state can change.

---

## 12. Plan actions

```typescript
type SaveDeletionPlanAction =
  | {
      readonly type: "move_to_trash";
      readonly target: SaveDeletionTarget;
      readonly restoreDeadline?: string;
    }
  | {
      readonly type: "permanent_delete";
      readonly target: SaveDeletionTarget;
    }
  | {
      readonly type: "remove_library_reference";
      readonly target: SaveDeletionTarget;
    }
  | {
      readonly type: "request_cloud_delete";
      readonly target: SaveDeletionTarget;
      readonly providerPolicyId: string;
    };
```

---

## 13. Soft delete behavior

Soft delete should:

1. Acquire a deletion lease.
2. Revalidate the plan.
3. Move or mark the selected artifact as trashed transactionally.
4. Record its original repository and identity.
5. Record deletion and restore deadlines.
6. Remove it from the normal save library.
7. Preserve checksums and manifest metadata needed for restore.
8. Update cloud synchronization intent where applicable.
9. Release the lease.

The actual storage implementation may use:

- Atomic move to a trash directory.
- Provider-native recycle bin.
- Tombstone plus retained immutable object.
- Version-history marker.

---

## 14. Trash retention policy

```typescript
interface SaveTrashPolicy {
  readonly enabled: boolean;
  readonly retentionDays: number;
  readonly maximumTrashBytes?: number;
  readonly purgeOrderPolicyId: string;
  readonly allowManualRestore: boolean;
  readonly allowManualPermanentDelete: boolean;
  readonly preserveProtectedItems: boolean;
}
```

All durations and capacities come from named policy values.

The UI should display an absolute restore deadline, not only a relative duration.

---

## 15. Restore from Trash

Although restoration may live on another screen, deletion metadata must support it.

Restore should:

- Revalidate the original repository.
- Check for save-identity and revision conflicts.
- Restore to the original location when safe.
- Offer another approved repository if the original is unavailable.
- Preserve cloud branch ancestry.
- Never overwrite a newer valid revision silently.

---

## 16. Permanent deletion behavior

Permanent deletion should:

1. Require explicit selection of targets.
2. Rebuild and revalidate the deletion plan.
3. Require the configured strong confirmation.
4. Acquire exclusive deletion leases.
5. Delete or cryptographically retire provider objects according to capability.
6. Update save-library metadata.
7. Update cloud tombstones or synchronization markers.
8. Preserve only minimal non-sensitive audit metadata where required.
9. Report per-target success or failure.

If a repository cannot guarantee immediate physical deletion, explain its actual provider behavior without claiming more.

---

## 17. Confirmation-strength policy

```typescript
interface SaveDeletionConfirmationPolicy {
  readonly softDeleteConfirmation: "single_action" | "dialog";
  readonly permanentDeleteConfirmation: "dialog" | "typed_save_name" | "typed_confirmation_phrase";
  readonly onlyValidRevisionRequiresStrongConfirmation: boolean;
  readonly allCopiesRequiresStrongConfirmation: boolean;
  readonly activeCareerDeletionForbidden: boolean;
}
```

Typed confirmation must compare normalized user input according to an explicit policy and remain accessible to paste and assistive technologies unless security policy has a strong reason otherwise.

---

## 18. Protected saves

Protection reasons may include:

```typescript
type SaveProtectionReason =
  | "active_career"
  | "currently_loading"
  | "currently_writing"
  | "currently_migrating"
  | "currently_synchronizing"
  | "protected_milestone"
  | "required_recovery_checkpoint"
  | "migration_backup"
  | "only_valid_revision"
  | "multiplayer_host_authority"
  | "legal_or_provider_hold";
```

Some protections block deletion. Others require an elevated confirmation or a separate operation.

---

## 19. Active-career behavior

Recommended policy:

- Do not permit deletion of the currently active save identity from this workflow.
- Offer `Save As and Switch Target` or `Close Career First`.

```text
This is the save currently used by the active career.

Create a new save target or close the career before deleting it.

[Save As] [Return to Career]
```

If active-save deletion is supported, it must atomically detach the runtime from the target and establish a safe new target first.

---

## 20. Currently loading or writing

A target involved in an active load, save, migration, or recovery transaction is locked.

The screen should show:

```text
This save is currently being written and cannot be deleted.
```

Do not offer a force-delete action that can corrupt another transaction.

---

## 21. Only valid revision

When the target is the only valid playable revision:

```text
This is the only verified playable revision of the career.

Deleting it will leave no playable copy in the selected repositories.
```

The plan should list any remaining corrupt, incomplete, or incompatible revisions separately and must not count them as valid backups.

---

## 22. Backup visibility

The workflow must show backups relevant to the deletion decision:

- Earlier manual revisions.
- Autosaves.
- Rolling backups.
- Recovery checkpoints.
- Migration backups.
- Cloud version history.

A collapsed summary may be used, but the user needs access to the full affected and retained sets.

---

## 23. Revision-level deletion

When repository policy permits, the user may delete one older revision while keeping the save identity.

Rules:

- Do not delete the latest-valid pointer target without selecting a replacement.
- Do not break ancestry required by delta-encoded storage.
- Do not remove a revision currently used as a migration or recovery base.
- Update history views after completion.

If storage uses differential revisions, deletion may require compaction before removal.

---

## 24. Save-identity deletion

Deleting a save identity means applying a plan to every selected revision and repository copy associated with that identity.

It does not automatically delete related Save As branches with different save IDs.

The UI should state:

```text
Related career branches with different save identities will be retained.
```

---

## 25. Local-only deletion

Deleting local copies only:

- Removes local artifacts.
- Retains cloud copies.
- Changes the library row to cloud-only if remote discovery remains enabled.
- May require redownload before next load.
- Does not create a cloud deletion tombstone.

---

## 26. Cloud-only deletion

Deleting cloud copies only:

- Requires cloud permission and provider availability.
- Retains local copies.
- Must avoid the synchronization engine reuploading the deleted cloud copy unintentionally.
- Records an explicit synchronization decision.

The user must choose whether the local version remains local-only or should be eligible for future upload under a new save identity.

---

## 27. All-known-copies deletion

This is a high-impact action.

The plan must enumerate:

- Every currently known repository.
- Offline or unavailable repositories.
- Copies that could not be verified.
- Provider version history behavior.
- Related branches that remain.

Do not claim all copies are deleted when an offline repository could not be reached.

---

## 28. Offline repository behavior

If a selected repository is offline:

- Block a claim of complete all-copies deletion.
- Allow deletion of currently available copies with an explicit partial outcome.
- Create a pending tombstone only when synchronization policy supports it safely.
- Explain that the remote copy remains until deletion is confirmed.

---

## 29. Cloud deletion tombstones

A tombstone prevents a deleted cloud copy from being recreated automatically by an older local client.

```typescript
interface SaveDeletionTombstone {
  readonly saveId: string;
  readonly revisionId?: string;
  readonly repositoryId: string;
  readonly deletionTransactionId: string;
  readonly deletedAt: string;
  readonly sourceRevision: number;
  readonly expiresAt?: string;
}
```

Tombstones require version and account scoping.

---

## 30. Multiplayer ownership

In multiplayer careers, deletion may require:

- Host permission.
- Co-host permission.
- Server administrator permission.
- Confirmation that no session is active.
- Participant notification according to policy.

A participant who owns one manager does not automatically own the canonical host save.

---

## 31. Multiplayer deletion warning

```text
This is an authoritative network career save used by 4 participants.

Deleting the host copy may prevent the career from resuming. Participant client
caches are not guaranteed recovery sources.

[Cancel] [Review Host Backups]
```

Permanent deletion of an active network host save should normally be blocked.

---

## 32. Delete command

```typescript
interface DeleteSaveCommand {
  readonly deletionPlanId: string;
  readonly expectedLibraryRevision: number;
  readonly expectedPlanFingerprint: string;
  readonly controllerContextId: string;
  readonly confirmationToken: string;
  readonly requestId: string;
}
```

The command references an authoritative plan. It does not submit arbitrary paths or renderer-created target lists.

---

## 33. Idempotency

Deletion is idempotent by request ID.

Repeated requests must:

- Return the active transaction state if still running.
- Return the original result after success.
- Avoid adding duplicate tombstones.
- Avoid repeated provider deletion calls when the provider operation already succeeded.
- Avoid deleting newly created revisions not present in the original plan.

---

## 34. Deletion lease

```typescript
interface SaveDeletionLease {
  readonly leaseId: string;
  readonly saveId: string;
  readonly targetCopyIds: readonly string[];
  readonly deletionTransactionId: string;
  readonly ownerContextId: string;
  readonly acquiredAt: string;
  readonly expiresAt?: string;
}
```

The lease prevents save, load, migration, duplication, and conflicting deletion operations from using the same targets.

---

## 35. Transaction pipeline

```text
Load current save topology
  -> Build authoritative deletion plan
  -> Present consequences
  -> Collect required confirmation
  -> Refresh and revalidate plan
  -> Acquire deletion leases
  -> Soft-delete or remove each target transactionally
  -> Write tombstones where required
  -> Update latest-valid pointers and library indexes
  -> Validate retained topology
  -> Release leases
  -> Report result
```

For multi-repository deletion, use a saga or compensating transaction model because full distributed atomicity may not be available.

---

## 36. Partial deletion outcomes

Possible result states:

```typescript
type SaveDeletionResultState =
  | "completed"
  | "completed_with_warnings"
  | "partially_completed"
  | "cancelled_before_changes"
  | "failed_without_changes"
  | "recovery_required";
```

Never summarize partial completion as complete success.

---

## 37. Compensation behavior

When one repository operation fails after another succeeds:

- Restore soft-deleted local items if safe and policy requires all-or-nothing behavior.
- Retain successful permanent deletion and report partial completion when restoration is impossible.
- Preserve tombstones consistent with actual provider state.
- Provide a Retry Remaining action.
- Do not repeat already completed destructive operations blindly.

---

## 38. Deletion result model

```typescript
interface SaveDeletionResult {
  readonly deletionTransactionId: string;
  readonly state: SaveDeletionResultState;
  readonly saveId: string;
  readonly targetResults: readonly SaveDeletionTargetResult[];
  readonly retainedPlayableRevisionIds: readonly string[];
  readonly freedBytes?: number;
  readonly pendingRemoteOperations: readonly string[];
  readonly warningCodes: readonly string[];
  readonly completedAt: string;
}
```

---

## 39. Deletion progress

For multi-repository or large trash moves, show progress:

```text
Deleting saved career...

[x] Validating selected copies
[x] Moving local revisions to Trash
[>] Requesting cloud deletion
[ ] Updating save library

2 of 3 selected copies processed

[Show Details]
```

Permanent deletion may not be cancellable after a provider has accepted the destructive request.

---

## 40. Cancellation behavior

Before changes begin, Cancel closes the workflow.

After deletion begins:

- Cancel may stop unstarted target operations.
- Completed deletions remain completed unless soft-delete compensation is supported.
- The UI must explain that cancellation cannot restore already permanently deleted data.
- The result becomes partial when appropriate.

Do not show a misleading unrestricted Cancel button during irreversible operations.

---

## 41. State model

```typescript
interface DeleteSavedGameScreenState {
  readonly saveId: string;
  readonly libraryRevision: number;
  readonly targets: readonly SaveDeletionTarget[];
  readonly selectedScope: SaveDeletionScope;
  readonly selectedMode: SaveDeletionMode;
  readonly plan?: SaveDeletionPlan;
  readonly confirmationInput: string;
  readonly confirmationSatisfied: boolean;
  readonly issues: readonly SaveDeletionIssue[];
  readonly operationState:
    | "loading"
    | "ready"
    | "planning"
    | "awaiting_confirmation"
    | "revalidating"
    | "acquiring_leases"
    | "deleting"
    | "updating_library"
    | "completed"
    | "partially_completed"
    | "failed";
}
```

---

## 42. State transitions

```text
LOADING_SAVE_TOPOLOGY
  |
  v
READY
  |
  +-- change scope or mode -> BUILDING_PLAN -> READY_WITH_PLAN
  |
  +-- Delete -------------> VALIDATING_CONFIRMATION
                                 |
                                 +-- invalid -> READY_WITH_ERRORS
                                 +-- stale plan -> BUILDING_PLAN
                                 +-- valid -> ACQUIRING_LEASES
                                                  |
                                                  v
                                              DELETING
                                                  |
                                                  v
                                        UPDATING_LIBRARY
                                                  |
                       +--------------------------+--------------------+
                       |                          |                    |
                       v                          v                    v
                   COMPLETED            PARTIALLY_COMPLETED         FAILED
```

---

## 43. Commands and events

### 43.1 Commands

```text
OPEN_DELETE_SAVE
SET_DELETION_SCOPE
SET_DELETION_MODE
SELECT_DELETION_TARGETS
BUILD_DELETION_PLAN
SET_DELETION_CONFIRMATION_INPUT
CONFIRM_SAVE_DELETION
CANCEL_SAVE_DELETION
RETRY_REMAINING_DELETIONS
OPEN_SAVE_BACKUPS
OPEN_ACTIVE_CAREER
OPEN_SAVE_AS
RETURN_TO_SAVE_LIBRARY
```

### 43.2 Events

```text
SAVE_DELETION_PLAN_CREATED
SAVE_DELETION_PLAN_EXPIRED
SAVE_DELETION_LEASE_ACQUIRED
SAVE_COPY_MOVED_TO_TRASH
SAVE_COPY_PERMANENTLY_DELETED
SAVE_DELETION_TOMBSTONE_CREATED
SAVE_COPY_DELETION_FAILED
SAVE_TOPOLOGY_UPDATED
SAVE_DELETION_COMPLETED
SAVE_DELETION_PARTIALLY_COMPLETED
SAVE_DELETION_RECOVERY_REQUIRED
```

---

## 44. Validation issue model

```typescript
interface SaveDeletionIssue {
  readonly code: string;
  readonly severity: "information" | "warning" | "blocking_error";
  readonly targetCopyId?: string;
  readonly messageKey: string;
  readonly parameters?: Readonly<Record<string, string | number>>;
  readonly correctiveActionId?: string;
}
```

Blocking issues include:

- Unknown save or revision.
- Stale deletion plan.
- Active save protected by policy.
- Save currently loading, writing, or migrating.
- Missing delete permission.
- Required recovery checkpoint.
- Unreachable repository for an all-copies guarantee.
- Invalid confirmation.
- Provider legal hold.

Warnings include:

- Only valid revision selected.
- Backups will remain.
- Cloud history may be provider-recoverable.
- Remote deletion is pending.
- Related branches remain.
- Soft-deleted item will be purged after a stated date.

---

## 45. Error states

### Save changed

```text
This save changed while the deletion review was open.

The deletion plan has been refreshed. Review the affected copies again.
```

### Permission denied

```text
You do not have permission to delete this save.

[Return to Save Library]
```

### Active transaction

```text
This save is currently being loaded, written, migrated, or synchronized.

Wait for that operation to complete before deleting it.
```

### Local deletion failure

```text
The local save could not be moved to Trash.

No local deletion was completed.

[Retry] [Cancel]
```

### Cloud deletion failure

```text
The local copy was deleted, but the cloud copy could not be removed.

The cloud copy remains available. You can retry the remaining operation.

[Retry Cloud Deletion] [Close]
```

### Library update failure

```text
The selected copy was deleted, but the save library could not be refreshed.

Refresh the library before performing another operation.

[Refresh Library]
```

### Recovery required

```text
Deletion was interrupted and the save topology requires recovery.

Diagnostic reference: SAVE-DEL-2048

[Recover Save Library] [Copy Safe Diagnostic]
```

---

## 46. Successful completion

Soft delete:

```text
Save moved to Trash

North United Journey can be restored until 29 September 2026.

[View Trash] [Return to Save Library]
```

Permanent deletion:

```text
Selected save copies were permanently deleted.

Retained backups: 1 protected recovery checkpoint
Related branches: 2 retained

[Return to Save Library]
```

Partial completion:

```text
Deletion completed for 2 of 3 selected copies.

The cloud copy remains because the provider is unavailable.

[Retry Remaining] [Return to Save Library]
```

---

## 47. Return behavior

After completion:

- Refresh the affected save-library rows.
- Preserve search, filters, and sort order.
- Move focus to the nearest remaining logical row.
- If a save identity remains through another copy, keep it selected.
- If it disappears, announce removal and select the next suitable row.
- Do not reset the entire library unnecessarily.

---

## 48. Accessibility requirements

### Consequence summary

The confirmation must announce:

- Save name.
- Scope.
- Mode.
- Number of revisions and copies.
- Locations.
- Recoverability.
- Restore deadline.
- Whether a playable revision remains.

### Target selector

Expose copies and revisions as an accessible list or grid with selection state, repository, date, type, protection, and consequence.

### Typed confirmation

- Use a persistent label.
- Permit ordinary editing and paste unless policy explicitly forbids it.
- Explain the expected text.
- Announce when the confirmation matches.
- Do not rely solely on case-sensitive visual comparison unless policy requires it.

### Progress announcements

```text
Moving local save to Trash.
Requesting cloud deletion.
Two of three selected copies deleted.
Deletion partially completed.
```

### Focus management

- Initial focus goes to the consequence heading or first blocking issue.
- Safe Cancel is the default button.
- Completion focuses the result heading.
- Returning to the library restores logical focus.

### Non-color communication

Protection, local or cloud location, soft or permanent mode, warnings, and result state require text or icon-plus-text.

---

## 49. Keyboard interaction

- `Tab` and `Shift+Tab`: move between scope, targets, details, and actions.
- Arrow keys: navigate target lists.
- `Space`: select or deselect a deletable target.
- `Enter`: activate the focused action.
- `Escape`: cancel before deletion begins or close informational overlays.
- `Delete`: must not confirm permanent deletion by itself.
- `Ctrl+A`: select all eligible targets only when focus is inside the target selector and the behavior is clearly labeled.

No shortcut may bypass strong confirmation or deletion-plan revalidation.

---

## 50. Localization requirements

- Localize all labels, warnings, dates, sizes, repository names, and provider states.
- Show restore deadlines as absolute localized dates.
- Preserve user save names after safe normalization.
- Support right-to-left layouts.
- Use complete message templates.
- Keep save, revision, copy, plan, and transaction IDs language-independent.
- Do not construct destructive warnings from concatenated fragments.
- Ensure typed-confirmation policy works across writing systems.

---

## 51. Responsive behavior

### Wide desktop

Use a two-column review with target selection and a sticky consequence summary.

### Standard desktop

Use one main target list with summary beneath it.

### Narrow desktop

Stack:

```text
Save summary
Deletion mode
Scope
Target copies
Retained backups
Consequences
Confirmation
Actions
```

### High text scaling

- Place labels above controls.
- Let target rows wrap.
- Keep protection reasons associated with each target.
- Keep Cancel and Delete reachable without overlap.
- Avoid horizontal scrolling for the main confirmation.

---

## 52. Security and integrity requirements

Treat save names, repository data, paths, cloud responses, target IDs, plans, and confirmation values as untrusted.

Protect against:

- Path traversal.
- Symbolic-link escape.
- Arbitrary path deletion.
- Forged save, revision, copy, or repository IDs.
- Stale deletion plans.
- Deletion-plan tampering.
- Reservation or lease bypass.
- Unauthorized multiplayer deletion.
- Cloud replay and stale tombstones.
- Race conditions with save and load transactions.
- Script and markup injection.
- Invalid Unicode and bidirectional-control abuse.
- Integer overflow in affected-size summaries.
- Audit-log secret leakage.

Rules:

1. Deletion commands reference authoritative plan IDs, never arbitrary paths.
2. Revalidate the plan immediately before acquiring leases.
3. Restrict deletion to approved repository adapters.
4. Resolve canonical targets by stable IDs.
5. Acquire exclusive conflict-aware leases.
6. Enforce permissions in a trusted process or server.
7. Use expected library revisions and idempotency request IDs.
8. Scope tombstones to account, repository, save, and revision.
9. Keep protected and active saves blocked according to policy.
10. Sanitize user-facing and copied diagnostics.
11. Use safe integer handling for counts and byte totals.
12. Never execute content from a save artifact during deletion.

---

## 53. Persistence rules

Persist after soft deletion:

- Trash identity.
- Original save, revision, and repository IDs.
- Original location metadata.
- Deletion transaction ID.
- Deleted-at timestamp.
- Restore deadline.
- Integrity metadata required for restore.
- Tombstones when needed.

Persist after permanent deletion:

- Minimal non-sensitive deletion result.
- Tombstones needed to prevent reappearance.
- Provider confirmation reference when available.
- Audit outcome according to policy.

Do not persist:

- Typed confirmation text beyond the transaction.
- Plain repository credentials.
- Arbitrary source paths in audit events.
- A successful result for a failed target.
- A claim of all-copies deletion when repositories remain unverified.

---

## 54. Observability

Useful operational events:

- Deletion workflow opened.
- Scope and mode selected.
- Plan created or invalidated.
- Protection reason encountered.
- Lease acquired or conflicted.
- Target moved to Trash.
- Permanent provider deletion accepted.
- Tombstone created.
- Partial completion.
- Recovery required.
- Restore deadline.

Avoid recording:

- Full local paths.
- Save contents.
- Full manager names.
- Cloud credentials.
- Typed confirmation text.
- Private participant identifiers.

---

## 55. Edge cases

### Save changes after the plan is displayed

Expire the plan and require review of a new plan.

### A new revision is created concurrently

The new revision is not deleted unless explicitly included in a new plan.

### Local deletion succeeds and cloud deletion fails

Report partial completion and preserve the cloud copy accurately.

### Cloud deletion succeeds and local deletion fails

Keep the local-only save visible and prevent automatic reupload through a valid tombstone or synchronization decision.

### Repository goes offline during all-copies deletion

Do not claim completion. Report pending or partial state.

### Trash storage is full

Offer permanent deletion only as an explicit separate high-risk choice or allow another trash location according to policy.

### Trash retention expires during review

Refresh the consequence summary before permanent deletion.

### Selected revision is parent of delta revisions

Compact or block according to storage policy. Do not break retained revisions.

### Protected backup loses protection

Require a new plan. Do not update consequences silently.

### Active career switches save target

Refresh active-save protection before deletion.

### Client cache and host save share a display name

Treat them as different authority classes and stable identities.

### Provider reports asynchronous deletion

Show Pending Remote Deletion until confirmed.

### Application closes during deletion

Use a transaction manifest to resume status checks or recovery on restart.

### Same request is retried after success

Return the original deletion result without targeting newly created revisions.

---

## 56. Acceptance criteria

The workflow is complete when:

1. It identifies selected save identities, revisions, copies, and repositories accurately.
2. Soft deletion is the default when supported.
3. Permanent deletion is clearly distinguished and strongly confirmed.
4. A deletion plan lists affected, retained, skipped, and protected targets.
5. The plan explains whether any playable revision remains.
6. The plan expires and is rebuilt when save topology changes.
7. Commands reference authoritative plan IDs rather than arbitrary paths.
8. Active save, load, write, migration, and required-recovery protections are enforced.
9. Only-valid-revision deletion receives an explicit high-impact warning.
10. Related Save As branches are not deleted automatically.
11. Local-only and cloud-only deletion have distinct synchronization behavior.
12. All-known-copies deletion never claims success for unreachable repositories.
13. Cloud tombstones prevent unintended reappearance or reupload.
14. Multiplayer manager ownership alone does not grant host-save deletion rights.
15. Deletion uses leases, expected revisions, and idempotency request IDs.
16. Repeated requests do not delete newly created revisions outside the original plan.
17. Soft-deleted saves retain enough metadata for safe restoration.
18. Partial multi-repository outcomes are reported honestly.
19. Permanent deletion cannot be cancelled retroactively after provider acceptance.
20. Retained save topology is validated after deletion.
21. Failure does not silently remove additional saves or backups.
22. The save library refreshes without losing filters, sort order, or logical focus.
23. Keyboard users can inspect scope, select targets, cancel, and confirm.
24. Screen-reader users receive scope, mode, locations, recoverability, deadlines, protections, and outcomes.
25. High text scaling and right-to-left layouts remain usable.
26. No proprietary artwork, exact wording, source code, logos, or original database content is required.

---

## 57. Recommended tests

### Unit tests

- Deletion-scope resolution.
- Soft versus permanent mode policy.
- Protection-reason aggregation.
- Only-valid-revision detection.
- Playable-revision retention calculation.
- Typed-confirmation normalization.
- Plan fingerprint generation.
- Plan expiry.
- Tombstone construction.
- Idempotency-result lookup.
- Trash deadline calculation from policy.
- Related-branch exclusion.

### Integration tests

- Soft-delete one local revision.
- Restore a soft-deleted revision.
- Soft-delete a save identity with several revisions.
- Delete local copy while retaining cloud copy.
- Delete cloud copy while retaining local copy.
- Permanently delete a Trash item.
- Delete all available copies with strong confirmation.
- Retain protected backups.
- Block active-career deletion.
- Block a save currently being written.
- Delete an older nonprotected revision.
- Refresh the library after deletion.
- Handle a network host save with insufficient permission.

### Transaction tests

- Fail before lease acquisition.
- Fail after local move to Trash.
- Fail during cloud deletion.
- Fail while writing a tombstone.
- Fail during library-index update.
- Restart after each transaction state.
- Compensate a soft delete when policy requires all-or-nothing behavior.
- Preserve completed permanent operations during partial failure.

### Concurrency tests

- Save revision created while deletion plan is open.
- Save begins loading before lease acquisition.
- Migration starts during deletion review.
- Two deletion requests target the same copy.
- Active career changes save target.
- Cloud revision changes during deletion.
- Same request ID retried after timeout.
- New revision appears after a completed deletion request.

### Security tests

- Forged deletion plan ID.
- Forged save, revision, copy, or repository ID.
- Arbitrary path-injection attempt.
- Symbolic-link escape.
- Stale plan fingerprint.
- Unauthorized multiplayer deletion.
- Replayed confirmation token.
- Cross-account cloud tombstone.
- Oversized target list.
- Integer overflow in total bytes.
- Markup-like save names.
- Invalid Unicode and bidirectional controls.
- Diagnostic credential leakage.

### Accessibility tests

- Keyboard-only soft deletion.
- Keyboard-only permanent deletion.
- Target-list selection announcement.
- Protection-reason announcement.
- Typed-confirmation label and match state.
- Restore-deadline announcement.
- Partial-result focus.
- Return-to-library focus restoration.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long localized names and repository labels.

### Visual regression tests

Capture at least:

- Soft-delete local copy.
- Permanent-delete warning.
- Typed confirmation.
- Only-valid-revision warning.
- Protected backup summary.
- Active-save blocked state.
- Currently-writing blocked state.
- Local-only deletion.
- Cloud-only deletion.
- All-copies review.
- Offline repository warning.
- Deletion progress.
- Partial completion.
- Recovery-required state.
- Soft-delete success with restore deadline.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 58. Condensed LLM implementation brief

```text
Implement a desktop Delete Saved Game workflow for an original football-
management simulation.

The workflow receives stable save, revision, and repository references from the
save library. It must build an authoritative expiring SaveDeletionPlan that
lists every affected, retained, skipped, and protected target. Commands must
reference the plan ID and fingerprint, never arbitrary filesystem paths or a
renderer-created target list.

Support deletion of one revision, one repository copy, local copies, cloud
copies, one save identity and its revisions, all known copies, or a Trash item.
Keep related Save As branches with different save IDs unless explicitly selected.
Model soft delete and permanent deletion separately. Prefer soft delete when the
repository supports it.

For soft deletion, move or mark artifacts as Trash transactionally, retain
checksums and original-location metadata, record an absolute restore deadline,
and create synchronization tombstones when required. All retention durations,
capacity limits, and purge rules must come from named policy values. Restoration
must never overwrite a newer valid revision silently.

Permanent deletion requires a stronger confirmation policy, especially for all
copies or the only valid revision. Clearly state that ordinary restoration will
not be available. If a provider cannot guarantee immediate physical deletion,
report the provider's actual asynchronous or retained-history behavior rather
than claiming complete erasure.

Block or specially protect active saves, saves being loaded, written, migrated,
recovered or synchronized, protected milestones, required recovery checkpoints,
migration backups, authoritative network host saves, and legal-provider holds.
Deleting an active save should normally require closing the career or switching
to a safe Save As target first.

Use stable IDs, expected library revisions, idempotency request IDs, and
exclusive deletion leases. Revalidate the deletion plan immediately before
mutation. A repeated request must return the original result and must never
delete revisions created after the original plan.

For local and cloud deletion, model a distributed saga. Report each target's
actual result. If some operations succeed and others fail, return partial
completion, preserve consistent tombstones, and offer Retry Remaining. Never
report all-copies success when a repository is offline or unverified. Do not
assume multiplayer manager ownership grants host-save deletion permission.

Show the save summary, selected scope, mode, copies, revisions, repositories,
backups retained, protected items, total size, recoverability, restore deadline,
related branches, and whether a playable revision remains. Do not count corrupt,
incomplete, or incompatible artifacts as valid backups.

After completion, refresh affected library rows while preserving search,
filters, sorting, and logical focus. Support complete keyboard interaction,
accessible target-list semantics, safe default focus, typed-confirmation labels,
progress and partial-result announcements, high text scaling, localization, and
right-to-left layouts.

Treat save names, paths, repositories, provider responses, plans, tombstones,
identifiers, and confirmation values as untrusted. Restrict deletion to approved
repository adapters, prevent path traversal and symbolic-link escape, validate
permissions in a trusted process or server, use safe integer handling, sanitize
diagnostics, and never execute save content during deletion. Do not copy
proprietary artwork, exact wording, source code, logos, or databases.
```

---

## 59. Next planned item

**Screen 16: Game Preferences** should define general application and career preferences, interface scale, language, date and currency presentation, autosave profiles, confirmation behavior, processing and background options, accessibility, notification defaults, multiplayer-sensitive settings, apply and cancel behavior, restart-required settings, validation, persistence scopes, and restoration of safe defaults.

---

## Suggested Git commit

```text
feat(docs): specify delete saved game workflow
```
