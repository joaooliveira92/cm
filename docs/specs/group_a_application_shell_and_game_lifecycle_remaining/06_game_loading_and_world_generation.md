# Screen 6: New Game, Game Loading and World Generation

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, databases, source code, logos, exact interface wording, or other protected assets. Use an original visual identity and fictional or properly licensed football data.

---

## 1. Purpose

The **Game Loading and World Generation** screen converts the validated new-career configuration into a playable, persistent football world.

It appears after Database Size and Performance Options and before Add Manager.

Its responsibilities are to:

- Lock and verify all setup snapshots.
- Establish the deterministic career identity and random seed.
- Allocate the world database safely.
- Instantiate selected nations, competitions, clubs, players, staff, and other required entities.
- Apply optional population-loading rules.
- Generate fictional people required by the selected policies.
- Construct squad registrations, contracts, injuries, bans, histories, and relationships.
- Generate competition calendars and fixtures.
- Initialize finances, transfer markets, manager vacancies, scouting knowledge, and news context.
- Build runtime and search indexes.
- Validate the completed world.
- Create the first recoverable career save or checkpoint.
- Recover cleanly from cancellation or failure.
- Transition to Add Manager only after the world passes validation.

This screen is a committed creation stage. Unlike the earlier configuration screens, some phases may not support immediate cancellation because transactional files or final indexes are being promoted.

---

## 2. Position in the new-career flow

```text
Main Menu
    |
    v
Database Initialization
    |
    v
League and Nation Selection
    |
    v
Competition Detail Selection
    |
    v
Database Size and Performance Options
    |
    | Valid setup snapshots submitted
    v
Game Loading and World Generation
    |
    | World successfully created and validated
    v
Add Manager
    |
    v
Manager Personal Details
    |
    v
Club Selection
    |
    v
Career Inbox
```

If manager creation is embedded before generation in a specific product variant, the generated world must still remain independent from manager identity until the manager transaction is committed.

---

## 3. Entry contract

World generation requires immutable inputs:

```typescript
interface WorldGenerationRequest {
  readonly databaseFingerprint: string;
  readonly leagueSelectionSnapshotId: string;
  readonly competitionDetailSnapshotId: string;
  readonly databaseScopeSnapshotId: string;
  readonly engineVersion: string;
  readonly worldSchemaVersion: number;
  readonly generationPolicyVersion: string;
  readonly careerSeed: string;
  readonly saveTarget: SaveTargetDescriptor;
  readonly signal: AbortSignal;
}
```

Before starting, the application must verify:

- Every snapshot exists.
- Every snapshot is complete and immutable.
- All snapshots use the same database fingerprint.
- The engine supports the requested world schema.
- Referenced content packs are still available and unchanged.
- Required storage is available.
- No active generation job already owns the target.
- The save target is writable.
- The request is not a replay of a completed transaction unless explicitly restoring.

---

## 4. Conceptual layout

```text
+--------------------------------------------------------------------------------+
| CREATING NEW CAREER                                                            |
|--------------------------------------------------------------------------------|
| Database: Fictional World 2003/04                                              |
| Career identifier: CW-7K4M-2P9Q                                                |
|                                                                                |
| [==============================----------------------] 58%                     |
|                                                                                |
| Creating competition schedules...                                              |
|                                                                                |
| [x] Verifying setup                                                            |
| [x] Preparing world storage                                                    |
| [x] Creating nations, clubs, and venues                                        |
| [x] Loading players and staff                                                  |
| [x] Generating required people                                                 |
| [>] Building competition schedules                                             |
| [ ] Initializing finances and transfer markets                                 |
| [ ] Building indexes                                                           |
| [ ] Validating world                                                           |
| [ ] Creating initial checkpoint                                                |
|                                                                                |
| Elapsed: 02:14                  Estimated remaining: 01:30 to 02:40            |
|                                                                                |
| [Show Details]                                            [Cancel Generation]  |
+--------------------------------------------------------------------------------+
```

The diagram defines hierarchy and behavior rather than exact pixel placement.

---

## 5. Visual hierarchy

### 5.1 Header

Display:

- `Creating New Career`.
- Database name and version.
- Optional career identifier.
- Optional selected preset summary.
- No normal in-career navigation.

### 5.2 Overall progress

Display determinate progress only when the coordinator can calculate it meaningfully.

The screen should show:

- Weighted overall completion.
- Current stage.
- Stage-specific progress where useful.
- Elapsed time.
- Estimated remaining range when confidence is adequate.

Never allow progress to move backward merely because an estimate was refined. If the workload expands, hold the current visible progress until the underlying weighted completion catches up.

### 5.3 Stage list

Each stage supports:

```typescript
type GenerationStageStatus =
  | "pending"
  | "running"
  | "completed"
  | "completed_with_warning"
  | "failed"
  | "cancelling"
  | "cancelled"
  | "skipped";
```

Recommended symbols:

```text
[ ] Pending
[>] Running
[x] Completed
[!] Completed with warning
[X] Failed
[-] Skipped
```

### 5.4 Details panel

