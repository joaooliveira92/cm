# Screen 3: New Game, League and Nation Selection

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, source code, databases, logos, exact interface wording, or other protected assets. Use original visual design and fictional or properly licensed football data.

---

## 1. Purpose

The **League and Nation Selection** screen lets the user define the geographic and competitive scope of a new career.

It appears after database initialization succeeds and before advanced competition-detail, database-size, and performance settings are finalized.

The screen must allow the user to:

- Review all nations available in the selected database.
- Select which nations participate in the career simulation.
- Choose how deeply each selected nation's league pyramid is loaded.
- Distinguish playable leagues from background or view-only competitions.
- Understand dependencies between divisions and competitions.
- Review the estimated effect on processing speed, memory use, save size, and player count.
- Detect invalid combinations before continuing.
- Restore recommended, minimal, or previously used configurations.
- Continue to the next setup stage without creating the career world prematurely.

This screen defines the **simulation scope**, not the user's club. Club selection occurs later.

---

## 2. Position in the new-career flow

```text
Main Menu
    |
    v
Database Initialization
    |
    | Setup metadata and indexes are ready
    v
League and Nation Selection
    |
    | Valid selection submitted
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
Club Selection
    |
    v
World Generation
    |
    v
Career Inbox
```

The user may move backward to Database Initialization or the database selector while world generation has not started.

If returning to this screen from a later setup stage, the previous selection should be restored unless the selected database or enabled content packs have changed.

---

## 3. Core concepts

The implementation must keep the following concepts distinct.

### 3.1 Available nation

A nation is available when the validated database contains enough metadata to display it in setup.

Availability does not imply that the nation has a playable league.

A nation may contain:

- Playable domestic leagues.
- Background-only domestic leagues.
- Cup competitions.
- International teams.
- Clubs that participate only in continental competitions.
- Players and staff without an active domestic competition.

### 3.2 Selected nation

A nation is selected when the user chooses at least one simulation mode for it.

A selected nation may be:

- Fully playable.
- Playable down to a chosen division.
- Background simulated.
- View-only.
- Included only because another selected competition depends on it.

### 3.3 Playable league

A playable league supports the full management experience, including:

- Managing a club in the competition.
- Full squad and staff simulation.
- Detailed fixtures and results.
- Competition rules and registrations.
- Promotions and relegations.
- Transfers involving active clubs.
- Managerial vacancies and appointments.
- Detailed statistics and histories.

Selecting a lower playable division normally activates every required division above it.

### 3.4 Background league

A background league is simulated at reduced detail.

Possible characteristics include:

- Results generated without full match simulation.
- Limited player development detail.
- Simplified transfer and staffing logic.
- Fewer persistent statistics.
- No user management of clubs in that league.
- Promotion or continental qualification still affecting playable competitions.

The exact meaning of background simulation must be documented by the game design and remain deterministic.

### 3.5 View-only competition

A view-only competition exposes standings, fixtures, and results but does not support managing participating clubs.

View-only mode may use generated or imported outcomes with minimal world-state processing.

It must not be labeled playable.

### 3.6 Division depth

Division depth is the lowest tier of a nation's pyramid that receives the selected simulation mode.

Example:

```text
Nation: Exampleland
Selected depth: Third Division

Active tiers:
  Premier Division       Playable
  First Division         Playable
  Second Division        Playable
  Third Division         Playable

Inactive tiers:
  Regional Division      Not loaded
```

### 3.7 Required dependency

A required dependency is activated because another selection cannot operate correctly without it.

Examples:

- A second division requires the first division for promotion.
- A domestic top division requires its national cup.
- A continental tournament requires qualifying clubs from participating nations.
- A reserve competition requires its parent league.
- A league split requires all groups participating in the split.

Required dependencies should be visible and must not appear to be arbitrary user choices.

---

## 4. Conceptual desktop layout

```text
+--------------------------------------------------------------------------------+
| NEW CAREER                                      Step 2 of 6: Select Leagues    |
|--------------------------------------------------------------------------------|
| Search nations...    [Region: All v] [Selected: All v] [Recommended Setup]     |
|--------------------------------------------------------------------------------|
| NATIONS AND LEAGUES                         | SELECTION SUMMARY                |
|                                             |                                  |
| [ ] Africa                                  | Selected nations: 3              |
| [v] Europe                                  | Playable divisions: 8            |
|   [x] Exampleland                           | Background leagues: 4            |
|       Mode: Playable                        | Estimated players: 18,400        |
|       Lowest division: Third Division [v]   | Estimated clubs: 610             |
|       [>] Premier Division                  |                                  |
|       [>] First Division                    | Game speed:                      |
|       [>] Second Division                   | [========------] Medium          |
|       [>] Third Division                    |                                  |
|   [x] North Republic                        | Memory estimate: 2.1 GB          |
|       Mode: Background [v]                  | Save estimate: 280 MB            |
|   [ ] Coastal Federation                    |                                  |
| [>] North America                           | [View Dependencies]              |
| [>] South America                           | [View Included Competitions]     |
| [>] Asia                                    |                                  |
| [>] Oceania                                 |                                  |
|--------------------------------------------------------------------------------|
| [Back]     [Clear Selection]     [Advanced Details]                  [Continue]|
+--------------------------------------------------------------------------------+
```

This is an information-architecture diagram, not a pixel-perfect reconstruction.

---

