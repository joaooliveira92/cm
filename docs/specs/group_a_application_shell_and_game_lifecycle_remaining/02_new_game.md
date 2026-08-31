# Screen 2: New Game, Database Initialization

## 1. Purpose

The Database Initialization screen prepares the application to configure and create a new career. It appears after the user selects `Start New Career` and before the detailed league-selection interface becomes usable.

Its responsibilities are to:

- Discover installed football databases.
- Validate the selected database.
- Load database metadata.
- Discover optional data packs or modifications.
- Check version compatibility.
- Estimate memory and storage requirements.
- Prepare nation, league, club, player, and staff indexes.
- Transition to league and nation selection.
- Present recoverable errors without crashing the application.

This is not yet the full career-generation process. The application should avoid creating the simulated world until the user has selected leagues, detail levels, database size, and related setup options.

## 2. Position in the user journey

```text
Main Menu
    |
    | Start New Career
    v
Database Initialization
    |
    | Initialization successful
    v
League and Nation Selection
    |
    v
Competition Detail Selection
    |
    v
Database Size and Performance Options
    |
    v
Manager Creation
    |
    v
World Generation
    |
    v
Career Inbox
```

The user should be able to return to the Main Menu until final world generation begins.

## 3. Conceptual screen layout

```text
+----------------------------------------------------------------+
| NEW CAREER                                                     |
|----------------------------------------------------------------|
|                                                                |
|  Preparing football database                                   |
|                                                                |
|  Database:         Fictional World 2003/04                     |
|  Database version: 1.0.0                                       |
|                                                                |
|  [==============================----------------]  64%         |
|                                                                |
|  Building club and competition indexes...                      |
|                                                                |
|  Completed                                                     |
|    [x] Reading database manifest                               |
|    [x] Validating database files                               |
|    [x] Loading nations and regions                             |
|    [x] Loading competition definitions                         |
|    [ ] Building club indexes                                   |
|    [ ] Checking optional data packs                            |
|    [ ] Estimating system requirements                          |
|                                                                |
|  Details                                                       |
|  > 42 nations discovered                                       |
|  > 97 playable competition definitions                         |
|                                                                |
|                                      [Cancel]                  |
+----------------------------------------------------------------+
```

The diagram describes information hierarchy rather than exact visual placement.

## 4. Visual hierarchy

### 4.1 Application header

The header should contain:

- Section title, such as `New Career`.
- Current setup stage.
- Optional step indicator.
- A route back to the Main Menu when cancellation is safe.

```text
New Career
Step 1 of 6: Preparing Database
```

The screen should not show the normal in-career navigation bar. No football world has been created yet, so destinations such as Squad, Transfers, Finances, and News do not exist.

### 4.2 Primary status region

The central area communicates:

- What operation is running.
- Which database is being processed.
- Overall progress.
- Current task.
- Whether the application remains responsive.

Typical current-task messages include:

- Reading database manifest.
- Validating database structure.
- Loading geographic definitions.
- Loading competition definitions.
- Building club indexes.
- Building person indexes.
- Loading localization resources.
- Checking optional data packs.
- Estimating memory requirements.
- Finalizing setup data.

These messages should be newly written for the clone.

### 4.3 Progress indicator

The screen should display both:

1. A visual progress bar.
2. A textual description of the current operation.

A percentage can be displayed only if the application has a meaningful estimate. Otherwise, use an indeterminate animation.

```text
Preparing setup data: 64%
```

```text
Checking database dependencies...
[ animated activity indicator ]
```

The display must not reach 100 percent until the operation has actually completed.

### 4.4 Task checklist

Task states:

- `pending`
- `running`
- `completed`
- `completed_with_warning`
- `failed`
- `cancelled`
- `skipped`

```text
[ ] Pending
[>] Running
[x] Completed
[!] Completed with warning
[X] Failed
[-] Skipped
```

Color may reinforce these states but must not be the only indicator.

### 4.5 Details panel

A collapsible details panel may display:

- Resource currently being processed.
- Number of nations discovered.
- Number of competition definitions discovered.
- Number of clubs indexed.
- Number of people indexed.
- Mod or data-pack information.
- Nonfatal validation warnings.
- Elapsed time.
- Diagnostic identifier if something fails.

The default view should remain concise.

## 5. Database selection behavior

### Approach A: Selection before initialization

The Main Menu's `Start New Career` action opens a small database-selection dialog first.

