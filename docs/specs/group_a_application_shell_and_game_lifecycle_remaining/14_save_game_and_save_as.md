# Screen 14: Save Game and Save As

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, databases, source code, logos, exact interface wording, or other protected assets. Use an original visual identity and fictional or properly licensed football data.

---

## 1. Purpose

The **Save Game and Save As** workflow creates a durable, validated career save without corrupting the currently loaded career or any earlier valid save.

It may be opened from the in-career menu, a keyboard shortcut, an autosave scheduler, a quit workflow, a migration boundary, or a recovery operation.

The workflow must allow the user to:

- Save the current career to its existing save identity.
- Create a new named save through Save As.
- Choose an approved local or cloud-backed save location.
- Review the target, save type, expected size, and synchronization behavior.
- Detect and resolve name collisions and revision conflicts.
- Create a new version without overwriting the last valid version in place.
- Preserve rolling backups according to policy.
- Show meaningful progress for serialization, compression, validation, and promotion.
- Cancel safely before the atomic commit boundary.
- Handle low storage, provider outages, permission failures, and concurrent save requests.
- Verify the completed save before reporting success.
- Continue gameplay from the same authoritative runtime state.

Saving must never expose a partially written package as the latest valid career save.

---

## 2. Entry points

```text
Career Menu
  -> Save Game
  -> Save progress to current save identity
```

```text
Career Menu
  -> Save As
  -> Choose name and location
  -> Create new save identity or branch
```

```text
Quit Career
  -> Unsaved progress detected
  -> Save and Quit
  -> Save transaction
  -> Main Menu
```

```text
Autosave Scheduler
  -> Autosave due
  -> Background or blocking save according to policy
  -> Resume career
```

```text
Risky Career Operation
  -> Create recovery checkpoint
  -> Execute operation
```

---

## 3. Core concepts

### 3.1 Save identity

A save identity is the stable library entry used to group revisions of the same save.

### 3.2 Career identity

A career identity identifies the underlying football world. Several Save As branches may share ancestry with the same career while using different save identities.

### 3.3 Save revision

A save revision is one immutable completed version of a save identity.

### 3.4 Save transaction

A save transaction snapshots runtime state, writes a new package to staging, validates it, and promotes it atomically.

### 3.5 Save Game

Save Game writes a new revision under the active save identity.

### 3.6 Save As

Save As creates a new save identity or branch and writes its first revision without deleting the source save.

### 3.7 Autosave

An autosave is created automatically according to a named schedule and rotation policy.

### 3.8 Rolling backup

A rolling backup retains earlier valid revisions within a configured count or retention policy.

### 3.9 Recovery checkpoint

A recovery checkpoint is a protected save created before a risky or long-running transaction.

### 3.10 Atomic promotion

Atomic promotion makes the completed new revision visible as valid only after writing, checksum verification, and validation succeed.

---

## 4. Save-type model

```typescript
type SaveWriteType =
  | "manual"
  | "save_as"
  | "autosave"
  | "rolling_backup"
  | "recovery_checkpoint"
  | "quit_save"
  | "migration_backup";
```

The save type must be retained in metadata and displayed in the Load Saved Game screen.

---

## 5. Entry contract

```typescript
interface OpenSaveWorkflowRequest {
  readonly careerId: string;
  readonly activeCheckpointId: string;
  readonly activeSaveId?: string;
  readonly expectedCareerRevision: number;
  readonly invokingManagerId?: string;
  readonly controllerContextId: string;
  readonly mode: "save" | "save_as" | "quit_save";
}
```

Before opening or executing the workflow, verify:

- A valid career session is active.
- The current controller may save the career.
- No incompatible canonical transaction is committing.
- The active checkpoint and career revision are current.
- The target repository is available or a fallback is supported.
- Multiplayer host authority is valid when required.

---

## 6. Save Game versus Save As

### Save Game

- Uses the active save identity.
- Uses the configured primary repository.
- Creates a new immutable revision.
- Updates the latest-valid revision pointer after validation.
- Retains earlier revisions according to policy.

### Save As

- Requires a new display name or explicitly selected existing target.
- Normally creates a new save identity.
- Preserves the current source save unchanged.
- Records branch ancestry.
- May use a different approved repository.
- Does not silently replace an unrelated save with the same display name.

---

## 7. Conceptual Save As layout

```text
+--------------------------------------------------------------------------------+
| SAVE CAREER AS                                                                 |
|--------------------------------------------------------------------------------|
| Save name *       [North United Journey - February 2005____________________]   |
|                                                                                |
| Location          [Local Saves v]                                              |
| Cloud sync        [x] Synchronize after local save                             |
|                                                                                |
| Save type         Manual save                                                  |
| Career date       12 February 2005                                             |
| Estimated size    430 to 470 MB                                                |
| Free space        18.4 GB                                                      |
|                                                                                |
| Existing careers with similar names                                            |
| North United Journey             Last saved 18 March 2005                      |
|                                                                                |
| [ ] Create a protected backup of the current save before branching             |
|                                                                                |
| [Cancel]                                                    [Save New Career]  |
+--------------------------------------------------------------------------------+
```

Conceptual Save Game status:

```text
Save current career?

Target: North United Journey
Location: Local Saves and cloud synchronization
Previous valid revision: 18 March 2005, 21:40

[Cancel] [Save]
```

These diagrams define behavior and hierarchy, not exact styling.

---

## 8. Save naming

### 8.1 Display name

The display name is a user-facing library label, not a filesystem path.

### 8.2 Name policy

```typescript
interface SaveNamePolicy {
  readonly minimumLength: number;
  readonly maximumLength: number;
  readonly reservedNames: readonly string[];
  readonly forbiddenControlCharacters: readonly string[];
  readonly trimOuterWhitespace: boolean;
  readonly collapseRepeatedWhitespace: boolean;
  readonly allowDuplicateDisplayNames: boolean;
}
```

