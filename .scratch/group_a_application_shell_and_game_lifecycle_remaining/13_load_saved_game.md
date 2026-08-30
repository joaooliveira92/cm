# Screen 13: Load Saved Game

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, databases, source code, logos, exact interface wording, or other protected assets. Use an original visual identity and fictional or properly licensed football data.

---

## 1. Purpose

The **Load Saved Game** screen discovers, validates, previews, and opens an existing career save.

It is normally opened from the Main Menu, but it may also be used from an in-career menu when the product permits switching careers without restarting the application.

The screen must allow the user to:

- Discover local, cloud, removable, imported, and multiplayer career saves from approved locations.
- Distinguish manual saves, autosaves, rolling backups, recovery checkpoints, and managerless careers.
- Search, sort, and filter a potentially large save library.
- Review career metadata without loading the full simulation world.
- Identify compatible, migratable, incomplete, locked, corrupt, unavailable, and conflicting saves.
- Choose the correct manager or participant ownership context for multiplayer careers.
- Compare local and cloud versions when synchronization conflicts exist.
- Validate save integrity before loading canonical world state.
- Create a safety backup before schema migration.
- Recover from interrupted writes where possible.
- Cancel loading safely before the career becomes active.
- Enter the career only after deserialization, migration, validation, ownership binding, and runtime initialization succeed.

This screen must never expose an incomplete or unvalidated save as a healthy playable career.

---

## 2. Position in the application flow

### Main Menu path

```text
Main Menu
    |
    | Load Career
    v
Load Saved Game
    |
    | Compatible save selected
    v
Save Validation and Loading
    |
    v
Career Inbox, Club Overview, Job Vacancies, or Multiplayer Waiting State
```

### In-career path

```text
Current Career
    |
    | Load Another Career
    v
Unsaved-Changes Check
    |
    v
Load Saved Game
    |
    v
Selected Career
```

### Migration path

```text
Load Saved Game
    |
    | Older but supported schema selected
    v
Migration Review
    |
    v
Safety Backup
    |
    v
Save Migration
    |
    v
Validation
    |
    v
Career
```

---

## 3. Core concepts

### 3.1 Career save

A career save is a durable representation of one football world and its active or incomplete human-manager state.

### 3.2 Save manifest

The save manifest is a small, independently readable metadata record used for discovery and preview.

It should be readable without deserializing the full world.

### 3.3 Canonical save data

Canonical save data contains authoritative career state. Derived indexes and caches should be rebuildable.

### 3.4 Manual save

A manual save is explicitly created and named by the user.

### 3.5 Autosave

An autosave is produced automatically according to a configured schedule.

### 3.6 Rolling backup

A rolling backup is one member of a bounded rotation designed to preserve earlier recoverable states.

### 3.7 Recovery checkpoint

A recovery checkpoint is created around risky operations such as migration, manager activation, or interrupted save replacement.

It should be clearly distinguished from an ordinary user save.

### 3.8 Cloud save

A cloud save is stored or synchronized through an approved remote provider.

### 3.9 Multiplayer career

A multiplayer career has authoritative ownership, host, participant, and manager-control state that must be revalidated when loaded.

### 3.10 Save compatibility

Compatibility describes whether the current application can read, migrate, and safely run a save.

### 3.11 Save integrity

Integrity describes whether required files, checksums, references, transactions, and manifests form a complete valid save.

### 3.12 Runtime activation

Runtime activation occurs after canonical state is loaded and validated. It creates active indexes, services, subscriptions, and the initial navigation context.

---

## 4. Save-type model

```typescript
type CareerSaveType =
  | "manual"
  | "autosave"
  | "rolling_backup"
  | "recovery_checkpoint"
  | "managerless_checkpoint"
  | "multiplayer_host_save"
  | "multiplayer_client_cache"
  | "imported_save";
```

A multiplayer client cache must not be presented as an authoritative host save.

---

## 5. Compatibility states

```typescript
type SaveCompatibilityState =
  | "compatible"
  | "migration_required"
  | "newer_application_required"
  | "unsupported_legacy_format"
  | "missing_content"
  | "incompatible_mod_configuration"
  | "platform_restricted"
  | "unknown";
```

### 5.1 Compatible

The save can be loaded directly with the current engine and schema.

### 5.2 Migration required

The save uses an older supported schema and must be migrated before ordinary play.

### 5.3 Newer application required

The save was created by a newer incompatible application or schema version.

### 5.4 Unsupported legacy format

The save is recognized but no safe migration path exists.

### 5.5 Missing content

A required database or content pack is unavailable.

### 5.6 Incompatible mod configuration

Installed content fingerprints do not match the save's required configuration.

### 5.7 Platform restricted

The save depends on a feature unavailable on the current platform.

---

## 6. Integrity states

```typescript
type SaveIntegrityState =
  | "not_checked"
  | "checking"
  | "valid"
  | "valid_with_warnings"
  | "incomplete_write"
  | "recoverable"
  | "corrupt"
  | "unavailable";
```

Compatibility and integrity are independent. A compatible save may be corrupt, and an intact save may require migration.

---

## 7. Storage-location states

```typescript
type SaveLocationType = "local" | "cloud" | "removable" | "imported" | "network_host";
```

```typescript
type SaveAvailabilityState =
  | "available"
  | "downloading"
  | "uploading"
  | "offline_cached"
  | "remote_only"
  | "missing"
  | "permission_denied"
  | "provider_unavailable";
```

The screen must not imply that a remote-only save is locally loadable before download and verification complete.

---

## 8. Conceptual desktop layout

```text
+--------------------------------------------------------------------------------+
| LOAD CAREER                                                                    |
|--------------------------------------------------------------------------------|
| Search careers... [Location: All v] [Type: All v] [Status: Playable v]         |
| [Manager: All v] [Sort: Last played v]                     [Refresh] [Import]  |
|--------------------------------------------------------------------------------|
| SAVED CAREERS                                  | CAREER DETAILS                 |
|                                                |                                |
| [o] North United Journey                       | North United Journey           |
|     João Monteiro, North United                | Save type: Manual              |
|     18 March 2005, 21:40                       | Last saved: 18 March 2005      |
|     Local and cloud, synchronized              | Career date: 12 February 2005  |
|     Compatible, integrity verified             |                                |
|                                                | Managers: 2                    |
| [ ] Example City Rebuild                       | Current manager: João Monteiro |
|     Autosave 2                                 | Club: North United             |
|     Migration required                         | Competition: First Division    |
|                                                | Position: 4th                  |
| [ ] Continental Challenge                      | Next fixture: 15 February      |
|     Cloud version newer                        |                                |
|     Synchronization conflict                   | Database: Fictional World 1.0  |
|                                                | Engine save version: 7         |
| [ ] Unfinished Career                          | Size: 428 MB                   |
|     Managerless checkpoint                     |                                |
|     Add a manager to continue                  | [View Managers]                |
|                                                | [View Compatibility]           |
|                                                | [View Save History]            |
|--------------------------------------------------------------------------------|
| [Back] [Delete] [Open Save Folder] [Duplicate]                       [Load Career]|
+--------------------------------------------------------------------------------+
```

