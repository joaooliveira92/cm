# Screen 4: New Game, Competition Detail Selection

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, source code, databases, logos, exact interface wording, or other protected assets. Use an original visual system and fictional or properly licensed football data.

---

## 1. Purpose

The **Competition Detail Selection** screen lets the user decide how much simulation detail the game should retain for competitions already included through league and nation selection.

It appears after **League and Nation Selection** and before **Database Size and Performance Options**.

The screen must allow the user to:

- Review every competition included in the effective career scope.
- Understand why each competition is included.
- Choose an appropriate simulation-detail level where editing is permitted.
- Distinguish match-processing detail from competition availability and playability.
- Apply detail settings by competition, nation, region, competition type, or preset.
- Understand processing, storage, statistical, and gameplay consequences.
- Preserve mandatory detail levels required by playable leagues.
- Resolve dependencies and conflicts deterministically.
- Preview performance estimates before continuing.
- Produce an immutable, validated competition-detail snapshot.

This screen does **not** change whether a league is playable. Playability was established on Screen 3. It changes how deeply the game processes and retains competition activity.

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
    | Valid LeagueSelectionSnapshot
    v
Competition Detail Selection
    |
    | Valid CompetitionDetailSnapshot
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

If the user returns to League and Nation Selection and changes the career scope, this screen must reconcile its settings with the new competition set.

---

## 3. Core design principle

The interface must separate three concepts that are often confused:

1. **Availability:** whether a competition exists in the career.
2. **Playability:** whether the user may manage a club in that competition.
3. **Simulation detail:** how thoroughly matches, statistics, events, and histories are processed and retained.

A competition can therefore be:

```text
Included + Playable + Full detail
Included + Not playable + Full detail
Included + Not playable + Standard detail
Included + View only + Results only
Not included
```

A user must not be able to convert a background competition into a playable competition from this screen.

---

## 4. Simulation-detail levels

Recommended normalized detail levels are:

```typescript
type CompetitionDetailLevel = "full" | "standard" | "results_only" | "essential_only";
```

Products may expose three levels instead of four, but the domain should retain explicit semantics rather than relying on ambiguous labels such as low, medium, and high.

### 4.1 Full detail

Full detail is intended for playable competitions and competitions the user wants to follow closely.

It may include:

- Complete match-engine processing.
- Full event timelines.
- Individual player ratings.
- Starting lineups and substitutions.
- Tactical context.
- Detailed team and player statistics.
- Injuries, disciplinary incidents, and suspensions.
- Competition records and historical statistics.
- Goalscorer, assist, clean-sheet, and appearance tables.
- Rich news generation.
- Match reports and notable-event retention.
- Eligibility and registration effects processed at full fidelity.

Full detail has the highest processing and storage cost.

### 4.2 Standard detail

Standard detail retains meaningful competition outcomes while reducing expensive match-level work.

It may include:

- Deterministic summarized match simulation.
- Scoreline and result.
- Goalscorers and selected major events.
- Simplified player appearances.
- Simplified injuries and suspensions.
- League tables and progression.
- Core competition statistics.
- Limited historical event retention.
- Reduced tactical and minute-by-minute information.

Standard detail should still produce internally consistent season outcomes.

### 4.3 Results only

Results-only processing focuses on schedules, standings, qualification, promotion, and relegation.

It may include:

- Fixture and score generation.
- Competition table updates.
- Knockout progression.
- Simplified disciplinary totals.
- Limited or generated scorers when required.
- No detailed lineups or tactical events.
- No full player ratings.
- Minimal long-term match-event retention.

The game must clearly indicate which statistics will not exist at this level.

### 4.4 Essential only

Essential-only processing exists for competitions included solely to preserve world consistency.

It may include:

- Final outcomes needed by another competition.
- Qualification participants.
- Promotion and relegation destinations.
- Minimal fixture placeholders or aggregate records.
- No browsable match detail unless generated by policy.
- Minimal persistent data.

This level should not be offered for competitions whose full fixture and table data are visible to the user unless the product explains the limitation clearly.

---

## 5. Mandatory minimum detail

Each competition must declare a minimum permissible detail level based on its role.

Examples:

```text
Playable domestic league       Minimum: Full
Playable domestic cup          Minimum: Full
Background domestic league     Minimum: Standard
View-only competition          Minimum: Results only
Dependency-only qualifier      Minimum: Essential only
```

The exact rules must come from validated product and database metadata rather than assumptions in the renderer.

```typescript
interface CompetitionDetailConstraint {
  readonly competitionId: string;
  readonly minimumLevel: CompetitionDetailLevel;
  readonly maximumLevel: CompetitionDetailLevel;
  readonly editable: boolean;
  readonly reasonCodes: readonly string[];
}
```

A locked control must expose the reason:

```text
Full detail is required because this competition is playable.
```

---

## 6. Conceptual desktop layout