### 8.3 Name validation

Reject:

- Empty normalized names.
- Control characters.
- Path separators when the storage adapter cannot safely map them.
- Reserved system labels.
- Names outside configured length limits.
- Invalid Unicode.

Preserve valid:

- Accents.
- Non-Latin scripts.
- Apostrophes.
- Hyphens.
- Ordinary punctuation permitted by policy.

### 8.4 Filesystem mapping

The storage layer must create its own safe internal object name. It must not use the display name directly as an unrestricted path.

---

## 9. Display-name collision

Two saves may share a display name if policy permits, but the interface must distinguish them by date, manager, repository, and stable identity.

If uniqueness is required:

```text
A save named "North United Journey" already exists in Local Saves.

[Choose Another Name] [Create New Version of Existing Save] [Cancel]
```

Creating a new version requires explicit selection of the existing save identity and permission to write it.

---

## 10. Repository selection

```typescript
interface WritableSaveRepository {
  readonly repositoryId: string;
  readonly displayName: string;
  readonly locationType: "local" | "cloud_backed" | "removable";
  readonly writable: boolean;
  readonly available: boolean;
  readonly freeBytes?: number;
  readonly supportsAtomicReplace: boolean;
  readonly supportsVersionHistory: boolean;
  readonly synchronizationPolicyId?: string;
}
```

The user may choose only approved writable repositories.

Do not expose arbitrary internal application paths as ordinary choices.

---

## 11. Cloud-backed saving

Recommended architecture:

```text
Create and verify local durable revision
  -> Queue cloud upload
  -> Upload immutable package
  -> Verify remote revision
  -> Mark synchronized
```

The gameplay save should normally succeed locally even if cloud synchronization later fails, provided local storage is the authoritative configured target.

The UI must distinguish:

- Saved locally.
- Upload queued.
- Uploading.
- Synchronized.
- Sync failed.
- Conflict detected.

---

## 12. Save target preview

Before saving, show:

- Save display name.
- Save type.
- Repository.
- Current latest revision.
- Estimated output size range.
- Available storage.
- Cloud behavior.
- Backup behavior.
- Whether a new identity or new revision will be created.

Do not claim an exact output size before serialization.

---

## 13. Save estimate model

```typescript
interface SaveWriteEstimate {
  readonly estimatedCanonicalBytesRange: ByteRange;
  readonly estimatedCompressedBytesRange: ByteRange;
  readonly estimatedTemporaryBytes: number;
  readonly estimatedDurationRangeMs?: DurationRange;
  readonly confidence: "low" | "medium" | "high";
}
```

Estimate premises must come from named policies and runtime metrics rather than unexplained hardcoded values.

---

## 14. Free-space validation

Validate storage for:

- Staging output.
- Compression workspace.
- New immutable revision.
- Atomic promotion overhead.
- Required safety margin.
- Backup creation where selected.

```typescript
interface SaveStoragePolicy {
  readonly fixedReserveBytes: number;
  readonly safetyMarginRatio: number;
  readonly temporaryOverheadRatio: number;
  readonly minimumFreeBytesAfterSave: number;
}
```

All values are named premises. No storage margin belongs as an unexplained literal inside formulas.

---

## 15. Save preconditions

Before snapshotting runtime state, verify:

- No incompatible simulation mutation is in progress.
- Match processing is at a valid save boundary.
- Transfer or contract transactions are either committed or represented safely.
- Multiplayer commands have reached a consistent authoritative revision.
- The active manager and ownership state are valid.
- The repository remains writable.
- Sufficient temporary storage remains.

If the current state is not saveable, queue the request for the next deterministic safe boundary or explain why it cannot proceed.

---

## 16. Safe save boundaries

Examples:

- Outside a partially processed simulation tick.
- Before or after, but not during, a canonical database transaction.
- At a defined match-state checkpoint.
- After all authoritative multiplayer commands through a revision are applied.
- After inbox and event queues reach a consistent sequence number.

The user interface should not expose implementation detail unnecessarily.

```text
Finishing the current game update before saving...
```

---

## 17. Runtime snapshot

The save coordinator creates a consistent snapshot of canonical state.

```typescript
interface CareerRuntimeSnapshotDescriptor {
  readonly careerId: string;
  readonly checkpointId: string;
  readonly careerRevision: number;
  readonly simulationDate: string;
  readonly canonicalSequenceNumber: number;
  readonly managerStateRevision: number;
  readonly createdAtMonotonicMarker: string;
}
```

Derived caches should be omitted or marked rebuildable unless retaining them materially improves load time safely.

---

## 18. Canonical save contents

A complete save may contain:

- Career manifest.
- World entities.
- Competition state.
- Fixtures and results.
- Players and staff.
- Clubs and national teams.
- Contracts and transfers.
- Finances.
- Injuries and discipline.
- Human managers and ownership.
- Inbox and news state.
- Scouting knowledge.
- Histories and records.
- Simulation clock and scheduled events.
- Configuration fingerprints.
- Random-stream states or deterministic sequence state.
- Navigation bookmark restricted to safe routes.

---

## 19. Excluded or rebuildable content

Typically rebuildable:

- Search indexes.
- Sort indexes.
- Image caches.
- Temporary UI state.
- Open menus and dialogs.
- Network transport buffers.
- Noncanonical analytics.
- Stale previews.

The save format should clearly identify any retained derived index and its invalidation fingerprint.

---

## 20. Save manifest