Empty state:

```text
No saved careers were found.

[Start New Career] [Import Save] [Choose Save Location] [Refresh]
```

These diagrams define behavior and information hierarchy rather than exact styling.

---

## 9. Screen regions

### 9.1 Header

Display:

- `Load Career`.
- Current storage or account context where relevant.
- Synchronization state.
- Back navigation.

### 9.2 Search and filter toolbar

Recommended controls:

- Search.
- Location.
- Save type.
- Compatibility or integrity status.
- Career mode.
- Manager.
- Club or nation.
- Sort order.
- Refresh.
- Import.

### 9.3 Save library

The primary list displays save summaries without loading full canonical world data.

### 9.4 Details panel

The selected save's metadata, compatibility, integrity, ownership, and career preview appear here.

### 9.5 Footer actions

Recommended actions:

- `Back`
- `Delete`
- `Open Save Folder`, local desktop only.
- `Duplicate`
- `Load Career`

Contextual actions may include:

- `Download`
- `Resolve Conflict`
- `Migrate`
- `Recover`
- `Add Manager`
- `Join Host`

---

## 10. Save manifest model

```typescript
interface CareerSaveManifest {
  readonly saveId: string;
  readonly careerId: string;
  readonly displayName: string;
  readonly saveType: CareerSaveType;
  readonly locationType: SaveLocationType;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastPlayedAt?: string;
  readonly careerDate: string;
  readonly applicationVersion: string;
  readonly worldSchemaVersion: number;
  readonly saveFormatVersion: number;
  readonly engineVersion: string;
  readonly databaseFingerprint: string;
  readonly databaseDisplayName: string;
  readonly contentPackFingerprints: readonly string[];
  readonly careerMode: "single_player" | "local_hot_seat" | "network";
  readonly managerSummaries: readonly SaveManagerSummary[];
  readonly focusManagerId?: string;
  readonly activeClubSummary?: SaveClubSummary;
  readonly nextFixtureSummary?: SaveFixtureSummary;
  readonly canonicalDataBytes: number;
  readonly manifestRevision: number;
  readonly transactionState: SaveTransactionState;
  readonly checksumAlgorithmId: string;
  readonly canonicalChecksum?: string;
  readonly previewSchemaVersion: number;
}
```

The manifest is untrusted input and must be schema-validated before display.

---

## 11. Save row specification

```typescript
interface SaveLibraryRowModel {
  readonly saveId: string;
  readonly displayName: string;
  readonly saveTypeLabel: string;
  readonly managerSummary: string;
  readonly organizationSummary?: string;
  readonly careerDateLabel: string;
  readonly lastSavedLabel: string;
  readonly locationSummary: string;
  readonly synchronizationState?: SaveSynchronizationState;
  readonly compatibilityState: SaveCompatibilityState;
  readonly integrityState: SaveIntegrityState;
  readonly availabilityState: SaveAvailabilityState;
  readonly selected: boolean;
  readonly warningCodes: readonly string[];
  readonly permittedActions: readonly SaveLibraryAction[];
}
```

Conceptual statuses:

```text
Compatible, integrity verified
Migration required
Cloud version newer
Synchronization conflict
Incomplete write, recovery available
Corrupt, no automatic recovery found
Managerless career, add a manager to continue
Network host required
```

---

## 12. Discovery behavior

Discovery should inspect approved save repositories only.

Possible repositories:

- Default local save directory.
- User-configured local directories.
- Approved cloud-provider repository.
- Removable location explicitly selected by the user.
- Import staging directory.
- Network host session list.

Do not recursively scan arbitrary storage roots.

```typescript
interface SaveRepositoryDescriptor {
  readonly repositoryId: string;
  readonly displayName: string;
  readonly locationType: SaveLocationType;
  readonly enabled: boolean;
  readonly readOnly: boolean;
  readonly availabilityState: SaveAvailabilityState;
}
```

---

## 13. Discovery pipeline

```text
Enumerate approved repositories
  -> Read candidate manifests
  -> Validate manifest schemas
  -> Deduplicate save identities
  -> Determine local and remote versions
  -> Calculate compatibility
  -> Load safe preview metadata
  -> Schedule integrity checks
  -> Publish library rows
```

Discovery must remain responsive and support cancellation when leaving the screen.

---

## 14. Incremental discovery

Rows may appear incrementally as repositories respond.

Rules:

- Preserve selection when a row is updated.
- Do not reorder repeatedly while the user is interacting unless live sorting is clearly indicated.
- Batch updates where possible.
- Mark unresolved status as `Checking`.
- Do not enable Load until minimum compatibility and availability checks complete.

---

## 15. Save identity and deduplication

Local and cloud copies of the same save share a stable `saveId` and `careerId` but may have different revisions.

Deduplication must use stable identifiers and revision metadata, not filename similarity.

```typescript
interface SaveVersionDescriptor {
  readonly saveId: string;
  readonly repositoryId: string;
  readonly manifestRevision: number;
  readonly canonicalChecksum?: string;
  readonly updatedAt: string;
  readonly deviceId?: string;
  readonly ancestryRevisionId?: string;
}
```

---

## 16. Search behavior

Search may match:

- Save display name.
- Career ID suffix where explicitly supported.
- Human manager display name.
- Current club or national team.
- Competition.
- Database display name.

Search must not inspect hidden private data from multiplayer participants the current account may not view.

Requirements:

- Debounced.
- Cancellable.
- Locale-aware.
- Revision-aware.
- Bounded in length.
- Nonmutating.

---

## 17. Filters

Recommended filters:

### Location

- All.
- Local.
- Cloud.
- Removable.
- Imported.
- Network.