## 5. Screen regions

### 5.1 Setup header

The header should display:

- `New Career` as the workflow title.
- Current stage, such as `Select Leagues`.
- Step number if the setup flow has a stable number of stages.
- Selected database name and version in a secondary line or tooltip.
- Back navigation.

Example:

```text
New Career
Step 2 of 6: Select Leagues
Database: Fictional World 2003/04, version 1.0.0
```

The header should not display normal in-career navigation.

### 5.2 Toolbar

The toolbar helps users work with a large nation list.

Recommended controls:

- Search field.
- Region filter.
- Selection-status filter.
- Simulation-mode filter.
- Expand-all and collapse-all actions.
- Recommended setup action.
- Preset selector.

Conceptual layout:

```text
[Search nations or competitions...] [Region: All v] [Status: All v] [Preset v]
```

Toolbar controls must not modify hidden selections unless the user explicitly activates a bulk action.

### 5.3 Nation and league browser

This is the primary interactive region.

It presents a hierarchical tree:

```text
Region
  -> Nation
      -> Domestic pyramid
          -> Division
      -> Domestic cups
      -> Reserve or youth competitions
      -> Other supported competitions
```

The browser must support:

- Expansion and collapse.
- Selection by nation.
- Selection by division depth.
- Mode selection.
- Disabled and dependency-controlled items.
- Search-result highlighting.
- Clear status indicators.
- Keyboard traversal.

### 5.4 Selection-summary panel

The summary panel updates whenever the effective configuration changes.

It should display:

- Selected nation count.
- Playable nation count.
- Background nation count.
- Playable division count.
- Background competition count.
- Estimated active player count.
- Estimated active staff count.
- Estimated club count.
- Estimated memory use.
- Estimated save-file size.
- Expected processing-speed category.
- Warnings and unresolved conflicts.

This panel describes the **effective selection**, including automatically enabled dependencies.

### 5.5 Footer actions

Recommended actions:

- `Back`
- `Clear Selection`
- `Advanced Details`
- `Continue`

Optional actions:

- `Save Preset`
- `Load Preset`
- `Restore Previous Selection`
- `Recommended Setup`

`Continue` remains disabled until the selection is valid.

---

## 6. Initial state

When the screen first opens, use one of the following policies.

### 6.1 Recommended default

Automatically select a conservative configuration based on:

- Available system memory.
- Processor capability.
- Database size.
- Previously selected language or locale.
- Database-provided recommendations.

The user must be told that a recommendation was applied.

```text
A recommended league configuration has been selected for this computer.
You can change it before continuing.
```

Locale may influence which nation is initially visible, but it must not silently force that nation to be playable.

### 6.2 Empty default

Start with no playable nation selected and require the user to make a choice.

This is simple but increases setup friction.

### 6.3 Previous configuration

If the same database fingerprint was used for a previous career, offer the previous configuration.

Do not restore it automatically if:

- The database version changed.
- Competition identifiers changed.
- Content packs changed.
- The prior preset is invalid.
- Current system limits are substantially lower.

### 6.4 Required minimum

At least one playable competition should normally be required before continuing.

A background-only career may be permitted only if the product explicitly supports spectator or unemployed-manager modes without a playable domestic league.

---

## 7. Nation row specification

Each nation row should include:

- Selection control.
- Nation display name.
- Original flag or neutral geographic icon if legally usable.
- Expansion control.
- Current simulation mode.
- Lowest active division.
- Warning or dependency indicator.
- Optional estimated processing cost.

Conceptual row:

```text
[v] [x] Exampleland       Playable to Third Division       Medium cost   [!]
```

### 7.1 Nation states

```typescript
type NationSelectionState =
  | "not_selected"
  | "selected_playable"
  | "selected_background"
  | "selected_view_only"
  | "included_by_dependency"
  | "partially_selected"
  | "unavailable";
```

### 7.2 Tri-state selection

A nation checkbox may use three states:

- Unchecked: nothing selected.
- Checked: all default components selected.
- Mixed: only some divisions or competitions selected.

The mixed state must be conveyed through both visual and accessible semantics.

### 7.3 Nation with no playable league

Such a nation should remain visible if it has relevant clubs, players, national teams, or competitions.

Its row might show:

```text
Island Territory       Background data only
```

The interface must not offer a playable mode that the database cannot support.

---

## 8. League pyramid interaction

### 8.1 Lowest playable division control

The primary interaction can be a dropdown containing valid division depths.

```text
Lowest playable division:
  Premier Division
  First Division
  Second Division
  Third Division
```

Choosing `Third Division` automatically includes required higher divisions.

### 8.2 Direct tree selection

An alternative is direct selection in the expanded pyramid:

```text
[x] Premier Division
[x] First Division
[x] Second Division
[x] Third Division
[ ] Regional Division
```

If the user deselects a higher tier while a lower tier remains selected, the UI should either:

- Deselect all dependent lower tiers, or
- Reject the change and explain the dependency.

The first approach is usually more understandable if accompanied by a clear preview.

### 8.3 Noncontiguous league structures

Not every league pyramid is a single vertical chain.

The model must support:

- Parallel regional divisions.
- Conference groups.
- Apertura and Clausura structures.
- League splits.
- Franchise competitions without promotion.
- Reserve leagues.
- Independent cups.
- Cross-border competitions.
- Promotion playoffs linking several branches.

Example:

```text
National First Division
  -> Northern Second Division
  -> Southern Second Division
      -> Regional East
      -> Regional West
```

The user should select a supported **scope option**, not manually construct an invalid competition graph.

### 8.4 Scope options

The database may define valid options:

```typescript
interface LeagueScopeOption {
  readonly id: string;
  readonly nationId: string;
  readonly displayName: string;
  readonly playableCompetitionIds: readonly string[];
  readonly backgroundCompetitionIds: readonly string[];
  readonly requiredCompetitionIds: readonly string[];
  readonly estimatedCost: SimulationCostEstimate;
}
```

Example display names:

```text
Top division only
Top two divisions
National pyramid
National and regional pyramid
```

This is safer than deriving every structure from tier numbers.

---

## 9. Simulation mode selection

Each supported nation or league may expose a simulation-mode selector.

```text
Simulation mode:
  Playable
  Background
  View only
  Not loaded
```

### 9.1 Playable

- User may manage eligible clubs.
- Full competition rules apply.
- Detailed squad simulation is active.
- Detailed statistics are retained.
- Highest processing cost.

### 9.2 Background

- No direct club management.
- Simplified simulation.
- Promotions, relegations, and qualification may still occur.
- Reduced statistics and entity activity.
- Moderate processing cost.

### 9.3 View only

- Results, standings, and schedules are available.
- Little or no persistent squad simulation.
- No management eligibility.
- Low processing cost.

### 9.4 Not loaded

- Competition is absent from normal navigation.
- Clubs and people may still exist if required by other loaded content.
- Results may be generated only when needed by a loaded competition.
- Lowest processing cost.

### 9.5 Mode transition rules

Changing a nation from Playable to Background must:

1. Remove its clubs from the future club-selection pool.
2. Recalculate active player and staff estimates.
3. Recalculate competition dependencies.
4. Preserve the previous playable depth for possible restoration.
5. Warn if a later setup selection becomes invalid.

Changing from Background to Playable must restore a valid default scope if no previous playable scope exists.

---

## 10. Search and filtering

### 10.1 Search behavior

Search should match:

- Nation display name.
- Alternative localized name.
- League name.
- Competition name.
- Region name.

Search must not mutate the selection.

Example:

```text
Search: "north"

Results:
  North Republic
  Northern Federation
  Exampleland > Northern Second Division
```

### 10.2 Search normalization

Search may normalize:

- Case.
- Diacritics when appropriate.
- Whitespace.
- Locale-specific text forms.

Stable entity identifiers must not be exposed as ordinary search results unless developer mode is active.

### 10.3 Region filter

Suggested values:

- All regions.
- Africa.
- Asia.
- Europe.
- North America.
- South America.
- Oceania.
- Custom database regions.

Region assignment must come from database metadata rather than hardcoded UI assumptions.

### 10.4 Selection-status filter

Suggested values:

- All.
- Selected.
- Playable.
- Background.
- View only.
- Included by dependency.
- Warnings.
- Unavailable.

### 10.5 Hidden selected items

When filters hide selected nations, show a persistent notice:

```text
5 selected nations are hidden by the current filters. [Show selected]
```

This prevents users from believing that the hidden configuration was cleared.

---

## 11. Selection summary and estimates

### 11.1 Required metrics

The summary should contain estimates derived from the current effective configuration.

```typescript
interface CareerScopeEstimate {
  readonly selectedNationCount: number;
  readonly playableNationCount: number;
  readonly backgroundNationCount: number;
  readonly playableCompetitionCount: number;
  readonly backgroundCompetitionCount: number;
  readonly estimatedClubCount: number;
  readonly estimatedPlayerCount: number;
  readonly estimatedStaffCount: number;
  readonly estimatedMemoryBytes: number;
  readonly estimatedInitialSaveBytes: number;
  readonly estimatedGenerationDurationMs?: number;
  readonly simulationSpeedRating: SimulationSpeedRating;
  readonly confidence: "low" | "medium" | "high";
}
```

### 11.2 Speed rating

Use a categorical indicator rather than an unjustifiably precise claim.

```typescript
type SimulationSpeedRating = "very_fast" | "fast" | "medium" | "slow" | "very_slow" | "unsupported";
```

Example rendering:

```text
Expected processing speed: Medium
Estimate confidence: Medium
```

### 11.3 Calculation inputs

Estimate calculations may consider:

- Number of active clubs.
- Number of active players and staff.
- Competition match count.
- Full-detail match count.
- Transfer-market participation.
- Number of retained statistics.
- Historical data volume.
- Database-size choice.
- Processor capability.
- Available memory.
- Storage performance.

### 11.4 Avoid false precision

Avoid claims such as:

```text
Each day will process in exactly 2.43 seconds.
```

Prefer:

```text
Expected speed: Medium
Typical daily processing may take several seconds on this system.
```

### 11.5 Debounced recalculation

Do not run expensive estimates on every pointer event.

Recommended behavior:

- Apply immediate local selection feedback.
- Debounce estimate calculation.
- Cancel obsolete estimate jobs.
- Display the last valid estimate while a new one is calculated.
- Mark the estimate as updating.

```typescript
interface EstimateRequest {
  readonly selectionRevision: number;
  readonly effectiveSelection: EffectiveLeagueSelection;
  readonly systemProfile: SystemCapabilityProfile;
  readonly signal: AbortSignal;
}
```