The optional panel may show:

- Current subtask.
- Entity counts processed.
- Active worker count.
- Safe diagnostic messages.
- Cache usage.
- Warning summaries.
- Stage durations.
- Checkpoint status.

Do not expose private paths, raw stack traces, credentials, or internal secrets.

### 5.5 Cancellation control

The cancellation label and availability must reflect the current safety boundary:

```text
[Cancel Generation]
[Cancelling...]
[Finishing Safe Write...]
```

When cancellation is temporarily deferred, the button remains disabled and the interface explains why.

---

## 6. Generation stages

Recommended top-level stages are described below. Implementations may subdivide them, but ordering constraints must remain explicit.

### 6.1 Verify setup

Checks:

- Snapshot integrity.
- Database fingerprint.
- Content-pack fingerprints.
- Engine compatibility.
- Stable identifier resolution.
- Competition dependency closure.
- Detail-level constraints.
- Population and resource limits.
- Save target and storage capacity.

Failure here should return to the relevant setup screen without creating world files.

### 6.2 Prepare world storage

Actions:

- Acquire an exclusive generation lock.
- Create a transaction directory.
- Create temporary databases or data files.
- Record the generation manifest.
- Verify atomic-promotion capability.
- Reserve or validate required storage.

No temporary artifact may be presented as a valid career save.

### 6.3 Create static world entities

Instantiate or reference:

- Continents and regions.
- Nations and associations.
- Competitions and stages.
- Clubs and reserve teams.
- Stadiums and training facilities.
- Geographic locations.
- Governing bodies.
- Competition-rule profiles.

Entity creation order should follow validated dependency graphs.

### 6.4 Load persistent people

Resolve the DatabaseScopeSnapshot into unique players and staff.

Actions include:

- Apply guaranteed population.
- Apply loading-rule precedence.
- Deduplicate stable person IDs.
- Materialize selected person records.
- Create club assignments.
- Create contracts.
- Create international eligibility.
- Create staff roles.
- Preserve validated historical data.

### 6.5 Generate required people

Generate fictional people only according to the selected policy.

Possible generation categories:

- Missing first-team players.
- Missing youth players.
- Missing goalkeepers.
- Missing staff roles.
- Missing officials.
- Free agents needed for market health.
- National-team candidates where required.

Every generated entity must have:

- Stable career-local ID.
- Generation reason.
- Policy version.
- Deterministic source seed.
- Valid nationality and eligibility.
- Valid age and date values.
- Valid attributes.
- Valid name-pool reference.

### 6.6 Normalize squads and contracts

Checks and actions:

- Minimum and maximum squad constraints.
- Duplicate shirt or registration numbers where applicable.
- Contract dates.
- Wage and currency normalization.
- Loan relationships.
- Transfer agreements.
- Squad registration eligibility.
- Youth and reserve assignments.
- Captaincy and basic hierarchy defaults.

Do not silently change source data unless a documented normalization rule authorizes it. Record every correction.

### 6.7 Initialize injuries and discipline

Create or import:

- Active injuries.
- Rehabilitation estimates.
- Domestic bans.
- Continental bans.
- International bans.
- Accumulated cards where the season begins in progress.

Rules must distinguish competition-specific sanctions.

### 6.8 Initialize club state

Create:

- Financial balances.
- Transfer and wage budgets.
- Board objectives.
- Club reputation.
- Facilities state.
- Staff vacancies.
- Squad-needs summaries.
- Existing transfer listings.
- Existing loan listings.
- Contract-expiry schedules.

All monetary values require explicit currency and unit handling.

### 6.9 Build competition calendars

Create:

- Season boundaries.
- Registration windows.
- Transfer windows.
- Draw dates.
- Fixture dates.
- International breaks.
- Cup rounds.
- Playoffs and league splits.
- Promotion and relegation links.
- Rescheduling rules.

The calendar solver must detect impossible combinations rather than silently overlapping mandatory fixtures.

### 6.10 Generate fixtures

Fixture generation must honor:

- Competition structure.
- Home and away balance.
- Venue availability.
- Ground sharing.
- Geographic constraints where modeled.
- Rest requirements.
- Television or event constraints if modeled.
- International windows.
- Replay or second-leg rules.
- Seasonal weather policies where relevant.

The result should be deterministic for the same input and career seed.

### 6.11 Initialize historical and statistical state

Create:

- Competition holders.
- Past winners.
- Club honours.
- Player career histories.
- Staff histories.
- Existing season statistics if starting midseason.
- Records and milestones.
- Coefficient or ranking state.

Historical records should remain separate from generated future events.

### 6.12 Initialize transfer market

Create:

- Transfer-window state.
- Active offers if the start scenario includes them.
- Future transfers.
- Loan agreements.
- Market valuations.
- Agent or negotiation context where modeled.
- AI club recruitment plans.

The system must not execute uncontrolled AI transfer activity before the official career start boundary unless explicitly defined.

### 6.13 Initialize scouting and knowledge

Create:

- Manager-independent global knowledge.
- Club knowledge profiles.
- Regional scouting coverage.
- Staff-specific knowledge.
- Competition visibility.
- Search-result visibility rules.