### Type

- All.
- Manual.
- Autosave.
- Backup.
- Recovery.
- Managerless.
- Multiplayer.

### Status

- All.
- Playable.
- Migration required.
- Synchronization conflict.
- Recoverable.
- Corrupt.
- Missing content.
- Offline.

### Career mode

- Single player.
- Local hot-seat.
- Network.

### Manager

Only managers visible to the current controller should appear.

---

## 18. Sorting

Recommended sort orders:

- Last played, newest first.
- Last saved, newest first.
- Career date.
- Save name.
- Manager name.
- Club name.
- Save size.
- Save type.
- Compatibility status.

Use a stable tie-breaker such as `saveId`.

Do not reorder the selected row unexpectedly when background integrity checks finish. Defer resorting until interaction pauses or provide a clear sort-update policy.

---

## 19. Details panel

The details panel may display:

- Save name.
- Save type.
- Location.
- Synchronization state.
- Last saved date and time.
- Career date.
- Human managers.
- Current focus manager.
- Current club and competition.
- League position.
- Next fixture.
- World database.
- Content packs.
- Application and schema version.
- Save size.
- Integrity state.
- Migration requirement.
- Recovery availability.
- Multiplayer ownership requirement.

Every field comes from a validated manifest or safe preview record.

---

## 20. Manager preview

```typescript
interface SaveManagerSummary {
  readonly managerId: string;
  readonly displayName: string;
  readonly employmentType: "club" | "national_team" | "unemployed";
  readonly organizationId?: string;
  readonly organizationDisplayName?: string;
  readonly ownershipType: "local" | "network";
  readonly retired: boolean;
  readonly visibleToCurrentController: boolean;
}
```

The list must obey multiplayer privacy and ownership policy.

---

## 21. Career preview

Possible preview fields:

- Current season.
- Career date.
- Manager count.
- Current organization.
- League position.
- Recent result.
- Next fixture.
- Club balance band.
- Unread inbox count, if safely available.

Preview metadata must be treated as potentially stale until the canonical save loads.

---

## 22. Save type presentation

Save type must be textual and visible.

Examples:

```text
Manual save
Autosave, slot 2 of 3
Rolling backup, previous revision
Recovery checkpoint
Managerless career checkpoint
Network host save
```

Do not distinguish save types by icon or color alone.

---

## 23. Autosave groups

Rolling autosaves for the same career may be grouped.

```text
North United Journey
  Manual save
  Autosave 1, newest
  Autosave 2
  Autosave 3, oldest
```

The group should expose:

- Newest valid version.
- Earlier backups.
- Integrity status per version.
- Compare timestamps.
- A direct `Load newest valid` action.

Do not hide older valid backups when the newest save is corrupt.

---

## 24. Local and cloud synchronization states

```typescript
type SaveSynchronizationState =
  | "local_only"
  | "cloud_only"
  | "synchronized"
  | "local_newer"
  | "cloud_newer"
  | "uploading"
  | "downloading"
  | "conflict"
  | "offline"
  | "error";
```

### Local newer

Offer upload or local load according to provider policy.

### Cloud newer

Offer download before loading.

### Conflict

Require explicit conflict resolution. Never choose solely by file modification time when ancestry metadata indicates divergent revisions.

---

## 25. Synchronization conflict review

```text
Two different versions of this career are available.

LOCAL VERSION
Last saved: 18 March 2005, 21:40
Career date: 12 February 2005
Managers: João Monteiro, Jamie Silva
Device: This device

CLOUD VERSION
Last saved: 18 March 2005, 22:15
Career date: 10 February 2005
Managers: João Monteiro, Jamie Silva
Device: Laptop

The versions have diverged and cannot be merged automatically.

[Keep Both] [Use Local Version] [Use Cloud Version] [Cancel]
```

Career worlds should not be field-merged automatically unless the save architecture explicitly supports deterministic event-log merging.

---

## 26. Keep Both behavior

`Keep Both` creates a new save identity for one branch while preserving both careers.

It must:

- Retain canonical source data unchanged.
- Generate a new `saveId` for the duplicate branch.
- Record ancestry metadata.
- Use a conflict-safe display name.
- Avoid overwriting either source.

---

## 27. Remote-only save

A remote-only save must be downloaded to a verified staging location before loading.

```text
Downloading career...
[====================------------] 62%
```

After download:

- Verify package size limits.
- Verify manifest.
- Verify checksum.
- Verify provider identity.
- Promote to a local cache or load staging area.

Cancellation deletes incomplete download artifacts unless resumable-download policy says otherwise.

---

## 28. Offline behavior

When offline:

- Load verified local saves.
- Load verified offline cloud caches when policy allows.
- Mark remote-only saves unavailable.
- Preserve pending synchronization operations.
- Do not claim that remote state is current.

```text
Cloud status could not be checked. This local version was last synchronized
on 17 March 2005 at 19:10.
```

---

## 29. Compatibility evaluation

```typescript
interface SaveCompatibilityReport {
  readonly state: SaveCompatibilityState;
  readonly sourceApplicationVersion: string;
  readonly sourceWorldSchemaVersion: number;
  readonly targetApplicationVersion: string;
  readonly targetWorldSchemaVersion: number;
  readonly migrationPathIds: readonly string[];
  readonly missingContentIds: readonly string[];
  readonly incompatibleContentIds: readonly string[];
  readonly warningCodes: readonly string[];
  readonly blockingReasonCodes: readonly string[];
}
```

Compatibility must be computed by a trusted service using versioned migration metadata.

---

## 30. Missing content

A save may require:

- Base database package.
- Content pack.
- Rules extension.
- Localization asset.
- Licensed media pack.

Differentiate required canonical content from optional presentation content.

Example:

```text
Required content missing

Competition Rules Pack 1.4 is required to load this career.

[Locate Content] [Manage Content Packs] [Cancel]
```

Missing optional portraits or badges should not normally block loading.

---

## 31. Modified content fingerprints

If content IDs match but fingerprints differ:

```text
This career was created with a different version of Community Rules Pack.

Saved fingerprint: A81F...
Installed fingerprint: C942...

Loading with mixed rule definitions is not supported.
```

Do not treat matching filenames or display names as compatibility.

---

## 32. Migration review

Before migration, display:

- Source application version.
- Source save schema.
- Target schema.
- Required migration steps.
- Expected duration range.
- Backup location.
- Known behavior changes.
- Whether reverse loading is possible.