Only results matching the current `selectionRevision` may update the UI.

---

## 12. Dependency behavior

### 12.1 Automatic dependencies

When a choice requires another competition, the application may activate it automatically.

Example:

```text
Selecting Exampleland Third Division also activates:

- Exampleland Premier Division
- Exampleland First Division
- Exampleland Second Division
- Exampleland National Cup
```

The dependency should be summarized before or immediately after application.

### 12.2 Dependency indicators

Each automatically included item should show why it is active.

```text
[x] National Cup     Required by Exampleland playable pyramid
```

### 12.3 Dependency viewer

The `View Dependencies` action opens a read-only structure:

```text
Exampleland Third Division
  requires -> Exampleland Second Division
  requires -> Exampleland First Division
  requires -> Exampleland Premier Division
  requires -> Exampleland National Cup
```

### 12.4 Removing dependencies

If the user attempts to remove a required item:

```text
The National Cup is required by the selected Exampleland league scope.

To remove it, first change Exampleland to Background or Not Loaded.

[Go to Exampleland] [Cancel]
```

Do not silently break the selection graph.

### 12.5 Shared dependencies

A competition may be required by multiple selections.

Its effective state remains active until every requiring selection is removed.

```typescript
interface DependencyReason {
  readonly requiredEntityId: string;
  readonly requiredByEntityIds: readonly string[];
  readonly reasonCode: string;
}
```

### 12.6 Circular dependencies

Circular dependencies should have been rejected during database initialization. If one reaches this screen, disable continuation and expose a diagnostic error rather than attempting recursion indefinitely.

---

## 13. Bulk actions and presets

### 13.1 Recommended setup

The recommended setup should optimize for a balanced experience rather than simply selecting the maximum configuration.

Possible policy:

- One or two playable nations.
- Several nearby or economically relevant background nations.
- Major continental competitions in view-only or background mode.
- A player database within the system's recommended memory budget.

The exact policy should be configurable and testable.

### 13.2 Clear selection

`Clear Selection` removes all user-selected nations and all dependencies that are no longer needed.

Because this may undo significant work, show a confirmation when more than a small number of custom choices exist.

```text
Clear all league selections?

This will remove 12 selected nations and their dependent competitions.

[Cancel] [Clear Selection]
```

### 13.3 Presets

Suggested built-in presets:

- Minimal.
- Recommended.
- Major leagues.
- Broad world.
- Maximum supported.

Avoid embedding assumptions about real competition prestige in code. Preset membership should come from database metadata or product configuration.

### 13.4 User presets

A user preset may contain:

```typescript
interface LeagueSelectionPreset {
  readonly id: string;
  readonly displayName: string;
  readonly databaseId: string;
  readonly databaseFingerprint: string;
  readonly selections: readonly NationSelectionIntent[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

Loading a preset against a different database fingerprint requires validation and migration.

### 13.5 Preset migration

If entities are missing:

```text
This preset was created for an older database version.

Restored: 8 nations
Adjusted: 2 nations
Unavailable: 1 nation

[View Changes] [Apply Available Selections] [Cancel]
```

Never substitute competitions merely because their names are similar.

---

## 14. Advanced-details panel

The advanced-details view provides deeper information without cluttering the primary list.

Possible sections:

- Included competitions.
- Active clubs.
- Estimated players and staff.
- Competition dependencies.
- Simulation-mode definitions.
- Database coverage.
- Performance-cost breakdown.
- Warnings.

Conceptual layout:

```text
Advanced Selection Details

Nation: Exampleland
Mode: Playable
Lowest playable scope: Third Division

Playable competitions: 5
Background competitions: 3
Estimated clubs: 92
Estimated players: 2,650
Estimated staff: 780
Estimated memory contribution: 240 MB

[Competition List] [Dependency Graph] [Close]
```

The values should be clearly marked as estimates.

---

## 15. Validation rules

The screen must validate both the user's explicit intent and the resolved effective selection.

### 15.1 Minimum playable scope

Unless a supported alternative mode exists, require at least one playable league.

Error:

```text
Select at least one playable league before continuing.
```

### 15.2 Valid division chain

Every playable scope must include required parent divisions and rule competitions.

### 15.3 Supported start date

Selected competitions must be compatible with at least one available career start date.

If multiple start dates remain possible, later setup may ask the user to choose one.

### 15.4 Population requirements

A competition may require a minimum number of clubs, players, or officials.

If the database cannot provide them, the scope is invalid unless the game has a documented, deterministic generation policy.

### 15.5 Mutually exclusive competitions

Some database configurations may contain alternatives that cannot coexist.

Example:

```text
The Traditional Calendar and Experimental Calendar versions of this league
cannot be active in the same career.
```

### 15.6 Resource limits

The application may warn or block based on hard technical limits.

Warnings should precede blocking restrictions where possible.

```text
This configuration exceeds the recommended memory budget.
The career may process slowly.
```

A blocking message should identify a concrete constraint:

```text
This selection requires approximately 5.8 GB of working memory, but the
configured application limit is 4 GB.