```text
+--------------------------------------------------------------------------------+
| NEW CAREER                          Step 3 of 6: Competition Detail            |
| Database: Fictional World 2003/04                                              |
|--------------------------------------------------------------------------------|
| Search... [Region: All v] [Type: All v] [Detail: All v] [Preset: Balanced v]   |
|--------------------------------------------------------------------------------|
| COMPETITIONS                                      | DETAIL SUMMARY             |
|                                                   |                            |
| [v] Exampleland                                   | Full detail: 8             |
|   [lock] Premier Division          Full           | Standard: 12               |
|   [lock] National Cup              Full           | Results only: 19           |
|   [v]    Reserve League            Standard [v]   | Essential only: 4          |
|   [v]    Youth Cup                 Results  [v]   |                            |
| [v] North Republic                               | Detailed matches/season:    |
|   [v]    First Division            Standard [v]   | Approximately 4,820        |
|   [v]    National Cup              Standard [v]   |                            |
| [>] Continental Competitions                      | Expected speed: Medium     |
| [>] International Competitions                    | Working memory: 2.4 GB     |
|                                                   | Save estimate: 340 MB      |
|                                                   |                            |
|                                                   | [View Cost Breakdown]      |
|                                                   | [View Locked Settings]     |
|--------------------------------------------------------------------------------|
| [Back] [Restore Defaults] [Apply by Group] [Advanced Rules]          [Continue]|
+--------------------------------------------------------------------------------+
```

This diagram defines information hierarchy, not exact pixel placement.

---

## 7. Screen regions

### 7.1 Header

The header displays:

- Workflow title.
- Current step.
- Selected database and fingerprint summary.
- Optional indicator that settings were inherited from a preset.
- Back navigation.

### 7.2 Filter toolbar

Recommended controls:

- Search.
- Region filter.
- Nation filter.
- Competition-type filter.
- Current-detail filter.
- Editable or locked filter.
- Warning filter.
- Preset selector.

Filters affect visibility only. They must not alter hidden settings.

### 7.3 Competition browser

The central browser groups competitions by a user-selectable hierarchy.

Possible grouping modes:

```text
Region -> Nation -> Competition
Competition type -> Region -> Competition
Detail level -> Nation -> Competition
Inclusion reason -> Competition
```

The default should normally be:

```text
Region -> Nation -> Competition
```

Continental and international competitions may appear in dedicated groups rather than under a single nation.

### 7.4 Summary panel

The summary reports the effective detail configuration, including locked settings and propagated dependencies.

### 7.5 Footer actions

Recommended actions:

- `Back`
- `Restore Defaults`
- `Apply by Group`
- `Advanced Rules`
- `Continue`

`Continue` remains disabled while blocking validation issues exist.

---

## 8. Competition row specification

Each competition row should communicate:

- Competition name.
- Competition type.
- Nation or geographic scope.
- Current detail level.
- Editable or locked state.
- Inclusion reason.
- Minimum permitted detail.
- Warning state.
- Estimated match count or processing cost on demand.

Conceptual row:

```text
[lock] Premier Division    League    Full    Required by playable scope
```

Editable row:

```text
[v] Continental Cup       Cup       Standard [v]   Medium cost
```

### 8.1 Row state

```typescript
interface CompetitionDetailRowModel {
  readonly competitionId: string;
  readonly displayName: string;
  readonly competitionTypeLabel: string;
  readonly geographicScopeLabel: string;
  readonly selectedLevel: CompetitionDetailLevel;
  readonly minimumLevel: CompetitionDetailLevel;
  readonly maximumLevel: CompetitionDetailLevel;
  readonly editable: boolean;
  readonly lockReasons: readonly string[];
  readonly inclusionReasons: readonly string[];
  readonly estimatedSeasonMatchCount?: number;
  readonly estimatedCostRating: "minimal" | "low" | "medium" | "high";
  readonly issueSeverity?: "information" | "warning" | "blocking_error";
}
```

### 8.2 Locked rows

Locked rows remain focusable so keyboard and assistive-technology users can inspect the reason.

They must not appear enabled if activation cannot change them.

### 8.3 Multiple lock reasons

A competition may be locked for several reasons:

```text
Full detail is required because:
- The competition is playable.
- It supplies qualification to a playable continental competition.
- Detailed registration processing is enabled.
```

Display the primary reason in the row and all reasons in a tooltip or details panel.

---

## 9. Detail selector behavior

The level selector displays only permitted options.

Example for a background league:

```text
Detail level:
  Full
  Standard
  Results only
```

If `Essential only` is below its minimum, do not offer it as an active choice.

### 9.1 Increasing detail

When detail increases:

1. Update the explicit user preference.
2. Recalculate dependency implications.
3. Recalculate estimated detailed matches.
4. Recalculate memory, storage, and processing estimates.
5. Increment the configuration revision.
6. Preserve focus and scroll position.

### 9.2 Decreasing detail

When detail decreases:

1. Validate against the minimum constraint.
2. Identify dependent statistics or features that will be unavailable.
3. Propagate reductions only where the domain policy allows it.
4. Keep higher-detail dependencies active when still required elsewhere.
5. Present a warning if the change removes browsable information.

### 9.3 Invalid change

Example:

```text
Premier Division cannot be changed to Standard detail because it is
playable in this career.

[View League Selection] [Close]
```

The attempted invalid level must not briefly appear as committed state.

---

## 10. Explicit preference versus effective detail

The system must distinguish the user's requested level from the final effective level.

```typescript
interface CompetitionDetailIntent {
  readonly competitionId: string;
  readonly requestedLevel: CompetitionDetailLevel;
  readonly source: "user" | "preset" | "default" | "restored";
}

interface EffectiveCompetitionDetail {
  readonly competitionId: string;
  readonly requestedLevel: CompetitionDetailLevel;
  readonly effectiveLevel: CompetitionDetailLevel;
  readonly minimumLevel: CompetitionDetailLevel;
  readonly upgradedByDependency: boolean;
  readonly reasonCodes: readonly string[];
}
```

Example:

```text
Requested: Results only
Effective: Standard
Reason: Supplies clubs to a full-detail continental competition
```

This distinction prevents automatic upgrades from overwriting the user's underlying preference. If the dependency is later removed, the requested level can be restored.

---

## 11. Dependency propagation

### 11.1 Detail dependency

A competition can require another competition to run at a minimum detail.

Example:

```text
Continental Champions Cup at Full detail
  requires qualifying domestic leagues at Standard or above
```

### 11.2 Statistical dependency

A global feature may impose detail requirements.

Example:

```text
Worldwide goalscorer rankings enabled
  requires scorer data for included ranked competitions
```

### 11.3 Registration dependency

A competition whose eligibility depends on appearances, disciplinary totals, or squad registration may require supporting data from feeder competitions.

### 11.4 Shared dependency

A competition upgraded by several dependants remains upgraded until every requiring reason is removed.

### 11.5 Propagation preview

Before a large change is applied, show a preview:

```text
Setting Continental Champions Cup to Full detail will also increase:

- Exampleland Premier Division: Results only -> Standard
- North Republic First Division: Results only -> Standard
- Coastal Federation League: Essential only -> Standard

Estimated additional matches processed in detail: 1,240 per season
Estimated additional working memory: 180 MB

[Cancel] [Apply Changes]
```

For small, predictable changes, an inline notification may replace a modal dialog.

### 11.6 Bounded resolution

Dependency propagation must:

- Operate on stable IDs.
- Be deterministic.
- Detect cycles.
- Have bounded traversal.
- Return all reasons for effective upgrades.
- Avoid recursive renderer logic.

---

## 12. Competition types

The model should support at least:

- Domestic league.
- Domestic cup.
- Domestic league cup.
- Promotion playoff.
- Regional league.
- Reserve competition.
- Youth competition.
- Continental club competition.
- International senior competition.
- International youth competition.
- Qualification tournament.
- Super cup.
- Invitational tournament.
- Database-defined custom type.

Competition type affects default detail but must not alone determine it.

---

## 13. Default-detail policy

Defaults should derive from explicit rules.

Possible baseline:

```text
Playable competition                 Full
Cup attached to playable league      Full
Background top division              Standard
Background lower division            Results only
View-only competition                Results only
Dependency-only qualifier            Essential only
Reserve competition                  Standard or Results only
Youth competition                    Results only
Major continental competition        Standard
Other international competition      Results only
```

These rules should be represented as product configuration or database metadata.

```typescript
interface CompetitionDetailDefaultRule {
  readonly id: string;
  readonly priority: number;
  readonly predicate: CompetitionDetailPredicate;
  readonly defaultLevel: CompetitionDetailLevel;
  readonly explanationKey: string;
}
```

Rule evaluation must be deterministic, and conflicting rules must resolve by documented priority rather than source-file order.

---

## 14. Presets

Suggested presets:

### 14.1 Performance

- Playable competitions remain Full.
- Required supporting competitions use their minimum level.
- Most background competitions use Results only.
- Dependency-only competitions use Essential only.

### 14.2 Balanced

- Playable competitions remain Full.
- Major background leagues and continental competitions use Standard.
- Other visible competitions use Results only.

### 14.3 Detailed world

- Playable competitions use Full.
- Selected major competitions use Full.
- Most included competitions use Standard.
- Few competitions use Essential only.

### 14.4 Maximum permitted

- Every included competition uses its highest supported detail.
- This preset may trigger a strong performance warning.
- It must still respect hard engine limits.

### 14.5 Custom

The interface changes to `Custom` after any user edit that no longer matches a named preset.

### 14.6 Preset application preview

```text
Apply Balanced detail preset?

Full-detail competitions:       8 -> 10
Standard-detail competitions:  12 -> 18
Results-only competitions:     19 -> 13
Essential-only competitions:    4 -> 2

Expected speed: Fast -> Medium

[Cancel] [Apply Preset]
```

---

## 15. Apply-by-group workflow

The user may modify multiple competitions through a bulk editor.

### 15.1 Group criteria

Possible criteria:

- Current region.
- Selected nation.
- Competition type.
- Inclusion mode.
- Current detail level.
- Editable competitions only.
- Search results.
- Manually selected rows.

### 15.2 Bulk editor