```text
Select Database

(o) Fictional World 2003/04
( ) Fictional World 2004/05
( ) Community Database

[Manage Databases] [Cancel] [Continue]
```

After selection, the initialization screen validates and loads that database.

### Approach B: Selection during initialization

The initialization screen first discovers installed databases and then pauses for selection. This is useful when the user can install:

- Multiple historical seasons.
- Community databases.
- Licensed regional databases.
- Development or testing datasets.

A single default database can be selected automatically for a simpler historical workflow. An explicit selector is more maintainable for a modern clone.

## 6. Database metadata

```typescript
interface FootballDatabaseManifest {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly semanticVersion: string;
  readonly schemaVersion: number;
  readonly seasonStartYear: number;
  readonly dataCutoffDate: string;
  readonly minimumGameVersion: string;
  readonly maximumGameVersion?: string;
  readonly defaultLanguage: string;
  readonly supportedLanguages: readonly string[];
  readonly contentPacks: readonly ContentPackReference[];
  readonly checksums: Readonly<Record<string, string>>;
  readonly estimatedInstalledBytes: number;
}
```

The application should treat the manifest as untrusted input and validate every field. The data cutoff date must remain distinct from the season start date.

## 7. Initialization stages

### 7.1 Discover database installations

Search only approved locations:

- Bundled application database.
- User-installed database directory.
- Enabled modification directory.
- Development fixture directory in nonproduction builds.

Do not recursively scan arbitrary user folders.

```typescript
interface DatabaseDiscoveryResult {
  readonly databases: readonly DiscoveredDatabase[];
  readonly warnings: readonly InitializationWarning[];
}
```

Possible results include:

- One valid database found.
- Multiple valid databases found.
- No database found.
- Unreadable manifest.
- Duplicate database identifiers.
- Incompatible database version.

### 7.2 Validate the manifest

Validation includes:

- Required fields are present.
- Identifiers use valid formats.
- Schema version is supported.
- Declared content files exist.
- Paths remain inside the database package.
- File sizes are within supported limits.
- Checksums have valid formats.
- Database dependencies exist.
- Required localization resources exist.

A manifest must not reference paths such as:

```text
../../user-documents/private-file
```

All resolved paths must remain within approved content roots.

### 7.3 Validate integrity

Integrity checks can cover:

- Nation data.
- Competition rules.
- Club records.
- Player records.
- Staff records.
- Language resources.
- Historical results.
- Geographic data.

Distinguish between:

- Missing optional file.
- Missing required file.
- Modified file.
- Corrupt file.
- File created for a newer schema.

### 7.4 Read lightweight metadata

Load only setup-relevant information:

- Nations.
- Regions.
- Available playable leagues.
- View-only competitions.
- League dependencies.
- Required parent competitions.
- Season start dates.
- Registration calendars.
- Estimated entity counts.
- Approximate performance cost.

Avoid loading every detailed player attribute when it is not required for league selection.

### 7.5 Build setup indexes

Indexes should answer:

- Which leagues are available in a nation?
- Which divisions depend on one another?
- Which nations require a particular start date?
- How many clubs become active if a league is selected?
- Approximately how many players will be loaded?
- Which competitions are mandatory dependencies?
- Which leagues can be simulated in full detail?
- Which content packs are applicable?

```typescript
interface SetupDatabaseIndex {
  readonly nationsById: ReadonlyMap<string, NationSetupRecord>;
  readonly competitionsById: ReadonlyMap<string, CompetitionSetupRecord>;
  readonly leaguesByNationId: ReadonlyMap<string, readonly string[]>;
  readonly dependenciesByCompetitionId: ReadonlyMap<string, readonly string[]>;
  readonly estimatedEntitiesByLeagueId: ReadonlyMap<string, EntityEstimate>;
}
```

### 7.6 Discover modifications

Optional modifications can include:

- Data corrections.
- Fictional name packs.
- Competition-rule extensions.
- Localization packs.
- User-created databases.

Load order must be deterministic:

```text
1. Base database
2. Official correction pack
3. Enabled community data pack
4. Local user override
```

Conflicts affecting game rules should never be resolved silently.

### 7.7 Estimate system requirements

Prepare estimates for:

- Expected number of active players.
- Expected number of clubs.
- Approximate memory use.
- Approximate initial generation time.
- Approximate save-file size.
- Simulation complexity.
- Recommended maximum detail for the current machine.