Reduce league depth or increase the application memory limit.
```

### 15.7 Database integrity changes

If source data changes while this screen is open:

- Freeze continuation.
- Revalidate the database fingerprint.
- Preserve user intent temporarily.
- Return to initialization if needed.
- Reapply valid choices only after revalidation.

---

## 16. Warning levels

```typescript
type SelectionIssueSeverity = "information" | "warning" | "blocking_error";
```

### 16.1 Information

Examples:

- A dependency was enabled automatically.
- A view-only competition has no management eligibility.
- A scope excludes regional divisions.

### 16.2 Warning

Examples:

- Estimated performance is slow.
- Selected scope is unusually large.
- A community data pack provides incomplete history.
- A nation has limited player coverage.

The user may continue after acknowledging warnings when appropriate.

### 16.3 Blocking error

Examples:

- No playable league selected.
- Required competition unavailable.
- Unsupported start-date combination.
- Unresolved mutually exclusive rules.
- Effective selection exceeds a hard engine limit.
- Dependency graph is invalid.

`Continue` must be disabled while a blocking error exists.

---

## 17. Continue behavior

Selecting `Continue` performs the following sequence:

1. Commit pending editor changes.
2. Resolve all selection intents into an effective selection.
3. Validate dependency closure.
4. Validate resource constraints.
5. Validate compatibility with available start dates.
6. Produce an immutable selection snapshot.
7. Persist a temporary setup draft.
8. Navigate to Competition Detail Selection.

```typescript
interface LeagueSelectionSnapshot {
  readonly databaseFingerprint: string;
  readonly revision: number;
  readonly userIntents: readonly NationSelectionIntent[];
  readonly effectiveNations: readonly EffectiveNationSelection[];
  readonly effectiveCompetitions: readonly EffectiveCompetitionSelection[];
  readonly dependencyReasons: readonly DependencyReason[];
  readonly estimate: CareerScopeEstimate;
  readonly acknowledgedWarningCodes: readonly string[];
}
```

The snapshot is setup state, not yet a career save.

### 17.1 Warning confirmation

If only nonblocking warnings remain:

```text
Continue with this configuration?

Expected processing speed: Slow
Estimated players: 82,000
Estimated working memory: 6.2 GB

You can return and reduce the league scope.

[Review Selection] [Continue]
```

Do not repeat the dialog after every return unless the warning set or selection revision changed.

### 17.2 Duplicate activation

Disable `Continue` immediately after activation and ignore duplicate submissions until navigation succeeds or fails.

---

## 18. Back behavior

Selecting `Back` returns to the previous setup screen.

Rules:

- Preserve the current selection as a setup draft.
- Do not discard selections merely because the database initialization screen is revisited.
- If the user changes the database, invalidate the draft safely.
- If initialization is rerun with the same fingerprint, restore the draft.
- If there are unsaved edits and Back would destroy them, explain the consequence.

Typical path:

```text
League Selection
  -> Back
  -> Database Ready / Database Selection
```

The application should not rerun expensive initialization automatically when the validated context remains valid.

---

## 19. State model

```typescript
type SimulationMode = "playable" | "background" | "view_only" | "not_loaded";

interface NationSelectionIntent {
  readonly nationId: string;
  readonly mode: SimulationMode;
  readonly scopeOptionId?: string;
  readonly source: "user" | "preset" | "recommended" | "restored";
}

interface EffectiveNationSelection {
  readonly nationId: string;
  readonly mode: SimulationMode;
  readonly scopeOptionId?: string;
  readonly playableCompetitionIds: readonly string[];
  readonly backgroundCompetitionIds: readonly string[];
  readonly viewOnlyCompetitionIds: readonly string[];
  readonly dependencyCompetitionIds: readonly string[];
}

interface LeagueSelectionScreenState {
  readonly databaseFingerprint: string;
  readonly searchQuery: string;
  readonly regionFilterId: string | null;
  readonly statusFilter: string;
  readonly expandedRegionIds: ReadonlySet<string>;
  readonly expandedNationIds: ReadonlySet<string>;
  readonly userIntents: readonly NationSelectionIntent[];
  readonly effectiveSelection: readonly EffectiveNationSelection[];
  readonly issues: readonly SelectionIssue[];
  readonly estimate: CareerScopeEstimate | null;
  readonly estimateStatus: "idle" | "updating" | "ready" | "failed";
  readonly selectionRevision: number;
  readonly submitting: boolean;
}
```

State exposed to a renderer should use serializable equivalents where necessary instead of directly transporting `Map`, `Set`, or class instances across process boundaries.

---

## 20. State transitions

```text
LOADING_SETUP_CONTEXT
  |
  v
READY
  |
  +-- user changes selection --> RESOLVING_SELECTION
  |                               |
  |                               v
  |                         ESTIMATING_COST
  |                               |
  |                               v
  +----------------------------- READY
  |
  +-- apply preset -----------> RESOLVING_SELECTION
  |
  +-- invalid selection ------> READY_WITH_ERRORS
  |
  +-- Continue ---------------> VALIDATING_SUBMISSION
                                  |
                                  +-- invalid --> READY_WITH_ERRORS
                                  |
                                  +-- warnings --> AWAITING_WARNING_ACKNOWLEDGEMENT
                                  |
                                  +-- valid --> SUBMITTING
                                                  |
                                                  v
                                      COMPETITION_DETAIL_SELECTION
```

Back navigation:

```text
READY or READY_WITH_ERRORS
  -> SAVING_SETUP_DRAFT
  -> PREVIOUS_SETUP_SCREEN