```text
Apply Detail by Group

Target:
(o) All editable competitions in Europe
( ) Domestic cups in current search results
( ) 12 manually selected competitions

New level: Standard

Affected: 24 competitions
Skipped because locked: 8
Would be upgraded by dependency: 3

[Preview Changes] [Cancel] [Apply]
```

### 15.3 Atomic behavior

Bulk changes should be transactional:

- Validate the entire requested operation.
- Preview effective changes.
- Apply all valid changes together.
- Do not leave half-applied state after an error.
- Maintain one revision increment for the transaction.
- Support one-step undo during the current screen session if feasible.

---

## 16. Search and filtering

Search should match:

- Competition name.
- Nation name.
- Region name.
- Competition type.
- Localized alternative names.

Filters should include:

- Region.
- Nation.
- Type.
- Detail level.
- Editable or locked.
- Inclusion reason.
- Warning state.

When filters hide customized settings, show:

```text
7 customized competitions are hidden by current filters. [Show customized]
```

Search and filters must not alter the detail configuration.

---

## 17. Summary metrics

```typescript
interface CompetitionDetailEstimate {
  readonly fullDetailCompetitionCount: number;
  readonly standardDetailCompetitionCount: number;
  readonly resultsOnlyCompetitionCount: number;
  readonly essentialOnlyCompetitionCount: number;
  readonly estimatedFullMatchCountPerSeason: number;
  readonly estimatedSummaryMatchCountPerSeason: number;
  readonly estimatedResultsOnlyMatchCountPerSeason: number;
  readonly estimatedWorkingMemoryBytes: number;
  readonly estimatedInitialSaveBytes: number;
  readonly estimatedAnnualSaveGrowthBytes: number;
  readonly estimatedProcessingRating:
    "very_fast" | "fast" | "medium" | "slow" | "very_slow" | "unsupported";
  readonly confidence: "low" | "medium" | "high";
}
```

The summary should distinguish:

- Initial save size.
- Expected annual save growth.
- Working memory.
- Match-processing load.

These are different constraints and should not be merged into one generic performance value.

---

## 18. Cost breakdown

The cost-breakdown panel may show:

```text
Estimated seasonal processing contribution

Full match simulation                 58%
Standard match simulation             19%
Player-statistic retention             9%
Competition-history retention          6%
News and report generation             5%
Other                                  3%
```

Percentages are estimates and should total 100 percent after rounding adjustment.

The breakdown may also show the most expensive competitions:

```text
1. Exampleland Premier Division       High
2. Continental Champions Cup          High
3. North Republic First Division      Medium
```

Do not imply unusual precision when the estimator has low confidence.

---

## 19. Asynchronous estimation

Estimate recalculation must be:

- Debounced.
- Cancellable.
- Revision-aware.
- Nonblocking.
- Deterministic for identical inputs and system profiles.

```typescript
interface CompetitionDetailEstimateRequest {
  readonly configurationRevision: number;
  readonly leagueSelectionSnapshotId: string;
  readonly effectiveDetails: readonly EffectiveCompetitionDetail[];
  readonly systemProfile: SystemCapabilityProfile;
  readonly signal: AbortSignal;
}
```

Only an estimate whose revision matches current state may be displayed as current.

While updating:

```text
Updating performance estimate...
```

The last valid estimate may remain visible with a stale indicator.

---

## 20. Advanced rules

The Advanced Rules panel is optional and intended for experienced users.

Possible settings:

- Retain full match event timelines.
- Retain detailed lineups.
- Retain player ratings.
- Retain advanced team statistics.
- Retain competition-specific historical records.
- Generate match reports.
- Generate competition news.
- Process reserve competitions in detail.
- Process youth competitions in detail.

These settings should normally be profiles attached to detail levels, not arbitrary per-competition flags. Excessive independent flags create invalid combinations and make saved games difficult to migrate.

Recommended model:

```typescript
interface CompetitionDetailProfile {
  readonly id: string;
  readonly level: CompetitionDetailLevel;
  readonly processFullMatchEngine: boolean;
  readonly retainLineups: boolean;
  readonly retainEventTimeline: boolean;
  readonly retainPlayerRatings: boolean;
  readonly retainDetailedStatistics: boolean;
  readonly retainCompetitionHistory: boolean;
  readonly generateMatchReports: boolean;
  readonly generateNews: boolean;
}
```

If advanced overrides are allowed, validate them against a supported profile schema.

---

## 21. Statistical availability disclosure

Users must understand which data will exist later in the career.

Example detail comparison:

```text
Full
  Scores                    Yes
  League tables             Yes
  Lineups                   Yes
  Goalscorers               Yes
  Player ratings            Yes
  Detailed match events     Yes
  Advanced team statistics  Yes

Standard
  Scores                    Yes
  League tables             Yes
  Lineups                   Limited
  Goalscorers               Yes
  Player ratings            Limited
  Detailed match events     No
  Advanced team statistics  No

Results only
  Scores                    Yes
  League tables             Yes
  Lineups                   No
  Goalscorers               Optional
  Player ratings            No
  Detailed match events     No
```