Manager-specific knowledge should be added later when a manager is created.

### 6.14 Initialize news and event schedules

Create:

- Opening world events.
- Competition draw events.
- Registration reminders.
- Contract and transfer deadlines.
- Scheduled board reviews.
- News-generation subscriptions.

Do not generate the user's inbox until a manager exists, unless messages are stored as world events awaiting manager-specific rendering.

### 6.15 Build runtime indexes

Indexes may include:

- Person search.
- Club search.
- Competition navigation.
- Contract expiry.
- Transfer availability.
- Fixture lookup.
- Geographic lookup.
- Name normalization.
- Relationship lookup.

Indexes must be disposable or rebuildable unless they contain canonical state.

### 6.16 Validate completed world

Validation should cover:

- Referential integrity.
- Unique identifiers.
- Required competition participants.
- Valid squad population.
- Valid registrations.
- Valid calendars.
- Valid fixture counts.
- Valid promotion and relegation paths.
- Valid contracts and money units.
- Valid person ages and dates.
- No unresolved required references.
- No unsupported detail-level state.
- No incomplete transaction files.

### 6.17 Create initial checkpoint

The initial checkpoint should contain:

- Canonical world state.
- Complete setup snapshot references.
- Database and content fingerprints.
- Engine and schema versions.
- Career seed.
- Generation-policy version.
- Validation report.
- No manager, unless manager creation occurred earlier.

Only after this checkpoint is durable may the application report success.

---

## 7. Stage dependency model

```typescript
interface WorldGenerationStageDefinition {
  readonly id: string;
  readonly displayNameKey: string;
  readonly dependencyStageIds: readonly string[];
  readonly weightConfigKey: string;
  readonly cancellable: boolean;
  readonly retryPolicyId: string;
  readonly checkpointPolicyId: string;
}
```

Stage weights must come from named configuration. Do not embed unexplained numeric premises in progress formulas.

Example logical dependencies:

```text
Verify setup
  -> Prepare storage
      -> Create static entities
          -> Load persistent people
              -> Generate required people
                  -> Normalize squads
          -> Build competition calendars
              -> Generate fixtures
          -> Initialize club state
              -> Initialize transfer market
          -> Initialize histories
          -> Initialize scouting
          -> Initialize news schedules
              -> Build runtime indexes
                  -> Validate completed world
                      -> Create initial checkpoint
```

Independent stages may run concurrently only when they cannot observe partial mutable state from one another.

---

## 8. Determinism and career seed

### 8.1 Career seed

The career seed controls procedural choices such as:

- Generated people.
- Eligible randomized attributes.
- Fixture permutations where multiple valid schedules exist.
- Optional scenario variation.

It must not control ordinary future gameplay randomness by itself. Runtime simulation should derive isolated random streams.

### 8.2 Seed policy

```typescript
type CareerSeedPolicy =
  | { readonly type: "generated"; readonly seed: string }
  | { readonly type: "user_supplied"; readonly seed: string }
  | { readonly type: "scenario_defined"; readonly seed: string };
```

### 8.3 Random-stream isolation

Use separate deterministic streams:

```text
world.static_entities
world.generated_players
world.generated_staff
world.fixtures
world.initial_injuries
world.market_initialization
```

Adding one generated staff member should not unintentionally change every fixture.

### 8.4 Reproducibility descriptor

```typescript
interface WorldReproducibilityDescriptor {
  readonly careerSeed: string;
  readonly engineVersion: string;
  readonly worldSchemaVersion: number;
  readonly generationPolicyVersion: string;
  readonly databaseFingerprint: string;
  readonly setupSnapshotFingerprints: readonly string[];
  readonly contentPackFingerprints: readonly string[];
}
```

Identical descriptors should produce equivalent canonical initial worlds, excluding explicitly noncanonical metadata such as creation timestamp.

---

## 9. Progress calculation

Overall progress should use configured stage weights and measurable units.

```typescript
interface GenerationStageProgress {
  readonly stageId: string;
  readonly status: GenerationStageStatus;
  readonly completedUnits?: number;
  readonly totalUnits?: number;
  readonly configuredWeight: number;
  readonly currentTaskKey?: string;
}
```

Rules:

- Use indeterminate state when total units are unknown.
- Do not equate entity count with work when entity costs differ substantially.
- Cap rendered update frequency.
- Do not reach 100 percent before the initial checkpoint is durable.
- Completed stages remain visibly completed.
- A retry may reset the failed stage without resetting successful immutable stages.

---

## 10. Remaining-time estimate

Display a range rather than a precise promise:

```text
Estimated remaining: 1 minute 30 seconds to 2 minutes 40 seconds
```

The estimate may consider:

- Stage completion rates.
- Historical local timings.
- Current worker throughput.
- Storage speed.
- Entity counts.
- Cache usage.

Hide the estimate if confidence is poor.

Never show negative remaining time.

---

## 11. Concurrency model

Recommended architecture:

```text
UI Process
  |
  +-- Renders progress
  +-- Receives sanitized events
  +-- Sends cancel or retry commands
  |
Generation Coordinator
  |
  +-- Validates stage graph
  +-- Owns transaction state
  +-- Schedules workers
  +-- Aggregates progress
  +-- Enforces cancellation boundaries
  |
Worker Pool
  +-- Entity materialization
  +-- Population generation
  +-- Calendar construction
  +-- Index construction
  +-- Validation partitions
  |
Transactional World Store
```

Only the coordinator may promote the completed world transaction.

Workers must not directly update the user interface.

---

## 12. Progress events

```typescript
type WorldGenerationEvent =
  | {
      readonly type: "generation-started";
      readonly generationId: string;
    }
  | {
      readonly type: "stage-started";
      readonly stageId: string;
    }
  | {
      readonly type: "stage-progress";
      readonly stageId: string;
      readonly completedUnits: number;
      readonly totalUnits?: number;
      readonly messageKey?: string;
    }
  | {
      readonly type: "stage-warning";
      readonly stageId: string;
      readonly warning: GenerationWarning;
    }
  | {
      readonly type: "stage-completed";
      readonly stageId: string;
      readonly durationMs: number;
    }
  | {
      readonly type: "cancellation-deferred";
      readonly reasonCode: string;
    }
  | {
      readonly type: "generation-failed";
      readonly failure: GenerationFailure;
    }
  | {
      readonly type: "generation-completed";
      readonly result: WorldGenerationResult;
    };
```

Events should carry localization keys and safe parameters rather than preformatted internal messages when feasible.

---

## 13. Cancellation behavior

### 13.1 Cooperative cancellation

Cancellation uses an `AbortSignal` or equivalent cooperative mechanism.

### 13.2 Safe boundaries

Safe cancellation boundaries include:

- Between entity batches.
- Between generation passes.
- Before fixture transaction commit.
- Before index promotion.
- Before initial checkpoint promotion.

### 13.3 Temporarily noncancellable operations

Examples:

- Atomic file replacement.
- Database transaction commit or rollback.
- Checkpoint finalization.

The interface should say:

```text
Cancellation requested. Finishing a safe storage operation...
```

### 13.4 Cancellation outcome

After cancellation:

1. Roll back open transactions.
2. Delete or quarantine temporary artifacts.
3. Release locks.
4. Preserve setup snapshots.
5. Record an operational summary.
6. Return to Database Size and Performance Options or the setup review.

### 13.5 Cancel confirmation

If considerable time has elapsed:

```text
Cancel world generation?

The generated world will be discarded, but your setup choices will be kept.

[Continue Generating] [Cancel Generation]
```

The safe default is `Continue Generating`.

---

## 14. Transactional storage

### 14.1 Transaction directory

Create generation output under a unique temporary location associated with the generation ID.

### 14.2 Promotion

A world becomes valid only after:

- All canonical writes complete.
- Validation passes.
- Manifest checksums complete.
- Initial checkpoint completes.
- Promotion succeeds atomically where supported.

### 14.3 Manifest

```typescript
interface WorldGenerationManifest {
  readonly generationId: string;
  readonly state:
    "preparing" | "generating" | "validating" | "committing" | "completed" | "failed" | "cancelled";
  readonly reproducibility: WorldReproducibilityDescriptor;
  readonly completedStageIds: readonly string[];
  readonly canonicalFileChecksums: Readonly<Record<string, string>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

### 14.4 Crash recovery

At next startup:

- Detect incomplete generation manifests.
- Verify ownership and staleness.
- Offer safe cleanup or supported recovery.
- Never list incomplete output as a playable save.

---

## 15. Checkpoint strategy

Checkpoints may be used to resume expensive generation after recoverable failure.

A checkpoint must be:

- Stage-boundary aligned.
- Versioned.
- Checksummed.
- Tied to exact snapshot fingerprints.
- Free of partial mutable transactions.
- Disposable.

Resume only when:

- Engine and policy versions are compatible.
- Input fingerprints match exactly.
- Checkpoint validation passes.
- The failed stage supports retry.

Otherwise restart generation from the beginning.

---

## 16. Generated-person validation

Every generated player or staff member must satisfy domain invariants.

### Players

- Valid birth date.
- Valid age for role and competition.
- Valid nationality.
- Valid position profile.
- Attribute values inside configured ranges.
- Valid current and potential ability relationship if modeled.
- Valid contract or free-agent state.
- No duplicate career-local ID.
- Name compatible with configured name pools.

### Staff

- Valid role qualifications.
- Valid age.
- Valid nationality.
- Valid coaching, scouting, or medical profile.
- Valid employment state.

### Generation report

```typescript
interface GeneratedPopulationReport {
  readonly generatedPlayerCount: number;
  readonly generatedStaffCount: number;
  readonly countsByReasonCode: Readonly<Record<string, number>>;
  readonly countsByNationId: Readonly<Record<string, number>>;
  readonly policyVersion: string;
}
```

---

## 17. Calendar and fixture validation

Validate:

- Expected participant count.
- Expected matches per stage.
- Home and away balance.
- No impossible duplicate fixture.
- Valid round ordering.
- Valid knockout advancement paths.
- Valid promotion and relegation links.
- Venue availability.
- Required rest intervals where configured.
- Transfer and registration windows.
- International-release periods.
- Season start and end boundaries.

A competition must not begin with an invalid schedule merely to let generation complete.

---

## 18. World validation report

```typescript
interface WorldValidationReport {
  readonly status: "valid" | "valid_with_warnings" | "invalid";
  readonly validatorVersion: string;
  readonly checks: readonly WorldValidationCheckResult[];
  readonly warningCount: number;
  readonly errorCount: number;
  readonly validatedAt: string;
}
```

Validation categories:

- Identity integrity.
- Referential integrity.
- Competition integrity.
- Calendar integrity.
- Squad integrity.
- Contract integrity.
- Financial integrity.
- Population integrity.
- Index integrity.
- Storage integrity.

Blocking errors prevent checkpoint creation and Add Manager navigation.

---

## 19. Warning policy

Nonblocking warnings may include:

- Optional historical record omitted.
- Nonessential media reference unavailable.
- Search index postponed for lazy construction.
- Some inactive clubs represented abstractly.
- Estimate differed substantially from actual generation counts.

Blocking errors include:

- Missing required entity.
- Invalid competition participants.
- Unresolvable fixture calendar.
- Required squad below minimum after approved generation.
- Duplicate canonical ID.
- Invalid contract currency or date.
- Failed persistent transaction.
- Failed checkpoint checksum.

Warnings must be recorded in the validation report.

---

## 20. Failure states

### 20.1 Setup changed

```text
The football database or a content pack changed after setup was completed.