```typescript
interface CareerSaveWriteManifest {
  readonly saveId: string;
  readonly careerId: string;
  readonly revisionId: string;
  readonly parentRevisionId?: string;
  readonly branchSourceSaveId?: string;
  readonly displayName: string;
  readonly saveType: SaveWriteType;
  readonly transactionId: string;
  readonly transactionState:
    | "preparing"
    | "snapshotting"
    | "writing"
    | "validating"
    | "promoting"
    | "completed"
    | "failed"
    | "cancelled";
  readonly applicationVersion: string;
  readonly worldSchemaVersion: number;
  readonly saveFormatVersion: number;
  readonly databaseFingerprint: string;
  readonly contentPackFingerprints: readonly string[];
  readonly careerDate: string;
  readonly canonicalSequenceNumber: number;
  readonly canonicalChecksum?: string;
  readonly checksumAlgorithmId: string;
  readonly createdAt: string;
  readonly completedAt?: string;
}
```

---

## 21. Transactional write pipeline

```text
Validate request and target
  -> Acquire save lock
  -> Wait for safe world boundary
  -> Freeze canonical snapshot revision
  -> Create transaction manifest
  -> Write canonical data to staging
  -> Write preview metadata
  -> Compress if configured
  -> Flush and close staged files
  -> Calculate checksums
  -> Deserialize or structurally validate staged output
  -> Promote immutable revision
  -> Update latest-valid pointer
  -> Apply retention policy
  -> Queue cloud synchronization
  -> Release lock
  -> Report success
```

No stage should mutate the previous valid revision.

---

## 22. Save lock

```typescript
interface CareerSaveLock {
  readonly lockId: string;
  readonly careerId: string;
  readonly saveId: string;
  readonly transactionId: string;
  readonly ownerProcessId: string;
  readonly acquiredAt: string;
  readonly expiresAt?: string;
}
```

The lock coordinates:

- Manual saving.
- Autosaving.
- Quit saving.
- Cloud promotion.
- Migration backup creation.
- Save deletion or duplication.

A second request should join, queue behind, or be rejected according to policy. It must not write concurrently to the same identity.

---

## 23. Save progress layout

```text
+--------------------------------------------------------------------------------+
| SAVING CAREER                                                                  |
|--------------------------------------------------------------------------------|
| North United Journey                                                          |
|                                                                                |
| [===============================-------------------] 64%                       |
|                                                                                |
| Validating the new save revision...                                            |
|                                                                                |
| [x] Preparing career snapshot                                                  |
| [x] Writing career data                                                        |
| [>] Validating save                                                            |
| [ ] Promoting new revision                                                     |
| [ ] Queuing cloud synchronization                                              |
|                                                                                |
| Written: 286 MB of approximately 445 MB                                        |
| Elapsed: 00:18                  Estimated remaining: 00:08 to 00:18             |
|                                                                                |
| [Show Details]                                                  [Cancel Saving]|
+--------------------------------------------------------------------------------+
```

---

## 24. Progress stages

Recommended visible stages:

- Preparing snapshot.
- Writing canonical data.
- Compressing data, when used.
- Calculating integrity checks.
- Validating staged save.
- Promoting revision.
- Updating save library.
- Queuing or completing cloud synchronization.

Cloud upload should normally be separate from local save completion unless policy requires synchronous remote durability.

---

## 25. Progress calculation

```typescript
interface SaveStageProgress {
  readonly stageId: string;
  readonly status: "pending" | "running" | "completed" | "warning" | "failed";
  readonly completedUnits?: number;
  readonly totalUnits?: number;
  readonly configuredWeight: number;
}
```

Rules:

- Use configured weights.
- Use indeterminate progress when total work is unknown.
- Rate-limit UI updates.
- Do not reach 100 percent before promotion and manifest completion.
- Do not include asynchronous cloud upload in 100 percent unless the chosen policy defines it as part of save completion.

---

## 26. Cancellation behavior

Cancellation is cooperative.

Safe cancellation boundaries include:

- Before runtime snapshot acquisition.
- Between serialized batches.
- Before compression finalization.
- Before staged-output promotion.

Cancellation may be deferred during:

- File flush required for safe cleanup.
- Atomic promotion.
- Latest-valid pointer update.
- Transaction rollback.

Display:

```text
Cancellation requested. Finishing a safe storage operation...
```

After cancellation:

- Previous valid save remains untouched.
- Staged output is deleted or quarantined.
- Save lock is released.
- Runtime career continues unchanged.
- Autosave schedule is recalculated according to policy.

---

## 27. Commit boundary

After the new revision has been promoted and the latest-valid pointer updated, cancellation becomes completion rather than rollback.

If the user closes the progress dialog at this point, the system should report success and allow cloud upload to continue in the background where supported.

---

## 28. Save validation

Validation should include:

- Manifest schema.
- Required canonical files.
- File lengths.
- Checksums.
- Save-format version.
- World-schema version.
- Database and content fingerprints.
- Canonical sequence number.
- Manager and ownership integrity.
- Competition and fixture references.
- Transaction-state completeness.
- Read-back of critical metadata.

High-assurance policy may deserialize the staged save into a validation context before promotion.

---

## 29. Save success criteria

A save reports success only when:

- Staged writing completed.
- Required data was flushed.
- Checksums completed.
- Validation passed.
- Immutable revision promotion succeeded.
- Latest-valid pointer update succeeded.
- Transaction manifest says completed.

Cloud synchronization may remain pending if local durability is the chosen success model.

---

## 30. New revision behavior

Saving to an existing save identity:

1. Creates a new revision ID.
2. Sets the current latest revision as parent.
3. Writes immutable staged output.
4. Validates it.
5. Promotes it.
6. Updates the latest-valid pointer.
7. Retains or removes older revisions according to policy.

Never rewrite the prior revision in place.

---

## 31. Save As branch behavior

Save As normally:

- Creates a new save ID.
- Creates a new first revision ID.
- References the source save and revision as ancestry.
- Copies canonical state through serialization or safe immutable cloning.
- Uses the new display name and repository.
- Does not change the currently active career identity unless policy explicitly changes the active save target after success.

The product should clearly state whether subsequent `Save Game` writes to the new Save As target. The recommended behavior is yes.

---

## 32. Branch ancestry

```typescript
interface SaveBranchAncestry {
  readonly sourceSaveId: string;
  readonly sourceRevisionId: string;
  readonly branchedAt: string;
  readonly branchReason: "save_as" | "conflict_keep_both" | "manual_duplicate";
}
```

Ancestry supports diagnostics and cloud conflict handling. It does not merge future branches automatically.

---

## 33. Rolling backup policy

```typescript
interface SaveRetentionPolicy {
  readonly maximumManualRevisions: number;
  readonly maximumAutosaveRevisions: number;
  readonly maximumRecoveryCheckpoints: number;
  readonly minimumProtectedBackups: number;
  readonly retentionAgeDays?: number;
  readonly preserveMilestoneSaves: boolean;
  readonly cleanupTiming: "after_promotion" | "background";
}
```

All limits are configuration values.

Cleanup must never remove:

- The newly promoted latest valid revision.
- The only valid revision.
- A protected recovery checkpoint.
- A migration backup still required by policy.
- A revision currently being loaded or synchronized.

---

## 34. Milestone saves

The product may allow a revision to be protected as a milestone.

Examples:

- Start of season.
- Promotion achieved.
- Before a major final.
- User-marked archive.

Milestone protection should be explicit and visible. It must not infer emotional importance automatically without user control.

---

## 35. Autosave interaction

### 35.1 Autosave due during manual save

The manual save satisfies or postpones the autosave according to named schedule policy.

### 35.2 Manual save during autosave

- Join the running snapshot if safe, or
- Queue the manual save, or
- Cancel the precommit autosave and start the manual save.

The policy must be deterministic.

### 35.3 Autosave failure

Autosave failure should not stop ordinary gameplay unless the world is already in an unsafe storage state.

Display a nonblocking warning:

```text
Autosave failed. Your previous valid save remains available.

[Retry Now] [Review Save Location]
```

### 35.4 Autosave schedule

```typescript
interface AutosavePolicy {
  readonly enabled: boolean;
  readonly frequencyProfileId: string;
  readonly rotationCount: number;
  readonly triggerEvents: readonly string[];
  readonly postponeDuringMatch: boolean;
  readonly failureRetryPolicyId: string;
}
```

---

## 36. Background saving

Background saving is optional and requires an immutable or copy-on-write runtime snapshot.

If not supported safely, use a blocking progress screen rather than risking inconsistent state.

When supported:

- Gameplay may continue after snapshot acquisition.
- The written save represents the captured canonical sequence number.
- Later user actions are not included.
- The UI must show the save's career date and sequence context accurately.
- A subsequent save request must not assume the earlier background save contains newer actions.

---

## 37. Multiplayer saving

In authoritative network play:

- Only the host or authorized server writes the canonical save.
- Clients may request a save but cannot create authoritative state independently.
- The server chooses the consistent command sequence boundary.
- Participant ownership and pending commands are serialized.
- Client caches remain nonauthoritative.
- Save completion is broadcast after commit.

```typescript
interface NetworkSaveRequest {
  readonly careerId: string;
  readonly requestedByParticipantId: string;
  readonly requestedType: SaveWriteType;
  readonly expectedServerRevision: number;
  readonly requestId: string;
}
```

---

## 38. Multiplayer save permissions

Possible permissions:

```typescript
type SavePermission =
  | "request_save"
  | "execute_manual_save"
  | "execute_save_as"
  | "change_save_repository"
  | "manage_autosave"
  | "manage_save_retention";
```

Permissions are enforced by the authoritative host or server.

---

## 39. Concurrent mutation handling

The save snapshot must represent one canonical career revision.

Commands arriving during snapshot acquisition are either:

- Included before the boundary.
- Queued after the boundary.
- Rejected by the active transaction.

They must not be partially included.

---

## 40. Low-storage behavior

### Before writing

Block the save when the configured minimum safe space is not available.

```text
There is not enough free space to save this career safely.

Required temporary space: approximately 980 MB
Available space: 620 MB

[Choose Another Location] [Manage Saves] [Cancel]
```

### During writing

- Stop before promotion.
- Close and remove incomplete staged output.
- Preserve the previous valid revision.
- Release the lock.
- Report the actual failure.

Do not delete older valid saves automatically unless an explicit cleanup action is approved.

---

## 41. Permission failure

```text
The selected save location is no longer writable.

Your previous valid save was not changed.

[Choose Another Location] [Retry] [Cancel]
```

Do not repeatedly retry without backoff when the operating system returns a persistent permission error.

---

## 42. Removable storage

If a removable target disconnects:

- Stop the staged write.
- Preserve prior valid revisions.
- Clean local temporary artifacts.
- Offer another approved location.
- Do not assume reinsertion is the same device without identity verification.

---

## 43. Cloud synchronization failure

If local save succeeded but upload failed:

```text
Career saved locally.

Cloud synchronization could not be completed. The upload will be retried when
the provider is available.

[Close] [Retry Sync]
```

The success message must separate local durability from cloud status.

---

## 44. Cloud conflict during save

If the remote provider contains a divergent revision:

- Complete the local save if local policy permits.
- Do not overwrite the remote branch.
- Mark synchronization conflict.
- Open conflict review.
- Offer Keep Both, Use Local for remote replacement when authorized, or preserve remote.

Never decide solely from modification timestamps when ancestry indicates divergence.

---

## 45. Quit-save behavior

`Save and Quit` must:

1. Resolve unsaved runtime state.
2. Execute a normal validated save transaction.
3. Report any local or cloud distinction.
4. Stop the runtime session only after local save success or explicit user choice to quit without saving.
5. Release multiplayer resources safely.
6. Return to Main Menu.

If the save fails, do not quit automatically.

---

## 46. Overwrite terminology

The UI may say `Replace latest save` for user familiarity, but internally it should create a new revision and move the latest pointer.

Destructive replacement of every history revision should require a separate explicit cleanup workflow.

---

## 47. Recovery manifest

```typescript
interface SaveTransactionRecoveryManifest {
  readonly transactionId: string;
  readonly saveId: string;
  readonly targetRevisionId: string;
  readonly priorValidRevisionId?: string;
  readonly state:
    | "created"
    | "snapshot_complete"
    | "write_in_progress"
    | "write_complete"
    | "validation_complete"
    | "promotion_in_progress"
    | "completed"
    | "rollback_required";
  readonly stagedArtifactIds: readonly string[];
  readonly updatedAt: string;
}
```

On restart, the application uses this manifest to clean, resume, or complete a safe transaction.

---

## 48. Crash recovery

Possible restart outcomes:

- Staged write incomplete: delete or quarantine it.
- Write complete but validation absent: validate before any promotion.
- Validation complete but promotion absent: complete promotion if identities and checksums match.
- Promotion complete but latest pointer stale: repair the pointer transactionally.
- Ambiguous state: preserve prior valid revision and require recovery review.

Never guess from filenames alone.

---

## 49. Save verification report

```typescript
interface SaveVerificationReport {
  readonly status: "valid" | "valid_with_warnings" | "invalid";
  readonly manifestValid: boolean;
  readonly canonicalChecksumValid: boolean;
  readonly requiredFilesPresent: boolean;
  readonly criticalReadBackValid: boolean;
  readonly schemaVersionSupported: boolean;
  readonly warningCodes: readonly string[];
  readonly errorCodes: readonly string[];
  readonly verifiedAt: string;
}
```

An invalid staged save must not be promoted.

---

## 50. Save result

```typescript
interface SaveCareerResult {
  readonly saveTransactionId: string;
  readonly saveId: string;
  readonly revisionId: string;
  readonly careerId: string;
  readonly repositoryId: string;
  readonly saveType: SaveWriteType;
  readonly canonicalSequenceNumber: number;
  readonly canonicalBytes: number;
  readonly storedBytes: number;
  readonly verificationReport: SaveVerificationReport;
  readonly cloudSynchronizationState?: SaveSynchronizationState;
  readonly completedAt: string;
}
```

---

## 51. Save command

```typescript
interface SaveCareerCommand {
  readonly careerId: string;
  readonly expectedCareerRevision: number;
  readonly activeCheckpointId: string;
  readonly target:
    | {
        readonly mode: "existing_save";
        readonly saveId: string;
        readonly expectedLatestRevisionId?: string;
      }
    | {
        readonly mode: "new_save";
        readonly displayName: string;
        readonly repositoryId: string;
        readonly sourceSaveId?: string;
        readonly sourceRevisionId?: string;
      };
  readonly saveType: SaveWriteType;
  readonly controllerContextId: string;
  readonly requestId: string;
}
```

The command must not contain renderer-created canonical world data.

---

## 52. Idempotency

The save command is idempotent by request ID.

Repeated submission must:

- Return the active transaction state while in progress.
- Return the original SaveCareerResult after success.
- Never create duplicate revisions for the same request.
- Never apply retention twice.
- Never enqueue duplicate cloud uploads.

---

## 53. State model

```typescript
interface SaveGameScreenState {
  readonly careerId: string;
  readonly activeCheckpointId: string;
  readonly expectedCareerRevision: number;
  readonly mode: "save" | "save_as" | "quit_save";
  readonly targetSaveId?: string;
  readonly targetDisplayName: string;
  readonly selectedRepositoryId: string;
  readonly repositories: readonly WritableSaveRepository[];
  readonly estimate?: SaveWriteEstimate;
  readonly storageState: "unknown" | "checking" | "sufficient" | "near_limit" | "insufficient";
  readonly cloudSyncRequested: boolean;
  readonly protectedBackupRequested: boolean;
  readonly validationIssues: readonly SaveWorkflowIssue[];
  readonly transactionState:
    | "idle"
    | "waiting_for_safe_boundary"
    | "snapshotting"
    | "writing"
    | "compressing"
    | "validating"
    | "promoting"
    | "synchronizing"
    | "completed"
    | "failed"
    | "cancelling";
}
```

---

## 54. State transitions

```text
OPENING_WORKFLOW
  |
  v
CHECKING_TARGET
  |
  v
READY
  |
  +-- change target -------> CHECKING_TARGET -> READY
  |
  +-- Save ---------------> VALIDATING_REQUEST
                                 |
                                 +-- invalid -> READY_WITH_ERRORS
                                 +-- conflict -> CONFLICT_REVIEW
                                 +-- valid -> ACQUIRING_LOCK
                                                  |
                                                  v
                                      WAITING_FOR_SAFE_BOUNDARY
                                                  |
                                                  v
                                            SNAPSHOTTING
                                                  |
                                                  v
                                              WRITING
                                                  |
                                                  v
                                             VALIDATING
                                                  |
                                                  v
                                              PROMOTING
                                                  |
                          +-----------------------+------------------+
                          |                                          |
                          v                                          v
                     COMPLETED                                   FAILED
                          |
                          +-- optional cloud sync -> SYNCHRONIZING
```

Cancellation:

```text
Precommit running state
  -> CANCELLING
  -> CLEANING_STAGING
  -> READY or CLOSED
```

---

## 55. Commands and events

### 55.1 Commands