```text
This career must be upgraded before it can be loaded.

A safety backup will be created first. The upgraded save may not open in older
versions of the application.

[Cancel] [Create Backup and Upgrade]
```

---

## 33. Migration system

```typescript
interface SaveMigrationStep {
  readonly migrationId: string;
  readonly sourceSchemaVersion: number;
  readonly targetSchemaVersion: number;
  readonly migrationPolicyVersion: string;
  readonly reversible: boolean;
  readonly estimatedCostProfileId: string;
}
```

Migration rules:

- Follow an explicit contiguous path.
- Validate after every step or checkpoint boundary.
- Never mutate the only original copy in place.
- Create a safety backup first.
- Use transactional output.
- Record migration provenance.
- Promote only after final validation.

---

## 34. Migration backup

The safety backup must:

- Preserve the original save exactly.
- Use a new backup identity or immutable backup artifact.
- Be checksummed.
- Be readable independently.
- Not be overwritten by the migrated result.
- Be deleted only through an explicit later cleanup workflow.

If the backup cannot be created, migration must not start.

---

## 35. Unsupported newer save

```text
This career was saved by a newer application version and cannot be opened by
the current version.

Saved by: 2.4.0
Current version: 2.1.0

[Return to Save List]
```

Offer a trusted update workflow only when available. Do not attempt lossy downgrade migration unless explicitly supported.

---

## 36. Integrity validation

Validation may include:

- Manifest schema.
- Package structure.
- Canonical file presence.
- File lengths.
- Checksums.
- Transaction state.
- Save ancestry.
- Required checkpoint references.
- Database and content fingerprints.
- Canonical data schema.
- Referential integrity sampling before load.
- Full validation after deserialization.

Integrity checks should be staged so the list remains responsive.

---

## 37. Incomplete write detection

An incomplete write may have:

- A temporary package.
- A transaction manifest.
- A prior valid save.
- A partially promoted replacement.
- A completed new package without final manifest promotion.

The application must inspect transaction metadata rather than guessing from filenames alone.

---

## 38. Recovery workflow

```text
An interrupted save operation was detected.

A previous valid version and a newer incomplete version are available.

[Load Previous Valid Save] [Attempt Recovery] [View Details] [Cancel]
```

Recovery should never overwrite the previous valid save until the recovered version passes validation.

---

## 39. Recovery outcomes

### Fully recovered

Create a new valid save revision and preserve the previous version.

### Partially recoverable

If canonical integrity cannot be guaranteed, do not present it as playable. A diagnostic export may be offered.

### Not recoverable

Keep earlier backups visible and explain that the selected revision cannot be used.

---

## 40. Corrupt save behavior

```text
This save did not pass integrity checks.

No changes were made to it.

[Find Earlier Backup] [Attempt Recovery] [Copy Safe Diagnostic] [Cancel]
```

Do not delete a corrupt save automatically.

---

## 41. Import Save

Import must use an explicit file picker or approved source connector.

Import process:

1. Copy the source to a staging location.
2. Enforce size limits.
3. Validate file signature and package structure.
4. Reject path traversal and symbolic-link escape.
5. Parse the manifest with a versioned schema.
6. Determine compatibility and integrity.
7. Assign repository metadata.
8. Detect duplicate save identities.
9. Offer keep, replace through safe versioning, or cancel.
10. Promote only after validation.

Do not load directly from an arbitrary untrusted archive path.

---

## 42. Duplicate Save

Duplicate creates an independent save-library entry.

It should:

- Copy canonical state transactionally.
- Generate a new `saveId`.
- Preserve `careerId` only if duplicates are considered branches of the same career, otherwise generate a new career branch ID according to policy.
- Record ancestry.
- Reset cloud synchronization identity unless explicitly cloning it is safe.
- Preserve original unchanged.

---

## 43. Delete Save

Delete is destructive and requires confirmation.

```text
Delete "North United Journey"?

This will remove the selected local save. Cloud and backup versions are shown
below and will be affected only if explicitly selected.

[Cancel] [Delete Selected Version]
```

For cloud saves, use provider-aware deletion and explain retention or recycle-bin behavior when known.

Deletion should support recovery through a trash or soft-delete policy where feasible.

---

## 44. Open Save Folder

Desktop-only behavior:

- Available for local repositories.
- Opens the approved directory, not an arbitrary manifest-supplied path.
- Disabled in sandboxed or unsupported environments.
- Never launches executable content.

---

## 45. Multiplayer save ownership

Before loading a network career, determine whether the current participant is:

- Host.
- Authorized co-host.
- Existing manager owner.
- Invited participant.
- Spectator.
- Unauthorized.

The save screen may display only manager and role information permitted by the career's privacy policy.

---

## 46. Network host save

A host save may be loaded locally by an authorized host, then exposed as a network session.

Required checks:

- Host authorization.
- Career version compatibility.
- Participant ownership consistency.
- Manager-slot integrity.
- Network configuration.
- Existing active-session conflict.

---

## 47. Join existing network career

A remote session entry may appear alongside saves but should be labeled as `Join Session`, not `Load Local Save`.

The workflow may require:

- Authentication.
- Session compatibility.
- Manager ownership claim.
- Downloaded world snapshot.
- Host synchronization.

A client cache alone must not become an authoritative fork without an explicit host-recovery workflow.

---

## 48. Managerless career

A managerless checkpoint may be loaded into Add Manager rather than ordinary career navigation.

```text
This career world has no active human manager.

[Add Manager] [View Career Setup] [Cancel]
```

The world normally cannot advance until a manager is activated, subject to explicit policy.

---

## 49. Retired or unavailable focus manager

If the manifest's previous focus manager is retired or no longer controlled by the current participant:

- Select another authorized active manager.
- Open Manager Selection.
- Open Add Manager if no active manager is available.
- Do not grant control based on stale focus metadata.

---

## 50. Load command

```typescript
interface LoadCareerCommand {
  readonly saveId: string;
  readonly selectedVersionId: string;
  readonly repositoryId: string;
  readonly expectedManifestRevision: number;
  readonly expectedCanonicalChecksum?: string;
  readonly requestedManagerId?: string;
  readonly controllerContextId: string;
  readonly conflictResolutionId?: string;
  readonly migrationAuthorizationId?: string;
  readonly requestId: string;
}
```