World generation cannot continue with mixed versions.

[Return to Database Setup]
```

### 20.2 Insufficient storage

```text
World generation stopped because the configured data location does not have
enough free storage.

Required additional space: approximately 860 MB

[Choose Data Location] [Return to Setup]
```

### 20.3 Memory exhaustion

```text
World generation exceeded the available memory budget.

Your setup choices are preserved. Reduce the database scope or close other
applications before retrying.

[Return to Database Options] [Retry]
```

Retry is offered only when safe.

### 20.4 Fixture generation failure

```text
A valid schedule could not be created for Exampleland National Cup.

Diagnostic reference: WORLD-FIX-2048

[View Safe Details] [Return to League Setup]
```

### 20.5 Validation failure

```text
The generated world did not pass integrity checks.

No playable save was created.

Diagnostic reference: WORLD-VAL-7712

[Copy Diagnostic Summary] [Return to Setup]
```

### 20.6 Initial checkpoint failure

```text
The world was generated, but its initial checkpoint could not be saved
safely. The incomplete world will be discarded.

[Retry Save] [Return to Setup]
```

### 20.7 Unexpected internal failure

Provide:

- Safe user-facing explanation.
- Diagnostic reference.
- Retry only when the stage policy permits it.
- Return to setup.
- Cleanup status.

Never display raw stack traces by default.

---

## 21. Retry policy

Stages should declare one of:

```typescript
type GenerationRetryPolicy =
  "not_retryable" | "retry_stage" | "retry_from_checkpoint" | "restart_generation";
```

Examples:

- Temporary storage read: retry stage.
- Index construction: retry stage.
- Fixture solver with unchanged inputs: generally not retryable unless the failure was operational.
- Corrupted temporary transaction: restart generation.
- Checkpoint write after transient storage error: retry from checkpoint or retry save.

A deterministic domain failure must not be retried repeatedly with the same inputs as though it were random.

---

## 22. Successful completion

After validation and checkpoint promotion:

```text
Career world created successfully

Nations: 42
Competitions: 97
Clubs: 740
Players: 34,516
Staff: 8,742

[Add Manager]
```

The application may transition automatically after a short accessibility-safe announcement, but an explicit `Add Manager` action is preferable when warnings need review.

No artificial delay should be added.

---

## 23. World generation result

```typescript
interface WorldGenerationResult {
  readonly generationId: string;
  readonly careerId: string;
  readonly initialCheckpointId: string;
  readonly worldSchemaVersion: number;
  readonly reproducibility: WorldReproducibilityDescriptor;
  readonly actualCounts: WorldEntityCounts;
  readonly generationDurationMs: number;
  readonly validationReport: WorldValidationReport;
  readonly warnings: readonly GenerationWarning[];
}
```

The result should contain identifiers and summaries rather than transporting the entire world through the UI layer.

---

## 24. State machine

```text
VERIFYING_REQUEST
  |
  v
PREPARING_STORAGE
  |
  v
CREATING_STATIC_WORLD
  |
  v
LOADING_POPULATION
  |
  v
GENERATING_REQUIRED_PEOPLE
  |
  v
INITIALIZING_CLUBS_AND_COMPETITIONS
  |
  v
BUILDING_CALENDARS_AND_FIXTURES
  |
  v
INITIALIZING_MARKETS_AND_KNOWLEDGE
  |
  v
BUILDING_INDEXES
  |
  v