Use a responsive comparison panel rather than a wide table if the viewport is narrow.

---

## 22. Validation rules

### 22.1 Minimum-level enforcement

Every effective level must meet the competition's minimum constraint.

### 22.2 Maximum-level enforcement

Some competitions may lack the data or simulation support needed for Full detail.

### 22.3 Dependency closure

All detail dependencies must resolve without missing entities or cycles.

### 22.4 Playable competition consistency

Every playable competition must use the level required by the gameplay model, normally Full.

### 22.5 Feature compatibility

Enabled global features must have sufficient data detail.

### 22.6 Resource hard limits

The effective configuration must remain within absolute engine or application limits.

### 22.7 Database fingerprint

The competition set and constraints must belong to the same validated database fingerprint as the prior league-selection snapshot.

### 22.8 Competition calendar validity

Detail settings must not alter scheduling logic or create different sporting outcomes by themselves unless the simulation model explicitly defines such behavior.

---

## 23. Warning examples

### 23.1 Performance warning

```text
This configuration is expected to process slowly on the current system.

Full-detail competitions: 37
Estimated full matches per season: 18,600
Estimated working memory: 7.1 GB

[Review Settings] [Continue Anyway]
```

### 23.2 Save growth warning

```text
Detailed match histories are expected to add approximately 480 MB to the
save file per season.
```

### 23.3 Reduced statistics warning

```text
Changing the Continental Cup to Results only means lineups, player ratings,
and detailed match events will not be retained.
```

### 23.4 Incomplete database coverage

```text
This competition supports Standard detail at most because its source data
does not contain complete squad-registration rules.
```

### 23.5 Blocking inconsistency

```text
Competition detail could not be resolved because a required qualifying
competition is unavailable.

[Return to League Selection] [View Diagnostic Details]
```

---

## 24. Continue behavior

Selecting `Continue` must:

1. Commit pending editor changes.
2. Resolve user intents into effective detail levels.
3. Apply minimum and maximum constraints.
4. Resolve dependency upgrades.
5. Validate the complete detail graph.
6. Recalculate or verify the latest estimate.
7. Require acknowledgment of current nonblocking warnings.
8. Create an immutable snapshot.
9. Persist the setup draft atomically.
10. Navigate to Database Size and Performance Options.

```typescript
interface CompetitionDetailSnapshot {
  readonly id: string;
  readonly databaseFingerprint: string;
  readonly leagueSelectionSnapshotId: string;
  readonly revision: number;
  readonly intents: readonly CompetitionDetailIntent[];
  readonly effectiveDetails: readonly EffectiveCompetitionDetail[];
  readonly estimate: CompetitionDetailEstimate;
  readonly acknowledgedWarningCodes: readonly string[];
  readonly createdAt: string;
}
```

`Continue` must be disabled immediately after activation to prevent duplicate submissions.

---

## 25. Back behavior and reconciliation

Selecting `Back` returns to League and Nation Selection while preserving the detail draft.

When the user returns after changing leagues, reconcile as follows:

```text
Unchanged competition       Restore prior user intent
New competition             Apply current default policy
Removed competition         Remove from effective configuration
Changed constraints         Clamp or upgrade to a valid level
Changed stable ID           Use explicit migration map only
```

If reconciliation changes settings, show a summary:

```text
Competition detail settings were updated after league selection changed.

Restored: 32
Added with defaults: 5
Removed: 3
Adjusted to new minimum: 2

[Review Changes]
```

Do not match competitions by similar display names.

---

## 26. State model

```typescript
interface CompetitionDetailScreenState {
  readonly databaseFingerprint: string;
  readonly leagueSelectionSnapshotId: string;
  readonly searchQuery: string;
  readonly regionFilterId: string | null;
  readonly nationFilterId: string | null;
  readonly competitionTypeFilter: string | null;
  readonly detailLevelFilter: CompetitionDetailLevel | null;
  readonly editabilityFilter: "all" | "editable" | "locked";
  readonly expandedGroupIds: readonly string[];
  readonly intents: readonly CompetitionDetailIntent[];
  readonly effectiveDetails: readonly EffectiveCompetitionDetail[];
  readonly issues: readonly CompetitionDetailIssue[];
  readonly estimate: CompetitionDetailEstimate | null;
  readonly estimateStatus: "idle" | "updating" | "ready" | "failed";
  readonly configurationRevision: number;
  readonly selectedPresetId: string | null;
  readonly submitting: boolean;
}
```

Renderer state should use serializable data and narrow validated messages across process boundaries.

---

## 27. State transitions