The command contains references, not trusted manifest-derived world state.

---

## 51. Load pipeline

```text
Acquire save read lease
  -> Refresh manifest
  -> Revalidate selected version
  -> Resolve cloud download if needed
  -> Resolve conflict decision
  -> Verify compatibility
  -> Migrate transactionally if authorized
  -> Verify package integrity
  -> Open canonical data read-only
  -> Deserialize through versioned schemas
  -> Validate canonical world
  -> Rebuild or load derived indexes
  -> Validate manager ownership
  -> Initialize runtime services
  -> Create load recovery marker
  -> Activate career session
  -> Navigate to initial destination
```

No career interface should read partially initialized runtime state.

---

## 52. Loading progress layout

```text
+--------------------------------------------------------------------------------+
| LOADING CAREER                                                                 |
|--------------------------------------------------------------------------------|
| North United Journey                                                          |
|                                                                                |
| [===============================-------------------] 63%                       |
|                                                                                |
| Rebuilding player and competition indexes...                                  |
|                                                                                |
| [x] Verifying save                                                            |
| [x] Reading career world                                                      |
| [x] Validating managers and ownership                                          |
| [>] Rebuilding runtime indexes                                                 |
| [ ] Initializing career services                                               |
| [ ] Preparing manager inbox                                                    |
|                                                                                |
| Elapsed: 00:38                  Estimated remaining: 00:15 to 00:35             |
|                                                                                |
| [Show Details]                                                  [Cancel Loading]|
+--------------------------------------------------------------------------------+
```

---

## 53. Load stages

Recommended stages:

- Acquire save lease.
- Download or stage selected version.
- Verify manifest and checksums.
- Migrate when required.
- Deserialize canonical world.
- Validate world.
- Validate managers and ownership.
- Load or rebuild indexes.
- Initialize simulation services.
- Initialize navigation context.
- Create recovery marker or checkpoint.
- Activate session.

Stage weights come from named configuration values.

---

## 54. Cancellation behavior

Loading should support cooperative cancellation before runtime activation.

Safe boundaries:

- Between downloaded chunks.
- Between package validation stages.
- Between migration steps when checkpointed.
- Between deserialization batches.
- Before runtime service activation.

Cancellation may be deferred during:

- Atomic migration promotion.
- Checkpoint finalization.
- Session activation commit.

After cancellation:

- Release read leases and locks.
- Stop workers.
- Remove incomplete staging files.
- Preserve completed migration backup and valid migrated save if already promoted.
- Return to the save list.

---

## 55. Runtime initialization

Initialize:

- Domain repositories.
- Simulation clock.
- Competition schedulers.
- Transfer market.
- News and inbox services.
- Search indexes.
- Scouting visibility.
- Manager ownership and permissions.
- Multiplayer synchronization.
- Autosave schedule.
- Navigation context.

Runtime services must start against a fully validated canonical world.

---

## 56. Initial destination after load

Possible destinations:

- Last safe screen.
- Manager Inbox.
- Club Overview.
- Job Vacancies for an unemployed manager.
- Add Manager for a managerless career.
- Manager Selection for several local managers.
- Multiplayer waiting or reconnect screen.
- Interrupted-operation recovery screen.

```typescript
interface CareerLoadDestinationPolicy {
  readonly restoreLastSafeScreen: boolean;
  readonly fallbackEmployedDestination: "inbox" | "club_overview";
  readonly fallbackUnemployedDestination: "inbox" | "job_vacancies";
  readonly managerlessDestination: "add_manager";
  readonly multipleManagerDestination: "manager_selection" | "last_controller";
}
```

Never restore a modal, transaction, or unsafe intermediate screen directly.

---

## 57. Last-safe-screen restoration

A save may contain a navigation bookmark.

It must:

- Reference a supported route ID.
- Contain validated parameters.
- Belong to the selected manager.
- Avoid sensitive stale transient state.
- Fall back safely if the entity no longer exists.

Examples of unsafe restoration targets:

- Open contract-signing transaction.
- Half-completed transfer negotiation.
- Confirmation modal.
- Debug panel.
- Deleted player profile.

---

## 58. Save load result

```typescript
interface CareerLoadResult {
  readonly loadTransactionId: string;
  readonly careerId: string;
  readonly activeCheckpointId: string;
  readonly selectedManagerId?: string;
  readonly destination: CareerNavigationDestination;
  readonly migrationResult?: SaveMigrationResult;
  readonly validationReport: CareerLoadValidationReport;
  readonly warnings: readonly CareerLoadWarning[];
  readonly loadedAt: string;
}
```

The UI receives identifiers and summaries, not the complete world graph.

---

## 59. Idempotency

Loading commands should be idempotent for the same request ID.

Repeated submission must:

- Focus or return the existing load transaction.
- Avoid creating duplicate runtime sessions.
- Avoid repeating migrations.
- Avoid creating multiple temporary copies.
- Return the original result after success where possible.

---

## 60. Save read lease

A save read lease prevents conflicting mutation while loading.

```typescript
interface SaveReadLease {
  readonly leaseId: string;
  readonly saveId: string;
  readonly versionId: string;
  readonly ownerProcessId: string;
  readonly acquiredAt: string;
  readonly expiresAt?: string;
}
```

The lease should not block reading an immutable backup but must prevent overwriting the selected version during validation.

---

## 61. Concurrent save changes

If the selected save changes after selection:

```text
This save changed before loading began.

The list has been refreshed. Review the latest version and try again.
```

Do not load a different revision silently.

---

## 62. State model

```typescript
interface LoadSavedGameScreenState {
  readonly repositories: readonly SaveRepositoryDescriptor[];
  readonly rows: readonly SaveLibraryRowModel[];
  readonly selectedSaveId?: string;
  readonly selectedVersionId?: string;
  readonly selectedDetails?: CareerSaveDetailsModel;
  readonly searchQuery: string;
  readonly filters: SaveLibraryFilters;
  readonly sort: SaveLibrarySort;
  readonly discoveryState: "idle" | "discovering" | "ready" | "partial" | "failed";
  readonly cloudState?: "offline" | "connecting" | "online" | "degraded";
  readonly pendingOperation:
    | "none"
    | "downloading"
    | "resolving_conflict"
    | "migrating"
    | "recovering"
    | "deleting"
    | "duplicating"
    | "loading";
  readonly issues: readonly SaveLibraryIssue[];
  readonly libraryRevision: number;
}
```