VALIDATING_WORLD
  |
  v
CREATING_INITIAL_CHECKPOINT
  |
  v
COMPLETED
  |
  v
ADD_MANAGER
```

Alternative transitions:

```text
Any cancellable running state
  -> CANCELLATION_REQUESTED
  -> ROLLING_BACK
  -> CANCELLED
  -> DATABASE_OPTIONS
```

```text
Any running state
  -> FAILED
  -> CLEANING_UP
  -> RETRY_AVAILABLE or RETURN_TO_SETUP
```

```text
COMMITTING_CHECKPOINT
  -> CANCELLATION_DEFERRED
  -> COMPLETED or ROLLING_BACK
```

Invalid transitions must be rejected.

---

## 25. Commands

```text
BEGIN_WORLD_GENERATION
REQUEST_GENERATION_CANCELLATION
CONFIRM_GENERATION_CANCELLATION
DISMISS_CANCELLATION_DIALOG
EXPAND_GENERATION_DETAILS
COLLAPSE_GENERATION_DETAILS
RETRY_FAILED_STAGE
RETRY_FROM_CHECKPOINT
RESTART_WORLD_GENERATION
COPY_DIAGNOSTIC_SUMMARY
OPEN_WARNING_REPORT
RETURN_TO_SETUP
CONTINUE_TO_ADD_MANAGER
```

Every command must include the active generation ID where applicable.

---

## 26. Architecture and boundaries

The screen may depend on:

- World-generation coordinator.
- Setup-snapshot repository.
- Validated database reader.
- Transactional world store.
- Population materializer.
- Generated-person service.
- Calendar and fixture service.
- World validators.
- Index builders.
- Checkpoint service.
- Storage-capacity service.
- Structured logging.

The UI must not directly:

- Create domain entities.
- Write canonical world files.
- Generate random attributes.
- Construct fixtures.
- Promote checkpoints.
- Decide retry safety.

Recommended boundary:

```text
Generation Screen
  |
  v
Generation Presenter
  |
  v
World Generation Application Service
  |
  v
Generation Coordinator
  +-- Stage Graph
  +-- Workers
  +-- Transaction Store
  +-- Validators
  +-- Checkpoint Service