```text
LOADING_INPUT_SNAPSHOTS
  |
  v
RESOLVING_DEFAULTS
  |
  v
READY
  |
  +-- edit detail -----------> RESOLVING_EFFECTIVE_DETAIL
  |                                  |
  |                                  v
  |                            ESTIMATING_COST
  |                                  |
  |                                  v
  +-------------------------------- READY
  |
  +-- apply preset ----------> PREVIEWING_BULK_CHANGE
  |                                  |
  |                                  +-- cancel --> READY
  |                                  |
  |                                  +-- apply --> RESOLVING_EFFECTIVE_DETAIL
  |
  +-- Continue -------------> VALIDATING_SUBMISSION
                                     |
                                     +-- errors --> READY_WITH_ERRORS
                                     |
                                     +-- warnings --> AWAITING_WARNING_ACKNOWLEDGEMENT
                                     |
                                     +-- valid --> SUBMITTING
                                                     |
                                                     v
                                      DATABASE_SIZE_AND_PERFORMANCE
```

Estimate failure must not corrupt the detail configuration.

---

## 28. Commands and domain events

### 28.1 Commands

```text
SET_COMPETITION_DETAIL
SET_SEARCH_QUERY
SET_REGION_FILTER
SET_NATION_FILTER
SET_COMPETITION_TYPE_FILTER
SET_DETAIL_LEVEL_FILTER
SET_EDITABILITY_FILTER
EXPAND_GROUP
COLLAPSE_GROUP
APPLY_DETAIL_PRESET
PREVIEW_GROUP_CHANGE
APPLY_GROUP_CHANGE
RESTORE_DEFAULTS
OPEN_COST_BREAKDOWN
OPEN_LOCKED_SETTINGS
OPEN_ADVANCED_RULES
ACKNOWLEDGE_WARNING
REQUEST_BACK
REQUEST_CONTINUE
```

### 28.2 Domain events

```text
DETAIL_INTENT_CHANGED
DETAIL_DEPENDENCY_UPGRADED
DETAIL_DEPENDENCY_DOWNGRADED
EFFECTIVE_DETAIL_RESOLVED
DETAIL_ESTIMATE_STARTED
DETAIL_ESTIMATE_UPDATED
DETAIL_ESTIMATE_FAILED
DETAIL_VALIDATION_FAILED
DETAIL_SNAPSHOT_CREATED
SETUP_DRAFT_SAVED
```

---

## 29. Architecture and boundaries

The screen may depend on:

- Validated league-selection snapshot.
- Competition-detail query service.
- Default-policy evaluator.
- Detail dependency resolver.
- Detail validation service.
- Performance estimator.
- Setup-draft repository.
- Preset repository.
- Localization service.

It must not directly depend on:

- Match-engine implementation.
- Transfer AI.
- Tactical engine.
- Club finances.
- Player development.
- News-generation implementation.
- Final save-game serialization.

Recommended structure:

```text
Renderer
  |
  v
Competition Detail View Model
  |
  v
New Career Setup Application Service
  |
  +-- Default Policy Evaluator
  +-- Constraint Resolver
  +-- Dependency Resolver
  +-- Estimate Service
  +-- Validation Service
  +-- Draft Repository
  |
  v
Validated Setup Index and LeagueSelectionSnapshot
```

---

## 30. Keyboard interaction

Recommended behavior:

- `Tab` and `Shift+Tab`: move between major controls.
- `Up Arrow` and `Down Arrow`: move through visible competition rows.
- `Right Arrow`: expand a group or open the level selector.
- `Left Arrow`: close the selector or collapse a group.
- `Space`: select a row for bulk editing where supported.
- `Enter`: edit the focused competition or activate a control.
- `Home` and `End`: move to first or last visible row.
- `Page Up` and `Page Down`: move by viewport.
- `Ctrl+F`: focus search.
- `Escape`: close open selector, close panel, clear search, or navigate Back in that order.

Changing a detail level must preserve logical focus on the same competition row.

---

## 31. Accessibility requirements

### 31.1 Competition browser semantics

Expose the browser as an accessible tree grid or grouped list.

Each row communicates:

- Competition name.
- Competition type.
- Geographic scope.
- Current detail level.
- Editable or locked state.
- Required minimum.
- Inclusion reason.
- Warning state.

Example accessible label:

```text
Exampleland Premier Division, domestic league, Full detail, locked,
required because the competition is playable.
```

### 31.2 Live updates

Use polite announcements for meaningful changes:

```text
Continental Cup changed to Full detail.
Three domestic leagues were increased to Standard detail.
Expected processing speed changed to Slow.
```

Avoid announcing every number in the summary after each edit.

### 31.3 Locked control behavior

Locked controls remain discoverable but do not masquerade as editable. Their reason must be available without relying on pointer hover.

### 31.4 Dialog and panel focus

- Opening a preview moves focus into it.
- Cancel restores focus to the invoking control.
- Applying a change returns focus to the affected group or first changed row.
- Submission errors focus an error summary with links to affected competitions.

### 31.5 Visual requirements

- Do not use color alone for detail levels.
- Support high contrast.
- Support reduced motion.
- Support 200 percent text scaling.
- Keep focus visible.
- Ensure warning icons have text equivalents.

---

## 32. Localization requirements

- Localize every visible label and explanation.
- Use database-provided localized competition names when available.
- Keep stable IDs language-independent.
- Support right-to-left layout.
- Apply locale-aware sorting and search.
- Localize counts, file sizes, percentages, and duration estimates.
- Allow long competition names to wrap or expose their full value accessibly.
- Do not concatenate translated fragments to create dependency explanations.