---

## 63. State transitions

```text
DISCOVERING_REPOSITORIES
  |
  v
DISCOVERING_SAVES
  |
  v
READY or READY_PARTIAL
  |
  +-- select save ---------> LOADING_DETAILS -> READY
  |
  +-- refresh -------------> DISCOVERING_SAVES
  |
  +-- import --------------> STAGING_IMPORT -> VALIDATING_IMPORT -> READY
  |
  +-- conflict ------------> REVIEWING_CONFLICT
  |                              |
  |                              +-- cancel -> READY
  |                              +-- resolve -> SYNCHRONIZING -> READY
  |
  +-- migrate -------------> CREATING_BACKUP -> MIGRATING -> VALIDATING -> READY
  |
  +-- recover -------------> RECOVERING -> VALIDATING -> READY
  |
  +-- Load Career ---------> VALIDATING_SELECTION
                                 |
                                 +-- changed -> READY_WITH_NOTICE
                                 +-- blocked -> READY_WITH_ERRORS
                                 +-- migration -> MIGRATION_REVIEW
                                 +-- valid -> LOADING_CAREER
                                                   |
                                                   +-- cancelled -> READY
                                                   +-- failed -> LOAD_FAILURE
                                                   +-- success -> CAREER
```

---

## 64. Commands and events

### 64.1 Commands

```text
DISCOVER_SAVE_REPOSITORIES
REFRESH_SAVE_LIBRARY
SET_SAVE_SEARCH_QUERY
SET_SAVE_LIBRARY_FILTERS
SET_SAVE_LIBRARY_SORT
SELECT_SAVE_VERSION
LOAD_SAVE_DETAILS
DOWNLOAD_REMOTE_SAVE
IMPORT_SAVE
RESOLVE_SAVE_CONFLICT
CREATE_MIGRATION_BACKUP
MIGRATE_SAVE
ATTEMPT_SAVE_RECOVERY
DUPLICATE_SAVE
REQUEST_DELETE_SAVE
CONFIRM_DELETE_SAVE
OPEN_LOCAL_SAVE_FOLDER
SELECT_LOAD_MANAGER
LOAD_CAREER
CANCEL_SAVE_OPERATION
REQUEST_BACK
```

### 64.2 Events

```text
SAVE_REPOSITORY_DISCOVERED
SAVE_MANIFEST_DISCOVERED
SAVE_LIBRARY_ROW_UPDATED
SAVE_INTEGRITY_CHECK_STARTED
SAVE_INTEGRITY_CHECK_COMPLETED
SAVE_CONFLICT_DETECTED
SAVE_CONFLICT_RESOLVED
SAVE_DOWNLOAD_STARTED
SAVE_DOWNLOAD_COMPLETED
SAVE_IMPORT_COMPLETED
SAVE_MIGRATION_BACKUP_CREATED
SAVE_MIGRATION_COMPLETED
SAVE_RECOVERY_COMPLETED
SAVE_DELETED
SAVE_DUPLICATED
CAREER_LOAD_STARTED
CAREER_LOAD_STAGE_CHANGED
CAREER_LOAD_COMPLETED
CAREER_LOAD_FAILED
CAREER_LOAD_CANCELLED
```

Mutating commands require expected revisions and idempotency request IDs.

---

## 65. Error states

### Repository unavailable

```text
The selected save location is unavailable.

Other available save locations are still shown.

[Retry Location] [Manage Save Locations]
```

### Cloud provider unavailable

```text
Cloud saves could not be checked.

Verified local saves remain available.

[Retry Connection]
```

### Manifest unreadable

```text
A save entry was found, but its metadata could not be read safely.

[Attempt Recovery] [Show in Folder] [Copy Safe Diagnostic]
```

### Download failure

```text
The cloud save could not be downloaded.

No incomplete save was added to the library.

[Retry Download]
```

### Migration failure

```text
The save could not be upgraded.

The original and safety backup were not modified.

[View Safe Details] [Return to Save List]
```

### Runtime initialization failure

```text
The career data loaded, but runtime services could not be initialized.

The career was not activated.

[Retry Loading] [Return to Save List]
```

### Ownership denied

```text
You do not have permission to control any manager in this career.

[Join as Spectator] [Request Access] [Cancel]
```

Show only actions supported by policy.

---

## 66. Accessibility requirements

### Save list

Expose saves as an accessible list or grid.

Each row should announce:

- Save name.
- Save type.
- Manager or career summary.
- Career date.
- Last saved time.
- Location.
- Synchronization state.
- Compatibility.
- Integrity.
- Selected state.

Example:

```text
North United Journey, manual save, João Monteiro at North United, career date
12 February 2005, synchronized local and cloud, compatible, integrity verified.
```

### Details panel

Use headings and definition lists for metadata.

### Live updates

Announce meaningful changes:

```text
Save discovery complete. Twelve careers found.
Cloud version downloaded and verified.
Migration backup created.
Loading career, rebuilding indexes.
Career loaded successfully.
```

Do not announce every discovered file or progress increment.

### Focus management

- Initial focus moves to the newest playable save or search field according to policy.
- Row updates preserve focus.
- Deleting a save moves focus to the nearest remaining row.
- Conflict review returns focus to the affected save.
- Loading progress receives focus when loading begins.
- Failures focus the error summary.

### Non-color communication

Compatibility, integrity, save type, synchronization, and availability require text or icon-plus-text.

---

## 67. Keyboard interaction

- `Tab` and `Shift+Tab`: move between toolbars, list, details, and actions.
- `Up Arrow` and `Down Arrow`: move through save rows.
- `Home` and `End`: move to first or last visible save.
- `Page Up` and `Page Down`: move by viewport.
- `Enter`: select or load the focused playable save according to context.
- `Space`: select a focused row without loading.
- `Ctrl+F`: focus search.
- `F5`: refresh the library.
- `Delete`: request save deletion.
- `Escape`: close an overlay, cancel an operation where safe, or return to Main Menu.

No shortcut may bypass conflict, migration, recovery, or deletion confirmation.

---

## 68. Localization requirements

- Localize all labels, save types, statuses, errors, and migration explanations.
- Localize dates, times, file sizes, durations, and counts.
- Preserve stable IDs independently from display names.
- Support right-to-left layout.
- Apply locale-aware search and sorting.
- Preserve manager-selected name order.
- Allow long save, manager, club, and database names to wrap.
- Use complete message templates.
- Do not expose untranslated internal error or migration codes as primary text.