```

---

## 27. Observability

Structured operational data may include:

- Generation ID.
- Stage durations.
- Entity counts.
- Worker throughput.
- Peak memory estimate and observed peak where available.
- Temporary storage used.
- Cache hits.
- Warning and error codes.
- Cancellation stage.
- Retry count.
- Validation duration.

Avoid collecting:

- Custom names as telemetry.
- Full local paths.
- Usernames.
- Raw database records.
- Save contents.
- Unredacted stack traces without explicit diagnostic consent.

Example:

```json
{
  "event": "world_generation_completed",
  "generationId": "gen_7k4m2p9q",
  "durationMs": 248120,
  "playerCount": 34516,
  "staffCount": 8742,
  "warningCount": 2,
  "validationStatus": "valid_with_warnings"
}
```

---

## 28. Accessibility requirements

- Expose the overall progress bar with name, value, and state.
- Announce stage changes through a polite live region.
- Announce failures and cancellation state immediately.
- Do not announce every entity-count update.
- Provide text alongside every status icon.
- Keep Cancel keyboard accessible when cancellation is allowed.
- Explain temporarily deferred cancellation.
- Respect reduced motion.
- Keep focus visible.
- Restore focus after confirmation dialogs.
- Ensure the details log supports screen-reader navigation without trapping focus.

Recommended announcements:

```text
World generation started.
Players and staff loaded.
Creating competition schedules.
Validating generated world.
Initial checkpoint created.
Career world ready. Add a manager to continue.
```

---

## 29. Keyboard interaction

- `Tab` and `Shift+Tab`: move between controls.
- `Enter` or `Space`: activate the focused control.
- `Escape`: close details first, then open cancellation confirmation when safe.
- `Page Up` and `Page Down`: scroll details.
- `Home` and `End`: move to the start or end of the details log.
- `Ctrl+C`: copy selected safe diagnostic text where supported.

Keyboard shortcuts must not bypass cancellation confirmation.

---

## 30. Localization requirements

- Localize stage names and user-facing messages.
- Use complete message templates.
- Localize entity counts, file sizes, durations, and date-time values.
- Support right-to-left layout.
- Support long stage labels.
- Keep stage IDs and error codes language-independent.
- Preserve technical identifiers when copying diagnostic summaries.

Do not form sentences by concatenating translated fragments.

---

## 31. Responsive behavior

### Wide desktop

Center a bounded progress panel with an optional expanded details area.

### Narrow desktop

Stack:

```text
Header
Overall progress
Current task
Stage list
Time estimate
Details
Actions
```

### High text scaling

- Allow stage labels to wrap.
- Keep status icon and label associated.
- Move timing information onto separate lines.
- Keep Cancel reachable.
- Prevent details from overlapping actions.

### Reduced motion

Replace animated transitions with static status changes and a simple progress indicator.

---

## 32. Security requirements

Treat database data, content packs, setup snapshots, save paths, and diagnostic fields as untrusted.

Protect against:

- Path traversal.
- Symbolic-link escape.
- Malicious archive contents.
- Invalid stable identifiers.
- Oversized record counts.
- Integer overflow.
- Invalid Unicode.
- Log injection.
- Forged progress events.
- Forged generation IDs.
- Concurrent writes to the same target.
- Incomplete save promotion.
- Unsafe deserialization.

Rules:

1. Resolve all paths under approved roots.
2. Acquire exclusive generation locks.
3. Validate snapshots in a trusted process.
4. Keep canonical writes transactional.
5. Use safe integer handling for counts and byte sizes.
6. Sanitize displayed diagnostics.
7. Authenticate or validate worker messages.
8. Reject events for inactive generation IDs.
9. Deserialize through versioned schemas.
10. Promote output only after validation and checksum completion.

---

## 33. Performance requirements

World generation may be CPU, memory, and storage intensive.

Requirements:

- Use bounded worker concurrency.
- Respect the configured memory budget.
- Apply backpressure to entity pipelines.
- Batch persistent writes.
- Avoid loading unnecessary source records simultaneously.
- Rate-limit UI progress events.
- Release stage-local resources deterministically.
- Reuse validated indexes where fingerprints match.
- Keep the UI responsive throughout generation.
- Allow operating-system scheduling and thermal constraints to reduce worker count.

Worker count should derive from a configured policy, not a hardcoded processor assumption.

---

## 34. Resource-pressure behavior

### Memory pressure

- Pause scheduling new batches.
- Flush safe buffers.
- Reduce worker concurrency when policy allows.
- Cancel with a controlled error before process termination where possible.

### Storage pressure

- Stop before a write that cannot be completed safely.
- Preserve the last valid checkpoint.
- Remove unnecessary temporary files.
- Recheck available storage.

### Thermal or power constraints

If the platform exposes such information, reduce concurrency without changing canonical results.

---

## 35. Persistence and recovery

Persist:

- Generation manifest.
- Stage-boundary checkpoints where enabled.
- Safe warning summaries.
- Reproducibility descriptor.
- Validation report.
- Final initial checkpoint.

Do not persist as valid:

- Half-written entities.
- Uncommitted fixtures.
- Incomplete indexes marked complete.
- A world that failed validation.
- A managerless world as an ordinary playable save unless the product supports that state.

---

## 36. Edge cases

### Database changes during generation

Continue using the locked validated source or fail safely if immutable access cannot be guaranteed. Never mix versions.

### Save target removed

Pause at a safe boundary, roll back active writes, and offer a new approved target if supported.

### Device sleep

Resume safely, recalculate time estimates, and do not treat suspension time as processing time.

### Clock changes

Use monotonic time for durations.

### Worker crashes

Isolate the failure, discard incomplete batch output, and follow the stage retry policy.

### Duplicate generation request

Reject the second request or focus the active generation screen.

### User closes the application

Request cancellation, complete safe rollback within a bounded shutdown policy, and leave an incomplete manifest for cleanup if forced termination occurs.

### Actual population exceeds estimate

Enforce hard limits during generation. Do not continue merely because setup estimation was lower.

### Fixture solver produces several valid schedules

Choose deterministically using the fixture random stream.

### Generated names exhausted

Use a configured fallback pool or block with a diagnostic error. Do not create empty or duplicate-invalid names.

### Initial checkpoint already exists

Never overwrite an unrelated career. Require a unique career ID or explicit safe replacement workflow.

---

## 37. Acceptance criteria

The screen is complete when:

1. It verifies all setup snapshots and fingerprints before writing world state.
2. Generation starts exactly once for a valid request.
3. The UI remains responsive during every stage.
4. Overall progress is weighted and never reports completion prematurely.
5. Current stage, elapsed time, and meaningful status are visible.
6. Cancellation is cooperative and respects transactional boundaries.
7. Cancelled worlds are never listed as playable saves.
8. Temporary artifacts are cleaned or safely quarantined.
9. Career generation is deterministic for an identical reproducibility descriptor.
10. Independent random streams prevent unrelated procedural changes from cascading.
11. Generated people satisfy all domain invariants.
12. Fixture calendars satisfy competition constraints.
13. World validation covers referential, competition, squad, contract, financial, and storage integrity.
14. Blocking validation errors prevent checkpoint creation.
15. A career is reported ready only after the initial checkpoint is durable.
16. Retry behavior follows explicit stage policies.
17. Deterministic domain failures are not retried blindly.
18. Crash recovery never exposes an incomplete world as valid.
19. Progress and diagnostic events are associated with the active generation ID.
20. Resource pressure is handled through bounded workers and backpressure.
21. Keyboard and assistive-technology users can follow progress and cancel safely.
22. Untrusted data cannot escape approved storage roots or inject executable content.
23. Success transitions to Add Manager with identifiers rather than the entire world payload.
24. No proprietary artwork, source code, exact interface wording, or original database is required.

---

## 38. Recommended tests

### Unit tests

- Request compatibility validation.
- Stage-graph ordering.
- Cycle detection in stage dependencies.
- Weighted progress calculation.
- Monotonic visible progress.
- Generation-ID validation.
- Seed validation.
- Random-stream derivation.
- Generated-person invariants.
- Inclusion deduplication.
- Fixture-count validation.
- Checkpoint manifest validation.
- Retry-policy selection.
- Cancellation-state transitions.

### Integration tests

- Generate a minimal career.
- Generate a medium career.
- Generate a large career within limits.
- Cancel during population loading.
- Cancel during fixture generation.
- Defer cancellation during checkpoint commit.
- Retry a recoverable index failure.
- Reject changed database fingerprints.
- Reject insufficient storage before generation.
- Handle storage exhaustion during generation.
- Handle memory pressure.
- Validate and promote a completed world.
- Transition to Add Manager.
- Recover and clean an incomplete manifest after restart.

### Determinism tests

- Generate twice with identical descriptors and compare canonical hashes.
- Change only the career seed and confirm expected procedural differences.
- Add one generated staff requirement and verify fixture output remains unchanged.
- Change engine or policy version and verify the descriptor changes.
- Confirm worker-count variation does not change canonical results.

### Competition tests

- Round-robin home and away balance.
- Knockout bracket completeness.
- Group-to-knockout qualification.
- Promotion and relegation links.
- Parallel regional divisions.
- League split.
- Replay and second-leg rules.
- Ground sharing.
- International windows.
- Midseason start.

### Security tests

- Path traversal in save target.
- Symbolic-link escape.
- Forged setup snapshot.
- Forged progress event.
- Duplicate generation ID.
- Oversized entity counts.
- Integer overflow in byte calculations.
- Malicious Unicode and log control characters.
- Unsafe deserialization payload.
- Concurrent writers to one target.
- Incomplete checkpoint promotion.

### Accessibility tests

- Keyboard-only cancellation.
- Cancellation confirmation focus.
- Stage-change announcements.
- Deferred-cancellation announcement.
- Failure announcement.
- Details-log navigation.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long translated stage labels.

### Visual regression tests

Capture at least:

- Generation starting.
- Determinate progress.
- Indeterminate substage.
- Expanded details.
- Warning state.
- Cancellation confirmation.
- Cancelling state.
- Deferred cancellation.
- Recoverable failure.
- Blocking validation failure.
- Successful completion.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 39. Condensed LLM implementation brief

```text
Implement a desktop Game Loading and World Generation screen for an original
football-management simulation.