```text
OPEN_SAVE_GAME
OPEN_SAVE_AS
SET_SAVE_DISPLAY_NAME
SET_SAVE_REPOSITORY
SET_CLOUD_SYNC_OPTION
SET_PROTECTED_BACKUP_OPTION
REFRESH_SAVE_ESTIMATE
CHECK_SAVE_STORAGE
SAVE_CAREER
CANCEL_SAVE_TRANSACTION
RETRY_SAVE_TRANSACTION
RETRY_CLOUD_SYNCHRONIZATION
OPEN_SAVE_CONFLICT_REVIEW
OPEN_MANAGE_SAVES
REQUEST_CLOSE_SAVE_WORKFLOW
```

### 55.2 Events

```text
SAVE_TARGET_VALIDATED
SAVE_STORAGE_CHECKED
SAVE_TRANSACTION_STARTED
SAVE_SAFE_BOUNDARY_REACHED
SAVE_RUNTIME_SNAPSHOT_CREATED
SAVE_CANONICAL_DATA_WRITTEN
SAVE_STAGED_OUTPUT_VALIDATED
SAVE_REVISION_PROMOTED
SAVE_LATEST_POINTER_UPDATED
SAVE_RETENTION_APPLIED
SAVE_CLOUD_UPLOAD_QUEUED
SAVE_CLOUD_SYNCHRONIZED
SAVE_TRANSACTION_COMPLETED
SAVE_TRANSACTION_FAILED
SAVE_TRANSACTION_CANCELLED
SAVE_CONFLICT_DETECTED
```

---

## 56. Validation issue model

```typescript
interface SaveWorkflowIssue {
  readonly code: string;
  readonly severity: "information" | "warning" | "blocking_error";
  readonly fieldId?: string;
  readonly messageKey: string;
  readonly parameters?: Readonly<Record<string, string | number>>;
  readonly correctiveActionId?: string;
}
```

Blocking issues:

- Invalid save name.
- Missing or unwritable repository.
- Insufficient storage.
- Stale career revision.
- Active incompatible transaction.
- Missing save permission.
- Existing target revision changed.
- Unsupported save schema.
- Snapshot cannot reach a safe boundary.

Warnings:

- Cloud provider offline.
- Estimated save is large.
- Target is removable storage.
- Save name duplicates another display name.
- Existing revision history will be trimmed by retention policy.

---

## 57. Error states

### Runtime snapshot failure

```text
A consistent career snapshot could not be created.

The previous valid save remains unchanged.

[Retry] [Cancel]
```

### Write failure

```text
Career data could not be written to the selected location.

No new revision was promoted.

[Retry] [Choose Another Location]
```

### Validation failure

```text
The new save revision did not pass integrity checks.

It was not promoted. Your previous valid save remains available.

[Copy Safe Diagnostic] [Retry] [Cancel]
```

### Promotion failure

```text
The new revision was written and validated, but could not be promoted safely.

The previous valid revision is still active.

[Retry Promotion] [Return to Career]
```

### Concurrent target change

```text
This save changed in another session before the new revision was written.

Review the latest version or use Save As.

[Refresh Target] [Save As] [Cancel]
```

### Save permission lost

```text
You no longer have permission to save this network career.

[Return to Career]
```

---

## 58. Successful completion

Manual save:

```text
Career saved successfully

North United Journey
Saved locally at 21:47
Cloud synchronization queued

[Close]
```

Save As:

```text
New career save created successfully

North United Journey - February 2005

Future Save Game actions will use this save.

[Close]
```

Quit save:

```text
Career saved successfully. Returning to the Main Menu...
```

---

## 59. Return behavior

After an ordinary save:

- Return to the invoking safe career screen.
- Restore focus to the Save action or prior focused control.
- Resume simulation only if it was running before the workflow and policy permits.
- Display a nonintrusive saved-status indicator.

After Save As:

- Update the active save identity after success.
- Preserve career runtime identity and current screen.

---

## 60. Accessibility requirements

### Form

- Every field has a persistent label.
- Required state is announced.
- Storage and cloud status are programmatically associated.
- Errors link to the relevant field.

### Progress

Announce meaningful stages:

```text
Preparing career snapshot.
Writing career data.
Validating new save revision.
Promoting save revision.
Career saved successfully.
```

Do not announce every megabyte written.

### Focus management

- Save As opens with focus on the save-name field.
- Save Game opens with focus on the safe default action.
- Progress receives focus after saving starts.
- Failure moves focus to the error summary.
- Success moves focus to the success heading or Close action.
- Returning to the career restores prior logical focus.

### Non-color communication

Storage state, cloud state, progress, warnings, and validation require textual labels or icon-plus-text.

---

## 61. Keyboard interaction

- `Tab` and `Shift+Tab`: move between controls.
- `Enter`: activate the focused action.
- `Escape`: close dialogs or cancel before the commit boundary.
- `Ctrl+S`: open or execute Save Game according to policy.
- `Ctrl+Shift+S`: open Save As.
- `Home` and `End`: navigate details logs where present.
- `Page Up` and `Page Down`: scroll save details or progress logs.

Shortcuts must not bypass validation, conflict review, or destructive cleanup warnings.

---

## 62. Localization requirements

- Localize labels, statuses, errors, save types, and storage descriptions.
- Localize dates, times, sizes, percentages, and duration ranges.
- Preserve save display names exactly after safe normalization.
- Support right-to-left layouts.
- Use complete message templates.
- Keep save IDs, revision IDs, transaction IDs, and policy IDs language-independent.
- Do not expose internal filesystem-safe names as user-facing labels.

---

## 63. Responsive behavior

### Wide desktop

Center a bounded Save or Save As panel with target and estimate details.

### Narrow desktop

Stack:

```text
Save name
Location
Cloud option
Backup option
Estimate
Warnings
Actions
```

### High text scaling

- Place labels above fields.
- Let repository descriptions wrap.
- Keep estimates readable on separate lines.
- Keep primary and cancel actions reachable.
- Prevent progress details from overlapping controls.

### Reduced motion

Use static stage updates rather than animated transitions.

---

## 64. Security and integrity requirements

Treat save names, paths, repositories, runtime snapshots, provider responses, manifests, and cloud objects as untrusted.

Protect against:

- Path traversal.
- Symbolic-link escape.
- Unsafe filename mapping.
- Concurrent overwrite.
- Partial write promotion.
- Integer overflow.
- Checksum confusion.
- Unauthorized network save requests.
- Stale career and target revisions.
- Cloud replay or rollback.
- Script and markup injection in names.
- Unsafe serialization.
- Diagnostic leakage.

Rules:

1. Use approved repositories and generated internal object names.
2. Never execute content from a save package.
3. Serialize with strict versioned schemas.
4. Use transactional staging and immutable revisions.
5. Verify checksums before promotion.
6. Acquire save and target locks.
7. Use expected career and target revisions.
8. Use idempotency request IDs.
9. Enforce permissions in the authoritative process or server.
10. Keep plaintext secrets and authentication tokens out of manifests and logs.
11. Use safe integer handling for sizes and sequence numbers.
12. Sanitize copied diagnostics.

---

## 65. Persistence rules

Persist after success:

- New immutable save revision.
- Completed manifest.
- Latest-valid pointer.
- Parent revision and branch ancestry.
- Verification report.
- Retention metadata.
- Pending cloud synchronization state.
- Updated active save identity after Save As.

Do not persist as valid:

- Partial staged files.
- Unvalidated revisions.
- Incomplete compression output.
- Renderer-only progress state.
- Failed cloud upload as synchronized.
- A latest pointer targeting an unavailable revision.

---

## 66. Observability

Useful operational events:

- Save workflow opened.
- Safe-boundary wait duration.
- Snapshot duration.
- Serialization duration.
- Compression duration.
- Validation duration.
- Promotion duration.
- Stored bytes.
- Compression ratio.
- Cloud queue and sync outcome.
- Cancellation stage.
- Failure category.
- Recovery action on restart.

Avoid recording:

- Full local paths.
- Save contents.
- Manager names in telemetry.
- Authentication tokens.
- Cloud credentials.
- Private network addresses.

---

## 67. Edge cases

### Save requested during a match transition

Wait for the configured safe match boundary and explain the delay.

### Save requested during day processing

Queue for the next consistent simulation boundary.

### Autosave starts immediately before manual save

Apply deterministic coalescing or queue policy.

### Career changes after snapshot acquisition

The save remains valid for its captured sequence number. The UI must not claim it contains later commands.

### Storage free space changes during writing

Abort before promotion and preserve prior valid revisions.

### Repository disconnects during promotion

Use transaction metadata to determine whether promotion completed. Do not guess.

### Cloud provider accepts upload but response is lost

Query provider revision state by immutable object identity before retrying upload.

### Application closes during save

Attempt cooperative completion or cancellation. On restart, inspect the recovery manifest.

### Existing latest revision changes remotely

Create a local valid revision and mark a cloud conflict, or block according to repository policy. Never overwrite divergent remote state silently.

### Save name differs only by case

Apply repository-aware collision policy while preserving the user's display capitalization.

### Retention cleanup fails

Keep the new valid revision and report a cleanup warning. Do not mark the save itself failed.

### Previous revision is corrupt

A new save may still succeed from the validated active runtime. Preserve diagnostic history and avoid using the corrupt revision as a rollback source.

### Background save completes after Save As changes target

Associate completion with the target captured by its transaction. Do not redirect it to the newer active target.

### Network host disconnects during save

The authoritative server completes or cancels the transaction and reports status on reconnection.

---

## 68. Acceptance criteria

The workflow is complete when:

1. Save Game creates a new revision under the current save identity.
2. Save As creates a new identity or explicit branch without deleting the source.
3. Display names are separate from internal paths.
4. Save names support localized Unicode subject to safe policy limits.
5. Only approved writable repositories can be selected.
6. Storage validation includes staging, output, promotion, and safety margin requirements.
7. All estimator premises come from named policy values.
8. Saving waits for one consistent canonical career boundary.
9. The runtime snapshot records an explicit career revision and sequence number.
10. Previous valid revisions are never rewritten in place.
11. Staged output is checksummed and validated before promotion.
12. Save success is reported only after durable promotion and manifest completion.
13. Local save success and cloud synchronization state are communicated separately.
14. Cancellation before commit preserves the previous valid save.
15. Cancellation during atomic operations is safely deferred.
16. Save transactions use locks, expected revisions, and idempotency keys.
17. Duplicate commands cannot create duplicate revisions or uploads.
18. Autosave and manual-save overlap follows one deterministic policy.
19. Rolling-backup cleanup cannot remove the only valid or protected revision.
20. Low-storage and permission failures preserve the previous valid revision.
21. Crash recovery uses transaction manifests rather than filename guesses.
22. Multiplayer clients cannot write authoritative saves independently.
23. Save and Quit does not exit after a failed save without an explicit user decision.
24. Keyboard users can complete Save and Save As.
25. Screen-reader users receive target, storage, cloud, progress, error, and success information.
26. High text scaling and right-to-left layouts remain usable.
27. A successful Save As becomes the default target for later Save Game actions according to policy.
28. No proprietary artwork, exact wording, source code, logos, or original database content is required.

---

## 69. Recommended tests

### Unit tests