These values are estimates rather than guarantees.

### 7.8 Finalize setup context

```typescript
interface NewCareerSetupContext {
  readonly database: ValidatedDatabaseDescriptor;
  readonly index: SetupDatabaseIndex;
  readonly availableContentPacks: readonly ContentPackDescriptor[];
  readonly systemProfile: SystemCapabilityProfile;
  readonly warnings: readonly InitializationWarning[];
}
```

The next screen reads from this context but does not mutate the source database.

## 8. Progress model

Progress should be based on weighted tasks rather than raw task count.

```typescript
interface InitializationTask {
  readonly id: string;
  readonly label: string;
  readonly weight: number;
  readonly cancellable: boolean;
  readonly status: InitializationTaskStatus;
  readonly completedUnits?: number;
  readonly totalUnits?: number;
}
```

Example weights:

```text
Database discovery               5%
Manifest validation             10%
Integrity validation            20%
Geographic metadata loading     10%
Competition loading             15%
Club index construction         15%
Person index construction       15%
Modification discovery           5%
System estimation                5%
```

If a stage is skipped, its weight should be redistributed or considered complete. The UI must not stall at an arbitrary percentage.

## 9. User interaction

### 9.1 Cancel

Selecting Cancel requests cooperative cancellation:

1. Disable repeated Cancel activation.
2. Change the message to `Cancelling...`.
3. Signal cancellation to active tasks.
4. Let each task stop at a safe boundary.
5. Release temporary resources.
6. Return to the Main Menu.

Do not terminate worker threads abruptly or leave partial cache files appearing valid.

### 9.2 Show or hide details

Keyboard behavior:

- `Tab`: move between controls.
- `Enter` or `Space`: activate the focused control.
- `Escape`: request cancellation.
- `Page Up` and `Page Down`: scroll details.
- `Home` and `End`: jump within the details log.

### 9.3 Retry

Show Retry only after a recoverable failure.

```text
[Return to Main Menu] [Choose Another Database] [Retry]
```

Retry should rerun the failed stage and its dependants, not necessarily every completed operation.

## 10. Successful completion

### Immediate transition

Move directly to league selection when initialization is brief.

### Explicit Continue

```text
Database ready

42 nations and 97 playable competition definitions are available.

[View Warnings] [Continue]
```

This is preferable when warnings exist. Do not add an artificial delay.

## 11. Warning system

### Nonblocking warnings

- Optional localization is missing.
- A nonessential historical record could not be loaded.
- A community data pack overrides another pack.
- Some media assets are unavailable.
- Performance estimates are uncertain.

### Blocking errors

- No valid database exists.
- Schema version is unsupported.
- Required competition rules are missing.
- Identifier references cannot be resolved.
- Integrity verification fails.
- Circular competition dependencies prevent setup.
- A required content pack is unavailable.

```typescript
interface InitializationWarning {
  readonly code: string;
  readonly severity: "information" | "warning" | "error";
  readonly userMessage: string;
  readonly technicalMessage?: string;
  readonly affectedResourceId?: string;
  readonly recoverable: boolean;
  readonly suggestedAction?: SuggestedRecoveryAction;
}
```

Ordinary user messages must not expose tokens, credentials, private paths, usernames, or stack traces.

## 12. Error-state designs

### 12.1 No database found

```text
No football database is available

A database is required to create a career.

[Open Database Folder] [Return to Main Menu]
```

### 12.2 Unsupported database version

```text
This database cannot be used with this version of the game.

Database schema: 12
Supported schemas: 9 to 11

[Choose Another Database] [Return to Main Menu]
```

### 12.3 Corrupt database

```text
The selected database could not be verified.

One or more required files may be missing or damaged.

[View Details] [Repair] [Choose Another Database]
```

Only show Repair if a real, safe repair mechanism exists.

### 12.4 Modification conflict

```text
Two enabled data packs change the same competition rules.

Data Pack A
Data Pack B

Disable one of the conflicting packs before continuing.

[Manage Data Packs] [Return to Main Menu]
```

### 12.5 Insufficient memory

```text
The database cannot be prepared with the current configuration.

Close other applications or choose a smaller database package.

[Choose Smaller Database] [Retry] [Return to Main Menu]
```

### 12.6 Unexpected internal failure

```text
Database preparation stopped unexpectedly.

Diagnostic reference: INIT-20260830-7F2C

[Copy Diagnostic Summary] [Retry] [Return to Main Menu]
```