```

Estimate failure should not corrupt the selection. It may block continuation only if a reliable estimate is required to enforce hard limits.

---

## 21. Internal commands and events

### 21.1 User commands

```text
SET_SEARCH_QUERY
SET_REGION_FILTER
SET_STATUS_FILTER
EXPAND_REGION
COLLAPSE_REGION
EXPAND_NATION
COLLAPSE_NATION
SET_NATION_MODE
SET_NATION_SCOPE
APPLY_PRESET
APPLY_RECOMMENDED_CONFIGURATION
CLEAR_SELECTION
OPEN_ADVANCED_DETAILS
OPEN_DEPENDENCY_VIEWER
ACKNOWLEDGE_WARNING
REQUEST_CONTINUE
REQUEST_BACK
```

### 21.2 Domain events

```text
SELECTION_INTENT_CHANGED
DEPENDENCY_ADDED
DEPENDENCY_REMOVED
EFFECTIVE_SELECTION_RESOLVED
ESTIMATE_STARTED
ESTIMATE_UPDATED
ESTIMATE_FAILED
VALIDATION_ISSUE_ADDED
VALIDATION_ISSUE_RESOLVED
SELECTION_SNAPSHOT_CREATED
SETUP_DRAFT_SAVED
```

The UI must not directly manipulate competition entities. It should issue commands to the setup application layer.

---

## 22. Architecture and domain boundaries

The screen may depend on:

- New-career setup context.
- League-selection query service.
- Selection resolver.
- Competition dependency resolver.
- Resource estimator.
- Setup validator.
- Preset repository.
- Setup-draft repository.
- Localization service.

It must not directly depend on:

- Match simulation.
- Transfer-market AI.
- Club-finance simulation.
- Player-development engine.
- Tactical engine.
- News generation.
- Final career-save serializer.

Recommended separation:

```text
Renderer / View
    |
    v
League Selection Presenter or View Model
    |
    v
New Career Setup Application Service
    |
    +-- Selection Resolver
    +-- Dependency Resolver
    +-- Estimate Service
    +-- Validation Service
    +-- Preset Repository
    +-- Draft Repository
    |
    v
Validated Database Setup Index
```

The renderer receives read models and sends narrow, validated commands.

---

## 23. Security requirements

Database-derived labels and metadata are untrusted.

The screen must protect against:

- Script injection in competition names.
- Markup injection.
- Excessively long display names.
- Invalid or deceptive Unicode.
- Duplicate stable identifiers.
- Extremely deep hierarchy structures.
- Cyclic dependency graphs.
- Excessively large selection payloads.
- Malicious preset files.
- Renderer-to-main command forgery in desktop applications.

Rules:

1. Render database labels as text, not executable markup.
2. Enforce maximum display and storage lengths.
3. Validate every command at the application boundary.
4. Resolve entities by stable IDs rather than display names.
5. Reject unknown IDs.
6. Limit hierarchy depth.
7. Bound dependency traversal.
8. Validate user presets against a schema.
9. Do not trust resource estimates supplied by the renderer.
10. Revalidate the final selection in the trusted process before continuing.

---

## 24. Keyboard behavior

Recommended keyboard navigation:

- `Tab`: move between major control groups.
- `Shift+Tab`: move backward.
- `Up Arrow` and `Down Arrow`: move through visible tree rows.
- `Right Arrow`: expand a collapsed region or nation.
- `Left Arrow`: collapse an expanded item or move to its parent.
- `Space`: toggle selection when supported.
- `Enter`: open the selected row's primary editor or activate a button.
- `Home`: move to the first visible row.
- `End`: move to the last visible row.
- `Page Up` and `Page Down`: move by viewport.
- `Ctrl+F`: focus search.
- `Escape`: clear search first, close overlays second, or request Back when no transient UI remains.

Selection must not move unexpectedly when estimates finish updating.

When filtering removes the focused row, focus should move to the nearest visible logical neighbor and announce the change.

---

## 25. Accessibility requirements

### 25.1 Hierarchical browser

Expose the browser as an accessible tree or tree grid.

Each row should communicate:

- Name.
- Level.
- Expanded or collapsed state.
- Selected state.
- Simulation mode.
- Division depth.
- Disabled state.
- Dependency reason.
- Warning state.

Example accessible label:

```text
Exampleland, nation, selected, playable to Third Division,
expanded, medium estimated processing cost.
```

### 25.2 Summary updates

Use a polite live region for meaningful updates:

```text
Exampleland set to playable through Third Division.
Four dependent competitions were included.
Expected game speed changed to Medium.
```

Do not announce every estimate field after every small change.

### 25.3 Non-color indicators

Playable, background, and view-only modes require text or icon-plus-text labels. They must not be represented solely by green, amber, or grey.

### 25.4 Focus management

- Opening advanced details moves focus to its heading or first control.
- Closing the panel restores focus to the invoking control.
- Validation errors move focus only after submission, not while the user is still editing.
- Error summaries contain links to affected selections.
- Dependency dialogs restore focus predictably.

### 25.5 Scaling and reflow

At high text scaling:

- Move the summary panel below the nation browser if necessary.
- Preserve full labels or provide accessible expansion.
- Avoid horizontal scrolling for ordinary controls.
- Allow the tree itself to scroll horizontally only when unavoidable.
- Keep footer actions visible without overlaying content.

---

## 26. Localization requirements

All regions, nations, and competitions should use localized display names when available.

Requirements:

- Support long names without silent truncation.
- Provide a tooltip or accessible full label when visual truncation is unavoidable.
- Preserve native scripts.
- Support right-to-left layouts.
- Localize counts, memory sizes, and duration estimates.
- Apply locale-aware search normalization.
- Keep stable IDs independent from translated names.
- Do not sort all languages using English collation rules.

The display order may be:

- Locale-aware alphabetical.
- Database-defined.
- Region then locale-aware alphabetical.
- User-selected sort order.

The selected ordering policy should be visible and deterministic.

---

## 27. Responsive behavior

### 27.1 Wide desktop

Use a two-column layout:

- Nation browser on the left.
- Sticky summary panel on the right.

### 27.2 Standard desktop

Reduce summary width before compressing the league hierarchy.

### 27.3 Narrow desktop window

Stack the summary below or expose it as a drawer.

```text
Toolbar
Nation browser
Selection summary
Footer actions
```

### 27.4 Minimum viewport

At the minimum supported size:

- Search remains usable.
- At least several nation rows are visible.
- Continue and Back remain reachable.
- No modal exceeds the viewport.
- The summary can scroll independently if required.

### 27.5 Ultrawide display

Do not stretch tree rows across the entire display. Use maximum content widths and preserve readable line lengths.

---

## 28. Performance requirements

The screen may display hundreds of competitions and many nations.

Requirements:

- Virtualize long tree lists.
- Preserve stable row identity.
- Avoid rebuilding the entire tree after one selection.
- Memoize derived row states where useful.
- Debounce search and cost estimates.
- Cancel stale estimation tasks.
- Compute dependency closure in bounded time.
- Avoid blocking the renderer with large data transformations.
- Load advanced competition details on demand.

Suggested interaction targets:

- Visible response to selection within 100 milliseconds.
- Search results begin updating within approximately 150 milliseconds.
- Scroll remains smooth during estimate calculation.
- Continue validation gives immediate activity feedback.

These are engineering targets rather than user-facing guarantees.

---

## 29. Persistence behavior

The application may persist:

- Current setup draft.
- Expanded region and nation state.
- Search and filter preferences for the setup session.
- User-created presets.
- Last successful configuration per database fingerprint.
- Acknowledged warning codes tied to a selection revision.

It must not persist as valid:

- Selections referring to unknown entity IDs.
- Estimates from a different system profile.
- Warning acknowledgements after relevant values changed.
- Dependency results from another database fingerprint.
- Partially written presets.

Setup drafts should use atomic write behavior where supported.

---

## 30. Error and empty states

### 30.1 No playable leagues in database

```text
No playable leagues are available in this database.