Use complete localized message templates:

```text
{competitionName} requires at least {detailLevel} because {reason}.
```

---

## 33. Responsive behavior

### Wide desktop

Use a two-column layout with a sticky summary.

### Standard desktop

Reduce summary width before compressing competition names.

### Narrow desktop

Move the summary below the browser or into an accessible drawer.

### High text scale

- Let toolbar controls wrap.
- Keep each row's name and level readable.
- Move secondary metadata to a second line.
- Keep footer actions reachable.
- Avoid horizontal scrolling for ordinary form controls.

### Ultrawide display

Use maximum content widths. Do not stretch row labels excessively.

---

## 34. Performance requirements

The screen must remain responsive with thousands of competitions in a custom database.

Requirements:

- Virtualize large grouped lists.
- Load expensive row details on demand.
- Preserve stable row keys.
- Avoid full-tree reconstruction after one edit.
- Batch dependency-resolution updates.
- Cancel stale estimates.
- Bound graph traversal.
- Prevent repeated preset evaluation during rendering.
- Keep filtering off the critical interaction path where possible.

Suggested engineering targets:

- Immediate visual feedback within 100 milliseconds.
- Search update beginning within approximately 150 milliseconds.
- Smooth scrolling while estimates run.
- Visible submission progress immediately after Continue.

---

## 35. Persistence rules

The setup draft may retain:

- Explicit detail intents.
- Selected preset.
- Expanded groups.
- Filters and search for the current setup session.
- Acknowledged warnings tied to a revision.
- Last valid estimate and its input fingerprint.

It must not treat as valid:

- Intents for unknown competitions.
- Estimates from another league-selection snapshot.
- Constraint results from another database fingerprint.
- Warning acknowledgments after relevant settings change.
- Partially written bulk edits.

Draft writes should be atomic where supported.

---

## 36. Security requirements

Competition names, descriptions, presets, and database metadata are untrusted.

Protect against:

- Script and markup injection.
- Overlong labels.
- Invalid Unicode.
- Bidirectional-control abuse.
- Unknown competition IDs.
- Forged detail levels.
- Malicious preset payloads.
- Excessive group depth.
- Dependency cycles.
- Resource-exhaustion requests.
- Renderer command tampering.

Rules:

1. Render labels as text.
2. Validate commands in a trusted process.
3. Resolve by stable IDs.
4. Reject detail levels not allowed by the schema.
5. Recompute constraints outside the renderer.
6. Bound bulk-edit size.
7. Validate preset schemas and fingerprints.
8. Revalidate before snapshot creation.
9. Never trust renderer-supplied estimates.
10. Avoid exposing private filesystem details in diagnostics.

---

## 37. Error and empty states

### No editable competitions

```text
All included competitions already use mandatory detail settings.

You can review the configuration and continue.
```

### No filter results

```text
No competitions match the current search and filters.

[Clear Filters]
```

### Estimate unavailable

```text
The performance estimate is temporarily unavailable.

Your competition settings are preserved.

[Retry Estimate]
```

### Preset incompatible

```text
This preset was created for a different competition scope.

No changes were made.

[View Differences] [Close]
```

### Detail resolver failure

```text
Competition detail could not be resolved.

Diagnostic reference: DETAIL-RESOLVE-2041

[Return to Settings] [Copy Diagnostic Summary]
```

### Draft persistence failure

Keep state in memory, provide Retry, and do not claim it was saved.

---

## 38. Edge cases

### Competition added after returning from Screen 3

Apply the current default policy and mark it as newly added.

### Competition removed after returning from Screen 3

Remove its effective setting while retaining no dangling dependency reason.

### Minimum detail increases after a data-pack change

Upgrade the effective level and explain the adjustment.

### Competition supports no selected preset level

Clamp to its nearest permitted level and include it in the preset preview.

### Estimate result arrives late

Discard it when its revision or snapshot ID is stale.

### User edits while bulk preview is open

Either suspend background edits or invalidate and close the preview. Do not apply a preview against changed source state.

### Shared dependency loses one dependant

Retain the upgrade while another dependency reason exists.

### All customized rows hidden by filters

Show a persistent hidden-customization notice.

### Application closes during bulk apply

Write no partial draft. Restore the prior valid revision on restart.

### Very large match calendar

Use bounded integer types and detect overflow in estimates.

---

## 39. Acceptance criteria

The screen is complete when:

1. Every included competition is represented from the validated prior snapshot.
2. Availability, playability, and detail are clearly distinguished.
3. Playable competitions enforce their mandatory minimum detail.
4. Editable competitions expose only valid levels.
5. Locked settings expose clear reasons.
6. User intent and effective detail are modeled separately.
7. Dependency upgrades are deterministic and explainable.
8. Shared dependency reasons are reference-safe.
9. Search and filtering never mutate hidden settings.
10. Preset and group operations provide an accurate preview.
11. Bulk edits are transactional.
12. Resource estimates are asynchronous, cancellable, and revision-aware.
13. Stale estimates cannot overwrite current values.
14. Summary metrics distinguish memory, save size, annual growth, and processing load.
15. Invalid configurations cannot continue.
16. Warning acknowledgment is invalidated by relevant changes.
17. Continue creates one immutable validated snapshot.
18. Duplicate submission is prevented.
19. Back navigation preserves and reconciles the draft safely.
20. Keyboard and assistive-technology users can inspect and edit every permitted setting.
21. Large custom databases remain usable through virtualization and bounded processing.
22. Untrusted database and preset text cannot execute markup or code.
23. No original proprietary interface assets or database content are required.