---

## 69. Responsive behavior

### Wide desktop

Use a save list on the left and persistent details on the right.

### Standard desktop

Reduce details width before truncating save names.

### Narrow desktop

Stack:

```text
Search and filters
Save list
Selected save details
Actions
```

The details panel may become a separate screen or drawer.

### High text scaling

- Let row metadata wrap.
- Show statuses on separate lines.
- Keep Load associated with the selected save.
- Prevent footer overlap.
- Avoid horizontal scrolling for ordinary controls.

### Ultrawide display

Use bounded widths and avoid excessively long metadata lines.

---

## 70. Security and integrity requirements

Treat save packages, manifests, filenames, paths, cloud data, imported archives, manager names, and provider responses as untrusted.

Protect against:

- Path traversal.
- Symbolic-link escape.
- Archive extraction attacks.
- Decompression bombs.
- Unsafe deserialization.
- Unknown schema types.
- Oversized manifests.
- Integer overflow.
- Checksum confusion.
- Forged save and career IDs.
- Cloud replay or rollback.
- Unauthorized manager access.
- Filename markup injection.
- Invalid Unicode and bidirectional-control abuse.
- Concurrent overwrite.
- Migration supply-chain attacks.

Rules:

1. Discover only approved repositories.
2. Stage imported and remote content before use.
3. Validate package paths and extraction sizes.
4. Parse manifests through strict versioned schemas.
5. Deserialize canonical data through constrained versioned readers.
6. Verify checksums with an approved algorithm.
7. Bind cloud revisions to authenticated provider metadata.
8. Use read leases and expected revisions.
9. Never execute code embedded in a save.
10. Revalidate ownership in a trusted process or server.
11. Migrate to a new transactional output, never the only original copy.
12. Sanitize displayed and copied diagnostics.
13. Use safe integer handling for sizes and counts.
14. Activate runtime services only after validation.

---

## 71. Persistence rules

Persist as library metadata:

- Approved repository configuration.
- Stable save identity.
- Last verified manifest revision.
- Last integrity result and fingerprint.
- Cloud synchronization state.
- Last selected safe save.
- Search and filter preferences, if desired.

Persist through save operations:

- Migration backups.
- Recovery outputs.
- Conflict branches.
- Load recovery markers.
- Validation reports.

Do not persist as valid:

- Partial downloads.
- Failed imports.
- Half-migrated saves.
- Unverified recovered saves.
- Client caches as authoritative host saves.
- Stale ownership decisions.

---

## 72. Observability

Useful operational events:

- Repository discovery duration.
- Manifest parse success or failure category.
- Integrity-check duration.
- Cloud synchronization state.
- Conflict resolution choice category.
- Migration path and duration.
- Recovery success category.
- Load-stage durations.
- Runtime initialization failure category.
- Cancellation stage.

Avoid recording:

- Full local paths.
- Save contents.
- Full manager names.
- Private participant identifiers.
- Authentication tokens.
- Complete cloud object identifiers where sensitive.
- Raw corrupt data.

---

## 73. Edge cases

### Filename and manifest name differ

Display the validated manifest name and expose the filename only in safe technical details.

### Two saves share a display name

Distinguish them by date, manager, repository, and stable identity.

### Manifest says valid but checksum fails

Integrity status is corrupt or recoverable. Manifest claims are not authoritative.

### Local time changes

Use stored absolute timestamps and locale-aware display. Do not reorder solely on unstable formatted strings.

### Device sleeps during cloud download

Resume safely where supported and recalculate time estimates.

### Cloud revision changes during download

Reject or restart against the new authenticated revision.

### Save changes after selection

Require review of the new revision.

### Newest autosave is corrupt

Offer the newest earlier valid autosave.

### Migration succeeds but validation fails

Keep the original and backup. Do not promote the migrated output.

### App closes during migration

Recover from the migration transaction manifest. Never replace the original partially.

### Multiple local managers

Open Manager Selection unless a valid last-controller policy resolves one safely.

### Focus manager retired

Select another authorized active manager or open Add Manager.

### Managerless checkpoint

Navigate to Add Manager rather than ordinary career simulation.

### Save references missing optional media

Load with warnings and safe placeholders.

### Save references missing required rules

Block loading until compatible content is available.

### Available disk space drops during staging

Abort before promotion and clean incomplete artifacts.

### Duplicate load command

Return or focus the existing load transaction.

---

## 74. Acceptance criteria

The screen is complete when:

1. It discovers saves only from approved repositories.
2. It reads validated manifests without loading full worlds for the library view.
3. Manual saves, autosaves, backups, recovery checkpoints, managerless careers, and multiplayer saves are distinct.
4. Compatibility, integrity, availability, and synchronization are modeled separately.
5. Search, filters, and sorting never mutate saves.
6. Local and cloud copies are deduplicated by stable identity, not filename.
7. Diverged cloud and local versions require explicit conflict resolution.
8. Keep Both preserves both branches and creates a new save identity.
9. Remote-only saves are staged and verified before loading.
10. Offline mode does not claim unknown cloud state is current.
11. Missing required content blocks loading while missing optional presentation content does not.
12. Migration follows an explicit versioned path.
13. Migration never mutates the only original copy.
14. A verified safety backup is required before migration.
15. Interrupted writes are detected from transaction metadata.
16. Recovery never overwrites the previous valid save before validation.
17. Corrupt saves are not deleted automatically.
18. Imports are staged, bounded, and safely parsed.
19. Delete requires explicit confirmation and distinguishes local from cloud effects.
20. Multiplayer ownership is revalidated authoritatively.
21. Client caches cannot become authoritative host saves accidentally.
22. Load uses a read lease, expected revision, and idempotency request ID.
23. Loading is cancellable before runtime activation and transactional during migration.
24. Runtime services start only after canonical world validation.
25. Unsafe previous screens are not restored directly.
26. Duplicate load requests cannot create duplicate runtime sessions.
27. Keyboard users can discover, inspect, filter, and load saves.
28. Screen-reader users receive save type, dates, location, compatibility, integrity, and synchronization state.
29. High text scaling and right-to-left layouts remain usable.
30. Successful loading navigates to the correct manager and career destination.
31. No proprietary artwork, exact wording, source code, logos, or original database content is required.

---

## 75. Recommended tests

### Unit tests