## 13. Concurrency and responsiveness

```text
UI Thread
  |
  +-- Displays task state
  +-- Handles cancellation
  +-- Handles details expansion
  +-- Receives progress events

Initialization Coordinator
  |
  +-- Discovery worker
  +-- Validation worker
  +-- Metadata parser
  +-- Index builder
  +-- Modification resolver
```

```typescript
type InitializationEvent =
  | {
      readonly type: "task-started";
      readonly taskId: string;
    }
  | {
      readonly type: "task-progress";
      readonly taskId: string;
      readonly completedUnits: number;
      readonly totalUnits?: number;
    }
  | {
      readonly type: "task-completed";
      readonly taskId: string;
    }
  | {
      readonly type: "warning";
      readonly warning: InitializationWarning;
    }
  | {
      readonly type: "failed";
      readonly error: InitializationFailure;
    }
  | {
      readonly type: "completed";
      readonly context: NewCareerSetupContext;
    };
```

Rate-limit rendering of progress events so excessive updates do not slow initialization.

## 14. Cancellation model

Use cooperative cancellation:

```typescript
interface InitializationRequest {
  readonly databaseId: string;
  readonly enabledContentPackIds: readonly string[];
  readonly signal: AbortSignal;
}
```

Safe cancellation boundaries include:

- Between files.
- Between parsed-record batches.
- Before writing caches.
- Before replacing an existing cache.
- Between index-building phases.

Temporary output must be written under a temporary name, validated, promoted atomically where supported, and removed after cancellation.

## 15. Cache behavior

Potential caches:

- Parsed manifest cache.
- Competition dependency graph.
- Nation-to-league index.
- Club identifier index.
- Person-search index.
- Localization lookup index.

A cache key should include:

```text
Game version
Database identifier
Database version
Schema version
Enabled data packs
Data-pack versions
Relevant file checksums
Locale, when localization changes indexed text
```

```typescript
interface InitializationCacheKey {
  readonly gameVersion: string;
  readonly databaseId: string;
  readonly databaseVersion: string;
  readonly schemaVersion: number;
  readonly contentPackFingerprints: readonly string[];
  readonly sourceFingerprint: string;
}
```

Caches are disposable. Deleting them may affect performance but not correctness.

## 16. Security requirements

User-created databases and modifications are untrusted.

Protect against:

- Directory traversal.
- Decompression bombs.
- Excessively large records.
- Invalid Unicode.
- Duplicate identifiers.
- Cyclic references.
- Log injection.
- Arbitrary executable content.
- Symbolic links escaping approved roots.
- Malformed archive entries.
- Resource exhaustion.

Rules:

1. Do not execute code from database packages.
2. Do not support scripts unless they run inside a deliberately restricted engine.
3. Limit archive and extracted sizes.
4. Limit record counts by entity type.
5. Limit string lengths.
6. Normalize identifiers before comparison.
7. Reject absolute paths in manifests.
8. Verify that extracted paths remain below the destination root.
9. Parse data using schema validation.
10. Isolate fatal parsing errors from the UI process.

## 17. Accessibility requirements

- Announce current-task changes through a polite live region.
- Do not announce every percentage change.
- Announce warnings and failures immediately.
- Provide text alongside icons.
- Keep Cancel keyboard accessible.
- Do not trap focus inside the details list.
- Respect reduced-motion preferences.
- Provide sufficient contrast.
- Give the progress bar an accessible name and current value.
- Represent indeterminate progress correctly.
- Restore focus predictably after dialogs.

Appropriate announcements:

```text
Preparing database.
Competition definitions loaded.
Building club index.
Database preparation complete.
```

Avoid noisy announcements such as every percentage increment.

## 18. Localization requirements

All visible text must come from localization resources. Support:

- Longer translated task names.
- Right-to-left interfaces.
- Localized numbers and dates.
- Plural forms.
- Non-Latin database names.
- Different word ordering.

```text
Task ID: build_club_index
English: Building club index
Portuguese: Criando índice de clubes
Spanish: Creando índice de clubes
```

Stable identifiers and localized display names must be stored separately.

## 19. Audio behavior

Optional sounds may include:

- Subtle transition sound.
- Completion sound.
- Warning sound.
- Error sound.

Rules:

- Respect global volume and mute settings.
- Cancellation must not play a success sound.
- Background music must not restart between setup screens.
- Completion audio plays once.
- No essential information depends on sound.

## 20. Analytics and observability

Useful measurements:

- Initialization duration.
- Duration by stage.
- Cache hit or miss.
- Database schema version.
- Number of enabled data packs.
- Warning count.
- Failure category.
- Cancellation stage.
- Peak-memory estimate.
- UI responsiveness metrics.

Avoid collecting full local paths, usernames, database contents, custom names, or raw diagnostic logs without consent.

```json
{
  "event": "database_initialization_completed",
  "databaseId": "fictional-world-2003",
  "schemaVersion": 11,
  "durationMs": 4832,
  "cacheResult": "partial-hit",
  "warningCount": 1,
  "nationCount": 42,
  "playableCompetitionCount": 97
}
```

## 21. State machine

```text
IDLE
  |
  | begin initialization
  v
DISCOVERING
  |
  v
VALIDATING_MANIFEST
  |
  v
VALIDATING_CONTENT
  |
  v
LOADING_METADATA
  |
  v
BUILDING_INDEXES
  |
  v
RESOLVING_MODIFICATIONS
  |
  v
ESTIMATING_REQUIREMENTS
  |
  v
READY
  |
  | continue
  v
LEAGUE_SELECTION
```

Alternative transitions:

```text
Any running state
  -> CANCELLING
  -> CANCELLED
  -> MAIN_MENU
```

```text
Any running state
  -> FAILED_RECOVERABLE
  -> RETRY
```

```text
Any running state
  -> FAILED_BLOCKING
  -> DATABASE_SELECTION or MAIN_MENU
```

Reject invalid transitions such as `FAILED_BLOCKING -> LEAGUE_SELECTION`.

## 22. Domain boundaries

The screen may depend on:

- Database discovery service.
- Database validator.
- Metadata reader.
- Index builder.
- Content-pack resolver.
- System-capability estimator.
- Logging abstraction.

It must not depend directly on:

- Match simulation.
- Transfer AI.
- Club finances.
- Tactical engine.
- Player development.
- Inbox generation.
- Career-save serialization.

The screen consumes progress events and emits user intentions. It must not parse database files itself.

## 23. Suggested internal commands

```text
BEGIN_DATABASE_INITIALIZATION
CANCEL_DATABASE_INITIALIZATION
EXPAND_INITIALIZATION_DETAILS
COLLAPSE_INITIALIZATION_DETAILS
RETRY_FAILED_INITIALIZATION
SELECT_ALTERNATIVE_DATABASE
MANAGE_CONTENT_PACKS
CONTINUE_TO_LEAGUE_SELECTION
RETURN_TO_MAIN_MENU
COPY_DIAGNOSTIC_SUMMARY
```

Rapid double-clicking must not start duplicate jobs.

## 24. Persistence rules

The application may remember:

- Last selected database.
- Last enabled content packs.
- Details-panel expanded state.
- Whether advanced warnings were shown.
- Last successful initialization cache.

It should not persist:

- An incomplete setup context.
- Partially validated database state.
- A misleading ready flag.
- Temporary file paths.
- An obsolete error as if it were current.

If the application closes during initialization, reopening should return to the Main Menu.

## 25. Performance targets

- First visible response within roughly 100 milliseconds of selecting Start New Career.
- Activity indicator if work exceeds roughly 250 milliseconds.
- Immediate visual acknowledgment of cancellation.
- Responsive UI input during parsing.
- Smooth details scrolling.
- Incremental or worker-based heavy indexing.
- Cached initialization significantly faster than initial processing.

User-visible performance values must be labeled as estimates.

## 26. Edge cases

### Database removed during initialization

- Stop reading.
- Mark initialization as failed.
- Clear partial resources.
- Offer database reselection.

### Database modified during validation

- Detect inconsistent timestamps or checksums.
- Restart validation or reject the operation.
- Never combine records from different revisions.

### Content pack disabled externally

- Refresh the list.
- Recalculate dependencies.
- Explain the setup change.

### Duplicate database identifiers

- Treat as a conflict.
- Show sanitized source locations.
- Do not choose arbitrarily.

### Disk becomes full

- Stop cache writing.
- Delete incomplete artifacts.
- Continue without cache only if safe.
- Otherwise present a recoverable failure.

### Device enters sleep mode