Choose another database or enable a compatible competition pack.

[Back to Database Selection] [Manage Content Packs]
```

### 30.2 Search has no results

```text
No nations or competitions match "xyz".

[Clear Search]
```

Selections hidden by search remain intact.

### 30.3 Estimate unavailable

```text
A performance estimate is temporarily unavailable.

Your league selections are preserved.

[Retry Estimate]
```

If no hard limit depends on the estimate, the user may continue with an explicit warning.

### 30.4 Preset cannot be applied

```text
This preset is not compatible with the selected database.

No changes were made.

[View Details] [Close]
```

### 30.5 Dependency resolution failed

```text
The selected league scope has an invalid competition dependency.

Competition: Exampleland Second Division
Diagnostic reference: SCOPE-DEP-1042

[Return to Selection] [Copy Diagnostic Summary]
```

### 30.6 Setup draft cannot be saved

- Keep the current state in memory.
- Explain that navigation or application closure may lose changes.
- Offer Retry.
- Do not claim the draft was saved.

---

## 31. Edge cases

### 31.1 Nation renamed between database versions

Match by stable ID only. If the stable ID changed, treat the old selection as unavailable unless an explicit migration map exists.

### 31.2 Competition moves between nations

Apply database-defined migration. Do not infer based on display name.

### 31.3 League becomes unavailable after content-pack change

Mark the intent invalid and guide the user to the affected nation.

### 31.4 A selected lower division is removed

Offer the nearest valid parent scope, but require user acknowledgment before applying it.

### 31.5 Estimate returns out of order

Discard estimates whose selection revision is not current.

### 31.6 All selected nations hidden by filter

Show a persistent hidden-selection notice and keep Continue based on the effective selection.

### 31.7 User applies a preset during estimate calculation

Cancel the old estimate, apply the preset transactionally, increment the revision, and start one new estimate.

### 31.8 Closing the application

Attempt to save a setup draft atomically. If that fails, close safely without creating a corrupt draft.

### 31.9 System capability changes

If memory availability or configured limits change substantially, mark the estimate stale and recalculate.

### 31.10 Very large custom database

Virtualize the browser, enforce entity-count limits, and avoid loading all advanced competition details into renderer memory.

---

## 32. Acceptance criteria

The screen is complete when:

1. All available nations are represented accurately from validated setup metadata.
2. The user can select a playable nation and a valid league depth.
3. Playable, background, view-only, and unloaded modes are clearly distinct.
4. Selecting a lower division includes every required parent competition.
5. Automatically included dependencies are visible and explainable.
6. Invalid combinations cannot be submitted.
7. At least one playable league is required unless an explicitly supported alternative career mode exists.
8. Search and filtering never remove or mutate hidden selections.
9. The summary reflects the effective selection, including dependencies.
10. Resource estimates update without freezing the interface.
11. Stale estimate results cannot overwrite newer results.
12. Continue creates one immutable, validated selection snapshot.
13. Duplicate Continue activation cannot create duplicate setup transitions.
14. Back navigation preserves a valid setup draft.
15. Presets are validated against the current database fingerprint.
16. Keyboard users can operate the entire hierarchy.
17. Screen-reader users receive nation, mode, depth, warning, and dependency information.
18. Database-provided labels cannot execute markup or scripts.
19. Large custom databases remain usable through virtualization and bounded processing.
20. No original game assets, exact wording, or proprietary database records are required.

---

## 33. Recommended tests

### 33.1 Unit tests

- Nation-state derivation.
- Tri-state checkbox derivation.
- Scope-option resolution.
- Parent-division inclusion.
- Shared dependency reference counting.
- Dependency removal.
- Circular-dependency detection.
- Simulation-mode transitions.
- Effective-selection calculation.
- Resource-estimate input generation.
- Selection-revision handling.
- Warning acknowledgment invalidation.
- Preset fingerprint validation.
- Preset migration with explicit mapping.
- Continue-enabled state.

### 33.2 Integration tests

- Select one top division and continue.
- Select a lower division and verify parent activation.
- Change a playable nation to background.
- Change a background nation to playable.
- Apply recommended configuration.
- Clear a complex configuration.
- Restore a setup draft.
- Apply a compatible user preset.
- Reject an incompatible preset without changing state.
- Return from the next screen and restore selections.
- Change database and invalidate the prior draft.
- Resolve shared dependencies across nations.
- Warn when recommended memory is exceeded.
- Block when a hard resource limit is exceeded.

### 33.3 Concurrency tests

- Rapidly change league depth while estimates run.
- Confirm stale estimates are discarded.
- Apply a preset during estimation.
- Press Continue twice rapidly.
- Navigate Back while an estimate is running.
- Close the application during draft persistence.

### 33.4 Security tests

- Competition name containing HTML or script-like text.
- Oversized names and descriptions.
- Invalid Unicode and bidirectional-control abuse.
- Unknown nation ID in a command.
- Unknown scope option ID.
- Preset with path-traversal fields.
- Preset with excessive entity count.
- Deeply nested region hierarchy.
- Cyclic dependencies.
- Forged renderer command.
- Estimate payload tampering.

### 33.5 Accessibility tests

- Keyboard-only nation selection.
- Tree expansion and collapse.
- Tri-state announcement.
- Mode and depth announcement.
- Hidden-selection notice.
- Dependency dialog focus restoration.
- Error-summary navigation.
- 200 percent text scaling.
- High-contrast presentation.
- Reduced-motion mode.
- Right-to-left layout.
- Long translated league names.

### 33.6 Visual regression tests

Capture at least:

- Recommended initial state.
- Empty selection.
- One selected nation.
- Mixed nation selection.
- Expanded league pyramid.
- Background nation.
- View-only nation.
- Dependency indicators.
- Hidden selected items under filters.
- Slow-performance warning.
- Blocking validation error.
- Warning-confirmation dialog.
- Advanced-details panel.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 34. Condensed LLM implementation brief

```text
Implement a desktop League and Nation Selection screen for the new-career
workflow of an original football-management simulation.