- Save-name normalization.
- Reserved-name validation.
- Display-name collision policy.
- Storage estimate calculation from named premises.
- Safe-boundary eligibility.
- Save-type mapping.
- Revision ancestry.
- Retention selection.
- Protected-backup preservation.
- Progress-weight calculation.
- Idempotency lookup.
- Cloud-state mapping.
- Save-result construction.

### Integration tests

- Save current career locally.
- Save As to a new local identity.
- Save As to a cloud-backed repository.
- Update active target after Save As.
- Create an autosave revision.
- Create a quit save.
- Create a protected recovery checkpoint.
- Load the newly written save and validate equivalence.
- Save a hot-seat career.
- Save an authoritative network career.
- Queue cloud upload after local success.
- Retry failed cloud synchronization.
- Apply rolling retention after promotion.

### Transaction tests

- Fail before snapshot.
- Fail during serialization.
- Fail during compression.
- Fail during checksum calculation.
- Fail during staged validation.
- Fail during promotion.
- Fail after promotion before latest-pointer update.
- Fail after latest-pointer update before manifest completion.
- Cancel at each precommit stage.
- Restart after each interrupted transaction state.
- Verify prior valid revision at every failure boundary.

### Concurrency tests

- Manual save during autosave.
- Autosave during manual save.
- Two Save commands with the same request ID.
- Two Save commands with different IDs for one target.
- Career commands arrive during snapshot acquisition.
- Remote latest revision changes during save.
- Save As while a background save is finishing.
- Host disconnects during a network save.

### Security tests

- Path traversal in display name.
- Symbolic-link repository escape.
- Forged repository ID.
- Forged career revision.
- Forged target revision.
- Unauthorized network save request.
- Oversized save name.
- Invalid Unicode and bidirectional controls.
- Integer overflow in size estimates.
- Malicious serialized entity.
- Checksum replacement attack.
- Cloud replay revision.
- Diagnostic token leakage.

### Accessibility tests

- Keyboard-only Save Game.
- Keyboard-only Save As.
- Save-name error announcement.
- Storage warning announcement.
- Progress-stage announcements.
- Deferred-cancellation announcement.
- Failure-summary focus.
- Success-summary focus.
- Return-focus restoration.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long localized save and repository names.

### Visual regression tests

Capture at least:

- Save Game confirmation.
- Save As form.
- Duplicate display-name warning.
- Local target.
- Cloud-backed target.
- Insufficient-storage error.
- Removable-storage warning.
- Waiting for safe boundary.
- Save progress.
- Deferred cancellation.
- Validation failure.
- Promotion failure.
- Local success with cloud queued.
- Cloud synchronization failure.
- Save As success.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 70. Condensed LLM implementation brief

```text
Implement a desktop Save Game and Save As workflow for an original football-
management simulation.

Save Game creates a new immutable revision under the active save identity. Save
As creates a new save identity or explicit branch, records ancestry, preserves
the source save, and normally becomes the target for future Save Game actions.
Treat display names as labels, not filesystem paths. Generate internal object
names inside approved repositories.

Before saving, verify controller permission, current career revision, active
checkpoint, repository availability, storage capacity, target revision, and a
safe canonical simulation boundary. Storage estimates must include staging,
compression workspace, output, promotion overhead, backups, and configured
safety margins. Every premise must come from named policy values rather than
hardcoded literals inside formulas.

Acquire a save lock and capture one consistent runtime snapshot with a canonical
career revision and sequence number. Serialize canonical world state through a
strict versioned schema into transaction staging. Exclude or mark derived caches
as rebuildable. Write preview metadata, flush files, calculate approved
checksums, validate required files and critical read-back, then promote a new
immutable revision and update the latest-valid pointer. Never rewrite the
previous valid revision in place.

Use transaction and recovery manifests for every write. On failure or
cancellation before promotion, clean or quarantine staging and preserve the
previous valid revision. Defer cancellation during atomic flush, promotion,
pointer update, or rollback. On restart, inspect transaction state to clean,
validate, complete, or quarantine the operation. Never guess from filenames.

Support manual saves, Save As, autosaves, rolling backups, recovery checkpoints,
quit saves, and migration backups. Retention policy values are configured and
must never remove the latest valid revision, the only valid revision, protected
milestones, active loads, or required recovery backups. Overlapping manual and
autosave requests follow one deterministic coalescing or queue policy.

For cloud-backed storage, prefer local durable completion followed by immutable
upload and remote verification. Report local success and cloud state separately.
Never overwrite a divergent remote branch silently. Detect ancestry conflicts
and route to explicit conflict resolution.

In multiplayer, only the authoritative host or server writes canonical state.
Clients may request a save but cannot create authoritative forks. The server
selects the command-sequence boundary and broadcasts success only after commit.

Commands must include career ID, expected career revision, active checkpoint,
target identity or new-save specification, controller context, save type, and an
idempotency request ID. Repeating a request must not create duplicate revisions,
retention runs, or cloud uploads.

Show target name, repository, save type, estimate, free space, backup policy,
cloud behavior, weighted progress, safe cancellation, and precise success or
failure status. Save and Quit must not exit after a failed save without an
explicit decision.

Support complete keyboard interaction, persistent labels, visible focus,
progress announcements, linked errors, reduced motion, high text scaling,
localization, and right-to-left layouts. Treat names, paths, repositories,
runtime snapshots, provider responses, manifests, and renderer commands as
untrusted. Do not copy proprietary artwork, exact wording, source code, logos,
or databases.
```

---

## 71. Next planned item

**Screen 15: Delete Saved Game** should define local and cloud version selection, soft delete and trash retention, backup visibility, multiplayer ownership, protected and active saves, destructive confirmation, typed confirmation where appropriate, concurrent-operation conflicts, recovery, audit behavior, and return to the save library.

---

## Suggested Git commit

```text
feat(docs): specify save game and save as workflow
```