- Manifest schema validation.
- Compatibility-state calculation.
- Integrity-state calculation.
- Save identity deduplication.
- Synchronization-state derivation.
- Stable sorting.
- Search normalization.
- Autosave grouping.
- Migration-path resolution.
- Required versus optional content classification.
- Read-lease validation.
- Load-destination policy.
- Last-safe-route validation.
- Warning-acknowledgment invalidation.

### Integration tests

- Discover local manual saves.
- Discover grouped autosaves.
- Discover cloud-only saves.
- Download and verify a cloud save.
- Load a compatible single-player save.
- Load a hot-seat save and select a manager.
- Load a managerless checkpoint into Add Manager.
- Load an unemployed manager into Job Vacancies or Inbox.
- Migrate an older supported save.
- Reject a newer unsupported save.
- Block missing required content.
- Continue with missing optional media.
- Import a valid save.
- Duplicate a save.
- Delete a local save.
- Resolve a local and cloud conflict.
- Recover an interrupted write.
- Fall back to an earlier valid autosave.

### Transaction tests

- Fail before migration backup.
- Fail after backup but before migration.
- Fail during a migration step.
- Fail after migration before validation.
- Fail during migrated-save promotion.
- Fail during runtime initialization.
- Cancel during download.
- Cancel during deserialization.
- Defer cancellation during atomic promotion.
- Restart after an interrupted load transaction.

### Concurrency tests

- Save revision changes during selection.
- Cloud revision changes during download.
- Two load requests target one save.
- Save is deleted while details are open.
- Synchronization completes while the list is filtered.
- Integrity checks finish out of order.
- Manager ownership changes during load.
- Host starts the same network career twice.

### Security tests

- Path traversal in imported archive.
- Symbolic-link escape.
- Decompression bomb.
- Oversized manifest.
- Malformed package structure.
- Unsafe serialized object type.
- Unknown schema version.
- Checksum mismatch.
- Forged save ID.
- Forged cloud revision.
- Cross-account cloud object.
- Unauthorized manager selection.
- Markup-like save and manager names.
- Invalid Unicode and bidirectional controls.
- Integer overflow in sizes.
- Malicious migration payload.
- Secret leakage in diagnostics.

### Accessibility tests

- Keyboard-only save discovery and load.
- Save-list row announcements.
- Filter and sort navigation.
- Details heading navigation.
- Conflict-review focus.
- Migration-review focus.
- Delete-confirmation focus.
- Loading-stage announcements.
- Cancellation announcement.
- Error-summary focus.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long localized save, manager, club, and database names.

### Visual regression tests

Capture at least:

- Normal local save library.
- Empty library.
- Autosave group expanded.
- Cloud-only save.
- Offline cloud state.
- Local newer state.
- Cloud newer state.
- Synchronization conflict.
- Migration required.
- Missing content.
- Recoverable incomplete write.
- Corrupt save.
- Managerless career.
- Multiplayer save.
- Delete confirmation.
- Loading progress.
- Migration progress.
- Load failure.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 76. Condensed LLM implementation brief

```text
Implement a desktop Load Saved Game screen for an original football-management
simulation. Discover career saves from approved local, cloud, removable,
imported, and network repositories. Read strict versioned save manifests for
library previews without deserializing the complete world.

Model save type, location, availability, synchronization, compatibility, and
integrity as separate states. Distinguish manual saves, autosaves, rolling
backups, recovery checkpoints, managerless checkpoints, authoritative network
host saves, client caches, and imports. Never present an incomplete, corrupt,
remote-only, or client-cache artifact as a healthy playable save.

Provide debounced search, filters, stable sorting, grouped autosaves, incremental
discovery, virtualized rows, and a details panel. Preserve focus and selection
as background integrity and cloud checks update. Deduplicate local and cloud
copies using stable save IDs, revisions, ancestry, and checksums, not filenames.

Handle local-only, cloud-only, synchronized, local-newer, cloud-newer, offline,
and divergent conflict states. Divergent career worlds must not be field-merged
unless the storage architecture explicitly supports deterministic event-log
merging. Offer Use Local, Use Cloud, or Keep Both. Keep Both creates a new save
identity and preserves both branches.

Stage and verify remote or imported packages before use. Enforce package size,
extracted size, path, schema, signature, and checksum policies. Protect against
path traversal, symbolic-link escape, decompression bombs, unsafe
deserialization, integer overflow, malformed manifests, and executable content.

Calculate compatibility in a trusted service. For older supported schemas,
show a migration review, create and verify an immutable safety backup, migrate
through a contiguous versioned path into new transactional output, validate
each required boundary, and promote only after final validation. Never mutate
the only original copy. Newer unsupported saves and missing required rule
content must remain blocked.

Detect interrupted writes through transaction manifests. Recovery must preserve
the previous valid save and create a new recoverable revision only after full
validation. Never delete corrupt saves automatically. Keep earlier valid
autosaves visible when the newest revision is unusable.

Loading requires an expected manifest revision, optional checksum, controller
context, selected manager, and idempotency request ID. Acquire a save read lease,
refresh the manifest, download or migrate if authorized, validate integrity,
deserialize through constrained versioned schemas, validate canonical world
state, rebuild derived indexes, revalidate manager ownership, initialize runtime
services, create a recovery marker, and activate one career session. Duplicate
commands must not create duplicate sessions or repeat migrations.

Support cooperative cancellation before runtime activation and defer it during
atomic promotion. On cancellation, release leases, stop workers, clean staging
artifacts, preserve valid backups, and return to the library. Navigate employed,
unemployed, managerless, hot-seat, and network careers to policy-defined safe
destinations. Never restore unsafe transient screens directly.

Support full keyboard interaction, accessible save-list semantics, visible
focus, details headings, synchronization and integrity announcements, reduced
motion, high text scaling, localization, and right-to-left layouts. Treat all
save packages, manifests, names, paths, provider responses, IDs, and ownership
data as untrusted. Do not copy proprietary artwork, exact wording, source code,
logos, or databases.
```

---

## 77. Next planned item

**Screen 14: Save Game and Save As** should define manual save naming, overwrite and new-version behavior, autosave interaction, transactional writing, storage targets, cloud synchronization, progress and cancellation, low-storage handling, save validation, rolling backups, conflict prevention, recovery manifests, and return to the career.

---

## Suggested Git commit

```text
feat(docs): specify load saved game screen
```