- Resume safely.
- Recalculate elapsed-time estimates.
- Do not automatically treat suspension as a timeout.

### Display mode changes

- Preserve progress state.
- Preserve focus.
- Avoid restarting initialization.

### Application window closes

- Request cooperative cancellation.
- Wait for bounded cleanup.
- Never corrupt reusable indexes or preferences.

## 27. Acceptance criteria

1. `Start New Career` begins initialization exactly once.
2. The UI remains responsive throughout processing.
3. Current task and overall progress are communicated clearly.
4. Cancellation returns safely to the Main Menu.
5. No partial cache is treated as valid.
6. Unsupported databases are rejected with actionable messages.
7. Optional warnings do not incorrectly block setup.
8. Blocking failures cannot transition to league selection.
9. User content cannot access files outside approved roots.
10. Initialization produces an immutable setup context.
11. Successful completion opens league selection.
12. Keyboard and assistive-technology users can operate every control.
13. Restarting after interruption begins from a safe state.
14. Logs permit diagnosis without exposing private data.
15. All database and content-pack combinations produce deterministic results.

## 28. Recommended tests

### Unit tests

- Manifest schema validation.
- Version compatibility.
- Safe path resolution.
- Duplicate identifier detection.
- Dependency-graph construction.
- Circular-dependency rejection.
- Progress-weight calculation.
- Warning-severity mapping.
- State-machine transitions.
- Cache-key generation.
- Data-pack load ordering.

### Integration tests

- Initialize bundled database.
- Initialize community database.
- Initialize with optional content packs.
- Cancel during validation.
- Cancel during index creation.
- Retry after a recoverable read failure.
- Reject an incompatible schema.
- Reject a corrupt required file.
- Continue with a missing optional file.
- Reuse valid cache.
- Rebuild stale cache.
- Handle disk-full conditions.
- Handle removal during operation.

### Security tests

- Manifest path traversal.
- Archive path traversal.
- Absolute file paths.
- Symbolic-link escape.
- Oversized compressed payload.
- Extremely long strings.
- Invalid Unicode sequences.
- Excessive record counts.
- Cyclic entity references.
- Log-control-character injection.
- Executable file embedded in a data pack.

### Accessibility tests

- Keyboard-only completion.
- Visible focus.
- Screen-reader progress announcements.
- Reduced-motion mode.
- High-contrast mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long translated task labels.

### Visual regression tests

Capture:

- Initial state.
- Determinate progress.
- Indeterminate progress.
- Expanded details.
- Warning state.
- Recoverable failure.
- Blocking failure.
- Cancellation in progress.
- Successful completion.
- Minimum supported viewport.
- Ultrawide viewport.

## 29. Condensed LLM implementation brief

```text
Implement a desktop new-career database initialization screen for a
football-management simulation.

The screen appears after Start New Career and before league selection.
It discovers installed databases, validates the selected manifest and
content, loads lightweight setup metadata, builds setup indexes, resolves
optional content packs, estimates resource requirements, and creates an
immutable NewCareerSetupContext.

Show a section heading, current task, weighted progress, database name,
database version, collapsible details log, task checklist, and Cancel
control. Keep the UI responsive. Use cooperative cancellation through
AbortSignal. Prevent duplicate initialization jobs.

Represent tasks as pending, running, completed, warning, failed, skipped,
or cancelled. Do not show a percentage unless progress is measurable.
Do not allow any failed or cancelled operation to transition to league
selection.

Treat every database and content pack as untrusted. Validate schemas,
checksums, paths, file sizes, identifier uniqueness, dependency graphs,
record counts, and archive extraction. Reject path traversal, symbolic-link
escape, decompression bombs, executable payloads, unsupported schemas,
and unresolved required references.

Caches must be disposable, checksum-keyed, written under temporary names,
validated, and promoted atomically. Incomplete caches must be deleted.

On success, transition to League and Nation Selection. On recoverable
failure, provide Retry and Choose Another Database. On blocking failure,
provide a clear explanation and Return to Main Menu.

Support keyboard operation, visible focus, reduced motion, screen-reader
progress announcements, localization, long labels, and right-to-left
layouts. Do not reproduce proprietary game art, text, logos, or database
content.
```

---

# Next Planned Item

**Screen 3: New Game, League and Nation Selection** will define the country list, playable versus background competitions, division-depth selection, dependency behavior, estimated game speed, entity counts, validation rules, and transition into advanced competition-detail configuration.