---

## 40. Recommended tests

### Unit tests

- Detail-level ordering.
- Minimum and maximum clamping.
- Editable-state derivation.
- Default-policy priority.
- User-intent preservation.
- Effective-detail calculation.
- Dependency upgrade.
- Shared dependency removal.
- Cycle detection.
- Preset matching.
- Warning-acknowledgment invalidation.
- Revision increment behavior.
- Snapshot validation.

### Integration tests

- Open from a valid league-selection snapshot.
- Edit one background competition.
- Reject reduction of a playable league.
- Upgrade a continental competition and propagate dependencies.
- Remove the upgrade and restore requested levels.
- Apply each built-in preset.
- Apply a group change transactionally.
- Restore defaults.
- Continue with no warnings.
- Continue after warning acknowledgment.
- Return from Screen 5 and restore state.
- Return to Screen 3, change leagues, and reconcile settings.
- Reject a mismatched database fingerprint.

### Concurrency tests

- Change detail repeatedly during estimation.
- Apply a preset while an estimate is running.
- Open a bulk preview, then invalidate its revision.
- Press Continue twice rapidly.
- Navigate Back during estimation.
- Close during draft persistence.

### Security tests

- Markup-like competition names.
- Oversized localized labels.
- Invalid Unicode and bidirectional controls.
- Unknown competition ID.
- Forged detail level.
- Malicious preset with excessive entries.
- Cyclic dependency graph.
- Excessively deep grouping metadata.
- Tampered renderer estimate.
- Forged snapshot ID.

### Accessibility tests

- Keyboard-only editing.
- Locked-row reason discovery.
- Group expansion and collapse.
- Detail-selector announcement.
- Dependency-preview focus management.
- Error-summary navigation.
- Hidden-customization notice.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long translated competition names.

### Visual regression tests

Capture at least:

- Default Balanced preset.
- Performance preset.
- Detailed World preset.
- Locked playable competitions.
- Mixed editable detail levels.
- Dependency upgrade indicators.
- Bulk-change preview.
- Cost breakdown.
- Slow-performance warning.
- Blocking validation issue.
- No editable competitions.
- No search results.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 41. Condensed LLM implementation brief

```text
Implement a desktop Competition Detail Selection screen for an original
football-management simulation's new-career workflow.

The screen receives a validated LeagueSelectionSnapshot and displays every
included competition. It must clearly separate competition availability,
playability, and simulation detail. Users may change detail only where
constraints permit. Supported normalized levels are Full, Standard,
Results Only, and Essential Only.

Playable competitions normally require Full detail. Other competitions
declare minimum and maximum permitted levels through validated metadata.
Locked rows remain accessible and explain every lock reason. The renderer
must not derive constraints itself.

Maintain separate CompetitionDetailIntent and EffectiveCompetitionDetail
models. Preserve the user's requested level when dependencies temporarily
upgrade the effective level. If dependency requirements are removed,
restore the still-valid requested level.

Resolve detail dependencies deterministically in a trusted application
layer using stable IDs. Support shared dependency reasons, bounded graph
traversal, and cycle detection. Preview large propagated changes before
application.

Provide searchable, filterable, virtualized competition groups and presets
for Performance, Balanced, Detailed World, and Maximum Permitted. Support
transactional apply-by-group operations with accurate affected, skipped,
and dependency-upgraded counts.

Show separate estimates for full-detail matches, summary matches, working
memory, initial save size, annual save growth, and processing-speed rating.
Estimation must be asynchronous, cancellable, debounced, and tied to a
configuration revision. Discard stale results.

On Continue, commit pending edits, resolve constraints and dependencies,
validate resource limits and snapshot compatibility, verify the current
estimate, acknowledge current warnings, create one immutable
CompetitionDetailSnapshot, atomically persist the setup draft, and navigate
to Database Size and Performance Options. Prevent duplicate submission.

Support keyboard operation, accessible tree-grid semantics, visible focus,
lock-reason discovery, live-region summaries, high text scaling,
localization, and right-to-left layouts. Treat database labels and presets
as untrusted input. Do not copy proprietary artwork, exact interface text,
source code, logos, or databases.
```

---

## 42. Next planned item

**Screen 5: New Game, Database Size and Performance Options** should define player-database scope, reputation and geographic loading rules, generated-player policies, memory and save-size budgets, performance recommendations, advanced simulation settings, final setup validation, and transition to manager creation.

---

## Suggested Git commit

```text
feat(docs): specify competition detail selection screen
```