The screen receives a validated NewCareerSetupContext from database
initialization. It displays a searchable and filterable hierarchy of
regions, nations, league pyramids, and competitions. Users can set nations
to Playable, Background, View Only, or Not Loaded and choose a valid lowest
playable league scope.

Do not assume every pyramid is a linear tier chain. Read valid scope options
and dependencies from database metadata. Selecting a lower playable scope
must include all required parent divisions, cups, and related competitions.
Show automatically included dependencies and explain why they are active.
Never silently create an invalid competition graph.

Maintain separate user intent and resolved effective selection models.
Resolve dependencies and validate selections in a trusted application
layer. Use stable entity IDs rather than display names. Render all database
labels as untrusted text.

Show a summary containing selected nations, playable and background
competition counts, estimated clubs, players, staff, working memory,
initial save size, and expected processing-speed category. Estimates must
be asynchronous, cancellable, debounced, and tied to a monotonically
increasing selection revision. Discard stale results.

Support recommended, minimal, broad-world, and user presets. Presets must
be tied to a database fingerprint and validated or explicitly migrated.
Do not infer replacements from similar competition names.

Continue is enabled only when the effective selection is valid. Require at
least one playable league unless a supported alternative career mode is
active. On Continue, revalidate the selection, resolve dependencies, check
resource and start-date constraints, create one immutable
LeagueSelectionSnapshot, save a temporary setup draft, and navigate to
Competition Detail Selection. Prevent duplicate submission.

The browser must be virtualized for large databases and support complete
keyboard interaction, accessible tree semantics, tri-state selection,
visible focus, live-region summaries, high text scaling, localization,
and right-to-left layouts.

Do not copy proprietary game art, logos, exact text, source code, or data.
Use an original visual system and fictional or properly licensed content.
```

---

## 35. Next planned item

**Screen 4: New Game, Competition Detail Selection** should define full-detail versus summarized match processing, competition-specific simulation settings, dependency propagation, estimated processing cost, default policies, validation, and transition into database-size and performance configuration.

---

## Suggested Git commit

```text
feat(docs): specify league and nation selection screen
```