The screen receives immutable LeagueSelectionSnapshot,
CompetitionDetailSnapshot, and DatabaseScopeSnapshot identifiers. Before
writing anything, verify that all snapshots exist, are complete, share the
same database fingerprint, reference unchanged content packs, and are
compatible with the engine and world schema.

Create the world through a versioned stage graph: verify setup, prepare a
transactional store, create static world entities, materialize selected
players and staff, generate required fictional people, normalize squads and
contracts, initialize injuries and discipline, initialize clubs, construct
competition calendars and fixtures, initialize histories, transfers,
scouting and scheduled events, build indexes, validate the world, and create
a durable initial checkpoint.

Use a deterministic career seed and isolated random streams for generated
players, generated staff, fixtures, injuries, and market initialization.
Identical reproducibility descriptors must create equivalent canonical
initial worlds regardless of worker scheduling.

Show weighted overall progress, current stage, stage states, elapsed time,
and a remaining-time range only when confidence is adequate. Stage weights
and estimator premises must come from named configuration values. Never show
100 percent before the initial checkpoint is durable. Rate-limit UI events.

Use bounded worker concurrency, backpressure, transactional writes, safe
integer handling, and strict resource budgets. Only the generation
coordinator may promote the completed world. Treat every path, snapshot,
database record, worker event, and diagnostic field as untrusted.

Cancellation must be cooperative. Defer it during atomic storage operations,
then roll back safely. Preserve setup choices but never expose cancelled or
failed output as a playable save. Store versioned, checksummed stage-boundary
checkpoints only where safe. Resume only when all fingerprints and versions
match.

Validate referential integrity, identifiers, squads, contracts, finances,
competition participants, calendars, fixtures, promotion paths, generated
people, indexes, and storage. Blocking validation failures must discard or
quarantine the incomplete world. A career is ready only after validation and
initial-checkpoint promotion succeed.

On success, return a compact WorldGenerationResult with career ID,
checkpoint ID, reproducibility descriptor, actual counts, duration, warnings,
and validation report. Transition to Add Manager. Support complete keyboard
operation, visible focus, screen-reader stage announcements, reduced motion,
high text scaling, localization, and right-to-left layouts. Do not copy
proprietary artwork, exact wording, source code, logos, or databases.
```

---

## 40. Next planned item

**Screen 7: Add Manager** should define the manager-slot list, local and network manager ownership, Add Manager entry action, world-without-manager state, permissions, duplicate identity handling, navigation, and transition into Manager Personal Details.

---

## Suggested Git commit

```text
feat(docs): specify world generation screen
```
