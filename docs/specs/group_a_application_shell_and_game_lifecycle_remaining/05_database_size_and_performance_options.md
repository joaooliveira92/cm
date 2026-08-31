# Screen 5: New Game, Database Size and Performance Options

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, source code, databases, logos, exact interface wording, or other protected assets. Use an original visual system and fictional or properly licensed football data.

---

## 1. Purpose

The **Database Size and Performance Options** screen controls how many football entities are loaded into the career and how much simulation work the game performs outside the competitions configured on Screens 3 and 4.

It appears after **Competition Detail Selection** and before **Manager Creation**.

The screen must let the user:

- Choose a player and staff database scope.
- Understand the distinction between competition scope and person-database scope.
- Include additional players through explicit geographic, nationality, club, and reputation rules.
- Configure generated-player and generated-staff policies where supported.
- Review estimated memory use, initial save size, annual save growth, processing speed, and world-generation time.
- Select a preset appropriate for the current computer.
- Configure an application memory budget without embedding assumptions in formulas or code.
- Detect redundant, conflicting, or ineffective loading rules.
- Review which people and clubs are guaranteed, conditionally included, or excluded.
- Validate the complete new-career setup before advancing to manager creation.
- Produce an immutable database-scope snapshot.

This screen configures the **population and performance envelope** of the career. It does not select the user's manager identity or club.

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
    | Valid CompetitionDetailSnapshot
    v
Database Size and Performance Options
    |
    | Valid DatabaseScopeSnapshot
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

The screen receives validated snapshots from the previous setup stages. It must reject stale or incompatible inputs rather than guessing how to reconcile them.

---

## 3. Core concepts

### 3.1 Competition scope

Competition scope determines which leagues and cups exist, whether they are playable, and how deeply they are simulated.

It was configured on Screens 3 and 4.

### 3.2 Person database scope

Person database scope determines which players and staff are instantiated as persistent career entities.

A person may be loaded even if their domestic league is not playable. For example:

- A prominent international player based in an unloaded nation.
- A player eligible for a national team relevant to a selected competition.
- A free agent.
- A staff member with sufficiently high reputation.
- A player selected by an explicit custom loading rule.

### 3.3 Guaranteed person

A guaranteed person is loaded because the selected competition and club scope cannot operate correctly without them.

Examples:

- Registered players at clubs in playable divisions.
- Required first-team staff at manageable clubs.
- Players participating in a fully simulated competition.
- Officials or staff required by competition rules.

Guaranteed people cannot be removed by choosing a smaller database preset.

### 3.4 Conditional person

A conditional person is loaded when one or more optional rules match.

Examples:

- Players based in a selected region.
- Players of selected nationalities.
- Players with reputation above a configured threshold.
- Players contracted to clubs in background leagues.
- Current senior internationals.

### 3.5 Excluded person

An excluded person does not become a persistent detailed career entity at world creation.

The game may still retain aggregate, placeholder, or historical references when required for consistency.

### 3.6 Database-size preset

A database-size preset is a curated policy for optional population loading. It is not merely a fixed player-count limit.

Recommended presets:

- Minimal.
- Small.
- Medium.
- Large.
- Extensive.
- Custom.

Preset behavior should adapt to the selected competitions and database contents.

### 3.7 Loading rule

A loading rule includes or excludes people matching explicit criteria.

Rules must be deterministic, inspectable, and validated before world generation.

### 3.8 Generated person

A generated person is created by the simulation to fill a legitimate world requirement when permitted by game policy.

Generated people must be visibly distinguishable in diagnostics, but they should behave as ordinary fictional career entities in gameplay.

---

## 4. Conceptual desktop layout

```text
+--------------------------------------------------------------------------------+
| NEW CAREER                     Step 4 of 6: Database and Performance           |
|--------------------------------------------------------------------------------|
| Database preset: [Medium v]        System recommendation: Medium               |
|--------------------------------------------------------------------------------|
| DATABASE SCOPE                                  | PERFORMANCE SUMMARY          |
|                                                 |                              |
| Guaranteed by selected leagues                  | Estimated players: 34,200    |
|   Players: 22,800                               | Estimated staff: 8,700       |
|   Staff: 6,100                                  | Active clubs: 740            |
|                                                 |                              |
| Optional loading rules                          | Working memory: 3.2 GB       |
| [x] Current senior internationals worldwide     | Initial save: 410 MB         |
| [x] High-reputation players worldwide           | Annual growth: 190 MB        |
| [ ] Players of selected nationalities           | World generation: 3-6 sec    |
| [ ] Players based in selected regions           | Expected speed: Medium       |
| [ ] Players from selected clubs                  |                             |
|                                                 | Budget: 4.0 GB               |
| [+ Add Loading Rule]                            | [==========---] 80%          |
|                                                 |                              |
| Generated-person policy                         | [View Estimate Details]      |
| [Generate only when required v]                 | [View Inclusion Breakdown]   |
|--------------------------------------------------------------------------------|
| [Back] [Restore Recommended] [Advanced Options] [Review Setup]       [Continue]|
+--------------------------------------------------------------------------------+
```

This diagram defines hierarchy and behavior, not exact visual styling or pixel positions.

---

## 5. Screen regions

### 5.1 Header

The header displays:

- Workflow name.
- Current setup stage.
- Database name and version.
- Current database-size preset.
- Back navigation.

### 5.2 Preset selector

The preset selector provides the primary simplified choice.

```text
Database preset: Medium
Recommended for this configuration: Medium
```

Changing the preset updates optional loading rules but never removes guaranteed entities.

### 5.3 Database-scope editor

The editor contains:

- Guaranteed population summary.
- Default optional rules from the selected preset.
- User-created loading rules.
- Generated-person policy.
- Staff-loading policy.
- Advanced settings entry point.

### 5.4 Performance summary

The summary displays the effective setup costs after all prior screens and current rules are resolved.

### 5.5 Footer actions

Recommended actions:

- `Back`
- `Restore Recommended`
- `Advanced Options`
- `Review Setup`
- `Continue`

`Continue` remains disabled while any blocking issue exists.

---

## 6. Initial state

When this screen first opens:

1. Verify the database fingerprint.
2. Verify the LeagueSelectionSnapshot.
3. Verify the CompetitionDetailSnapshot.
4. Compute the guaranteed population.
5. Select a recommended preset based on the complete setup and current system profile.
6. Resolve default optional rules.
7. Start an asynchronous performance estimate.
8. Display recommendations and warnings.

If the user previously configured this screen for the same input fingerprints, restore the draft and label the preset `Custom` when appropriate.

---

## 7. Preset specification

### 7.1 Minimal

Intended for constrained systems or quick test careers.

Typical policy:

- Load all guaranteed players and staff.
- Load only essential free agents.
- Load internationally active people only when required.
- Avoid broad geographic additions.
- Generate people only to satisfy hard squad and staffing requirements.

### 7.2 Small

Typical policy:

- Guaranteed population.
- Limited free-agent pool.
- Selected high-reputation people.
- Senior internationals relevant to active nations.
- Modest reserve population for transfers.

### 7.3 Medium

Typical policy:

- Guaranteed population.
- Broader transfer-market population.
- Current senior internationals worldwide.
- High-reputation players and staff worldwide.
- Additional people in selected regions.
- Sufficient depth for long-term squad movement.

### 7.4 Large

Typical policy:

- Broad global transfer market.
- More background-league squads.
- Wider nationality coverage.
- Larger free-agent and staff pools.
- Greater historical and statistical continuity.

### 7.5 Extensive

Typical policy:

- Maximum broadly useful population supported by the database and engine limits.
- Large worldwide player and staff pools.
- Extensive background club coverage.
- Higher memory use and save growth.

This preset is not necessarily equivalent to loading every database record.

### 7.6 Custom

The configuration becomes Custom when explicit settings no longer match a named preset.

### 7.7 Preset definition

```typescript
interface DatabaseSizePreset {
  readonly id: string;
  readonly displayNameKey: string;
  readonly descriptionKey: string;
  readonly ruleTemplateIds: readonly string[];
  readonly generatedPersonPolicyId: string;
  readonly staffLoadingPolicyId: string;
  readonly recommendedBudgetMultiplier: number;
  readonly priority: number;
}
```

Preset values must come from configuration cells or strongly typed settings, not hidden numeric literals inside calculations.

---

## 8. Guaranteed population section

This section is read-only and explains what previous setup choices already require.

Example:

```text
Guaranteed by selected competitions

Players at playable clubs                  18,640
Players at full-detail background clubs     3,210
Required free agents                          540
Required national-team participants           410

Staff at playable clubs                     4,980
Competition-required staff                    220
Officials and support roles                   900
```

Counts are estimates until world generation completes.

The section should include a `Why are these included?` action.

---

## 9. Optional loading rules

### 9.1 Rule categories

Supported categories may include:

- Based in nation.
- Based in region.
- Nationality.
- Second nationality.
- Club.
- Club division or competition.
- Current senior international.
- Current youth international.
- Reputation band.
- Age band.
- Contract status.
- Player position.
- Staff role.
- Database tag.

The product should expose only rules that have a clear gameplay purpose and can be estimated reliably.

### 9.2 Rule model

```typescript
interface PersonLoadingRule {
  readonly id: string;
  readonly entityType: "player" | "staff" | "both";
  readonly action: "include" | "exclude";
  readonly matchMode: "all" | "any";
  readonly criteria: readonly PersonLoadingCriterion[];
  readonly priority: number;
  readonly source: "preset" | "user" | "restored";
  readonly enabled: boolean;
}
```

```typescript
type PersonLoadingCriterion =
  | { readonly type: "based_in_nation"; readonly nationIds: readonly string[] }
  | { readonly type: "based_in_region"; readonly regionIds: readonly string[] }
  | { readonly type: "nationality"; readonly nationIds: readonly string[] }
  | { readonly type: "club"; readonly clubIds: readonly string[] }
  | { readonly type: "reputation_at_least"; readonly thresholdId: string }
  | {
      readonly type: "age_range";
      readonly minimum: number;
      readonly maximum: number;
    }
  | { readonly type: "contract_status"; readonly values: readonly string[] }
  | { readonly type: "international_status"; readonly value: string }
  | { readonly type: "staff_role"; readonly roleIds: readonly string[] }
  | { readonly type: "database_tag"; readonly tagIds: readonly string[] };
```

Thresholds should reference configured threshold identifiers rather than embedding arbitrary reputation numbers in UI logic.

### 9.3 Rule row

```text
[x] Include players who are current senior internationals worldwide
    Estimated additional people: 1,850
    Added by: Medium preset
    [Edit] [Disable]
```

### 9.4 Add Loading Rule

The rule editor should be a guided workflow:

```text
Add Loading Rule

Include: [Players v]
Where:   [Nationality v]
Value:   [Select one or more nations...]
And:     [Reputation band v] [National or higher v]

Estimated additional people: Calculating...

[Cancel] [Add Rule]
```

### 9.5 Rule preview

Before committing a rule, show:

- Estimated new people.
- Already included people.
- Potential duplicates.
- Affected nations and clubs.
- Estimated memory impact.
- Estimate confidence.

### 9.6 Duplicate rules

If a new rule is equivalent to an existing rule:

```text
An equivalent loading rule already exists.

[Go to Existing Rule] [Cancel]
```

### 9.7 Redundant rules

A rule is redundant when every matching person is already guaranteed or covered by a broader rule.

Redundant rules may remain visible but should be identified:

```text
This rule currently adds no people because all matches are already included.
```

---

## 10. Inclusion and exclusion precedence

The system needs deterministic precedence.

Recommended order:

```text
1. Hard engine requirements
2. Guaranteed competition population
3. Required dependency population
4. Explicit safety and content exclusions
5. User exclusion rules
6. User inclusion rules
7. Preset inclusion rules
8. Default population policy
```

However, user exclusions must never remove hard-required people.

Example:

```text
The exclusion rule cannot remove 42 players because their clubs are in a
playable competition.
```

```typescript
interface PersonInclusionReason {
  readonly personId: string;
  readonly effectiveIncluded: boolean;
  readonly winningReasonCode: string;
  readonly contributingRuleIds: readonly string[];
  readonly blockedRuleIds: readonly string[];
}
```

The full per-person reason graph may be calculated lazily rather than retained in renderer memory.

---

## 11. Reputation-based loading

Reputation rules should use named bands.

Example bands:

```text
Worldwide
Continental
National
Regional
Local
Unknown or unestablished
```

The mapping from database reputation values to bands belongs to validated domain configuration.

The UI should explain scope:

```text
Include players with National reputation or higher worldwide.
```

Reputation is dynamic during a career, but the loading decision occurs from the initial database state unless product policy says otherwise.

---

## 12. Geographic loading

### 12.1 Based in nation

Loads people currently attached to clubs or football organizations in selected nations.

### 12.2 Nationality

Loads people holding selected nationalities regardless of current location.

### 12.3 Region

Loads people based in or originating from a database-defined region according to the chosen criterion.

The UI must not conflate `based in` with `nationality`.

Example:

```text
Include players based in West Region
```

is different from:

```text
Include players with a nationality from West Region
```

### 12.4 Multiple nationality

The rule editor should specify whether second nationalities count.

```text
Nationality matching:
(o) Primary nationality only
( ) Any eligible nationality
```

---

## 13. Club and competition loading

A custom rule may load people from:

- Specific clubs.
- Clubs in a competition.
- Clubs in a nation.
- Professional clubs.
- Clubs above a configured reputation band.

Selecting a club-loading rule must not make its league playable.

Example disclosure:

```text
Players at these clubs will be loaded, but their domestic competition
will remain background-only.
```

If a selected club disappears after a database or content-pack change, the rule becomes invalid rather than matching by name.

---

## 14. Free-agent population

The system may expose a policy for unattached players and staff.

Suggested choices:

```text
Free-agent pool:
  Essential only
  Limited
  Balanced
  Broad
```

Each policy defines explicit criteria such as:

- Reputation bands.
- Age bands.
- Recent professional activity.
- National-team status.
- Relevance to active nations.

Avoid random arbitrary truncation unless it uses a documented deterministic seed and stable ordering.

---

## 15. Staff-loading policy

Player-loading and staff-loading needs differ.

Suggested settings:

```text
Staff database:
  Required staff only
  Active leagues and notable staff
  Broad worldwide staff market
  Custom
```

Staff categories may include:

- Managers.
- Assistant managers.
- Coaches.
- Goalkeeping coaches.
- Fitness coaches.
- Scouts.
- Physios or medical staff.
- Directors and executives where modeled.
- Officials where modeled as persistent people.

Staff loading should preserve enough candidates for vacancies at active clubs.

---

## 16. Generated-player policy

Suggested policies:

```typescript
type GeneratedPersonPolicy =
  | "disabled_except_hard_requirements"
  | "generate_only_when_required"
  | "maintain_squad_depth"
  | "maintain_world_population";
```

### 16.1 Disabled except hard requirements

Generate only when the simulation cannot start or continue legally without additional people.

### 16.2 Generate only when required

Generate people for missing squad, registration, staffing, or competition requirements.

### 16.3 Maintain squad depth

Maintain minimum viable squad and staff depth for relevant clubs.

### 16.4 Maintain world population

Maintain a broader target population over time according to nation, club, and development policies.

### 16.5 Disclosure

The UI should explain that generated people are fictional and may affect long-term transfer-market depth.

### 16.6 Determinism

Generation must be deterministic for identical:

- Database fingerprint.
- Setup snapshots.
- Random seed.
- Engine version.
- Generation-policy version.

---

## 17. Generated-person configuration

Advanced settings may include:

- Minimum active player population by club category.
- Minimum staff candidates by role.
- Youth-intake policy.
- Retired-person replacement policy.
- Nationality distribution policy.
- Name-pool selection.
- Attribute-generation profile.

These should normally be policy references rather than raw user-entered values.

```typescript
interface GeneratedPersonConfiguration {
  readonly policyId: string;
  readonly minimumSquadProfileId: string;
  readonly staffSupplyProfileId: string;
  readonly youthIntakeProfileId: string;
  readonly replacementProfileId: string;
  readonly generationSeedPolicy: "career_seed" | "explicit_seed";
}
```

---

## 18. Memory budget

The screen may allow an explicit application working-memory budget.

```text
Memory budget: [4.0 GB v]
Recommended maximum: 4.8 GB
Estimated use: 3.2 GB
```

### 18.1 Budget source

The budget should derive from:

- User configuration.
- Application architecture limits.
- Available physical memory.
- Operating-system constraints.
- Product safety margin.

### 18.2 No hardcoded formula values

All safety margins, multipliers, reserve amounts, and thresholds must live in named configuration values.

Example:

```typescript
interface MemoryBudgetPolicy {
  readonly operatingSystemReserveBytes: number;
  readonly applicationFixedOverheadBytes: number;
  readonly safetyMarginRatio: number;
  readonly maximumAddressableBytes: number;
  readonly warningUtilizationRatio: number;
  readonly blockingUtilizationRatio: number;
}
```

The estimator references these fields. It must not embed numeric assumptions inside formulas.

### 18.3 Budget state

```text
Within budget
Near budget
Over recommended budget
Over hard limit
Estimate unavailable
```

Color may reinforce these states but must not be the only indicator.

---

## 19. Storage and save growth

The summary should distinguish:

- Initial world-generation temporary storage.
- Initial save-file size.
- Estimated annual save growth.
- Autosave retention footprint.
- Cache footprint.

Example:

```text
Initial save estimate:              410 MB
Expected annual growth:             190 MB
Three rotating autosaves after year 1: approximately 1.8 GB
Temporary generation space:         1.1 GB
```

Autosave footprint depends on later preferences and should be labeled as provisional if not yet configured.

---

## 20. Performance estimate

```typescript
interface DatabasePerformanceEstimate {
  readonly guaranteedPlayerCount: number;
  readonly optionalPlayerCount: number;
  readonly generatedInitialPlayerCount: number;
  readonly guaranteedStaffCount: number;
  readonly optionalStaffCount: number;
  readonly generatedInitialStaffCount: number;
  readonly persistentClubCount: number;
  readonly estimatedWorkingMemoryBytes: number;
  readonly estimatedPeakGenerationMemoryBytes: number;
  readonly estimatedInitialSaveBytes: number;
  readonly estimatedAnnualSaveGrowthBytes: number;
  readonly estimatedTemporaryStorageBytes: number;
  readonly estimatedWorldGenerationDurationRangeMs?: {
    readonly minimum: number;
    readonly maximum: number;
  };
  readonly expectedProcessingRating:
    "very_fast" | "fast" | "medium" | "slow" | "very_slow" | "unsupported";
  readonly confidence: "low" | "medium" | "high";
}
```

Do not expose false precision. Use ranges and categorical ratings.

---

## 21. Asynchronous estimation

Estimate calculation must be:

- Debounced.
- Cancellable.
- Revision-aware.
- Nonblocking.
- Reproducible for identical inputs.

```typescript
interface DatabaseEstimateRequest {
  readonly configurationRevision: number;
  readonly databaseFingerprint: string;
  readonly leagueSelectionSnapshotId: string;
  readonly competitionDetailSnapshotId: string;
  readonly effectiveRules: readonly EffectiveLoadingRule[];
  readonly generatedPersonConfiguration: GeneratedPersonConfiguration;
  readonly memoryBudgetPolicyId: string;
  readonly systemProfile: SystemCapabilityProfile;
  readonly signal: AbortSignal;
}
```

An estimate can update the UI only when all snapshot IDs and the revision remain current.

---

## 22. Inclusion breakdown

The `View Inclusion Breakdown` panel explains population composition.

```text
Estimated player population

Guaranteed by playable clubs         18,640
Guaranteed by full-detail scope       4,160
Current senior internationals         1,850
High-reputation worldwide             3,420
Regional loading rules                4,980
Free-agent policy                       760
Generated at startup                    390
Duplicate matches removed            -2,310
                                      ------
Estimated unique players             31,890
```

The breakdown must avoid double-counting.

If rounded values do not sum exactly, include a rounding note rather than changing hidden totals.

---

## 23. Rule effectiveness

Each rule should expose:

- Estimated matches.
- Estimated unique additions.
- People already included elsewhere.
- Memory contribution.
- Confidence.

Example:

```text
Current senior internationals worldwide

Matches: approximately 2,140
Already guaranteed: approximately 290
Unique additions: approximately 1,850
Estimated memory contribution: 120 MB
Confidence: High
```

This helps the user remove expensive low-value rules.

---

## 24. Advanced performance options

Optional settings may include:

- Background transfer-market breadth.
- Retained person-history depth.
- Retired-person retention.
- Inactive-club squad abstraction.
- Scouting knowledge precomputation.
- Search-index precomputation.
- Match-history retention profile.
- News-history retention profile.
- Save compression profile.
- Autosave compatibility estimate.

These settings should use named profiles.

```typescript
interface AdvancedDatabaseOptions {
  readonly backgroundTransferProfileId: string;
  readonly personHistoryRetentionProfileId: string;
  readonly retiredPersonRetentionProfileId: string;
  readonly inactiveClubModelProfileId: string;
  readonly scoutingKnowledgeProfileId: string;
  readonly searchIndexProfileId: string;
  readonly saveCompressionProfileId: string;
}
```

Do not expose implementation-specific toggles that users cannot understand.

---

## 25. Retention policies

### 25.1 Person history

Controls how much pre-career and in-career person history is retained.

### 25.2 Retired people

Controls whether retired players and staff remain as browsable historical entities after leaving football.

### 25.3 Inactive clubs

Controls whether clubs outside the active competition scope maintain detailed squads or summarized populations.

### 25.4 Search indexes

Controls whether broad search indexes are built during world generation or lazily later.

These policies affect memory, save size, and navigation speed differently. Their tradeoffs must be disclosed.

---

## 26. Recommended configuration

The recommendation service should consider:

- Selected playable leagues.
- Competition detail settings.
- Current system profile.
- Application memory limit.
- Database entity counts.
- Desired processing-speed target.
- Storage availability.
- Product safety policy.

```typescript
interface DatabaseConfigurationRecommendation {
  readonly presetId: string;
  readonly memoryBudgetPolicyId: string;
  readonly generatedPersonPolicyId: string;
  readonly reasons: readonly RecommendationReason[];
  readonly expectedEstimate: DatabasePerformanceEstimate;
  readonly confidence: "low" | "medium" | "high";
}
```

Example explanation:

```text
Medium is recommended because the career includes eight playable divisions,
twelve Standard-detail competitions, and the current application memory
budget is 4 GB.
```

---

## 27. Restore Recommended behavior

Selecting `Restore Recommended`:

1. Recomputes the recommendation from current prior-screen snapshots.
2. Previews the changes.
3. Identifies user rules that will be removed or disabled.
4. Applies the recommendation transactionally after user activation.
5. Increments the configuration revision once.
6. Starts a new estimate.

Preview:

```text
Restore recommended database configuration?

Preset: Custom -> Medium
User loading rules removed: 3
Generated-person policy: Maintain world population -> Generate when required
Expected memory: 5.6 GB -> 3.2 GB
Expected speed: Slow -> Medium

[Cancel] [Restore Recommended]
```

---

## 28. Review Setup

The Review Setup screen or panel summarizes all new-career choices so far.

```text
Database
  Fictional World 2003/04, version 1.0.0

Leagues
  3 playable nations
  8 playable divisions
  4 background nations

Competition detail
  8 Full
  12 Standard
  19 Results only
  4 Essential only

Population
  Approximately 34,200 players
  Approximately 8,700 staff
  Generated only when required

Performance
  Expected speed: Medium
  Working memory: approximately 3.2 GB
  Initial save: approximately 410 MB
```

Each section should link back to its editor.

---

## 29. Validation rules

### 29.1 Snapshot compatibility

All incoming snapshots must share the same database fingerprint.

### 29.2 Guaranteed population

The configuration must retain every hard-required and competition-required person.

### 29.3 Rule validity

Every enabled rule must reference valid criteria, stable IDs, and supported operators.

### 29.4 Rule bounds

Age ranges, priority values, and list sizes must remain within configured limits.

### 29.5 Generated-person viability

The selected generation policy must satisfy the minimum world requirements.

### 29.6 Memory limit

Estimated peak usage must remain below hard engine and address-space limits.

### 29.7 Storage viability

Available storage must be sufficient for required temporary generation files and the first safe save operation, while accounting for configured safety margins.

### 29.8 Population limit

The engine may impose a maximum persistent-person count. The effective population must remain below it.

### 29.9 Deterministic seed policy

If an explicit seed is supported, it must satisfy format and range constraints.

### 29.10 Unsupported combinations

Advanced retention and generated-person policies must form a supported profile combination.

---

## 30. Warning examples

### 30.1 Near memory budget

```text
This configuration is close to the selected memory budget.

Estimated working memory: 3.8 GB
Memory budget: 4.0 GB

Performance may become unstable when other applications use substantial memory.
```

### 30.2 Over recommended budget

```text
The configuration exceeds the recommended memory budget but remains below
the application hard limit.

[Review Loading Rules] [Continue Anyway]
```

### 30.3 Hard memory limit

```text
This configuration exceeds the application's supported memory limit.

Reduce the database preset, remove loading rules, or increase the configured
limit if the current platform supports it.
```

`Continue` remains disabled.

### 30.4 Insufficient storage

```text
World generation requires approximately 1.1 GB of temporary storage, but
only 720 MB is currently available in the configured data location.
```

### 30.5 Rule adds no people

```text
This loading rule currently adds no unique people.
```

### 30.6 Generated population warning

```text
Disabling broad population maintenance may reduce transfer-market depth in
unloaded nations during long careers.
```

### 30.7 Long world-generation estimate

```text
Initial world generation may take approximately 12 to 20 minutes on the
current system.
```

---

## 31. Continue behavior

Selecting `Continue` must:

1. Commit pending rule edits.
2. Validate input snapshot compatibility.
3. Resolve guaranteed population requirements.
4. Normalize and validate loading rules.
5. Resolve inclusion and exclusion precedence.
6. Validate generated-person policies.
7. Obtain or verify the current performance estimate.
8. Check hard memory, storage, and entity-count limits.
9. Require acknowledgment of current nonblocking warnings.
10. Create an immutable database-scope snapshot.
11. Persist the setup draft atomically.
12. Navigate to Manager Creation.

```typescript
interface DatabaseScopeSnapshot {
  readonly id: string;
  readonly databaseFingerprint: string;
  readonly leagueSelectionSnapshotId: string;
  readonly competitionDetailSnapshotId: string;
  readonly revision: number;
  readonly selectedPresetId: string | null;
  readonly loadingRules: readonly PersonLoadingRule[];
  readonly effectiveLoadingRules: readonly EffectiveLoadingRule[];
  readonly generatedPersonConfiguration: GeneratedPersonConfiguration;
  readonly advancedOptions: AdvancedDatabaseOptions;
  readonly memoryBudgetPolicyId: string;
  readonly estimate: DatabasePerformanceEstimate;
  readonly acknowledgedWarningCodes: readonly string[];
  readonly createdAt: string;
}
```

Disable Continue immediately after activation and ignore duplicate submissions.

---

## 32. Back behavior and reconciliation

Selecting `Back` returns to Competition Detail Selection and preserves the current database-scope draft.

If earlier settings later change:

```text
Unchanged source snapshots       Restore current draft
Added league or competition      Recalculate guaranteed population
Removed league or competition    Remove obsolete guarantees
Changed detail level             Recalculate population requirements
Changed database fingerprint     Invalidate and migrate only explicitly
Changed system profile           Mark estimates stale
```

When returning, show significant changes:

```text
Database estimates were updated after competition settings changed.

Guaranteed players: 22,800 -> 24,100
Guaranteed staff: 6,100 -> 6,420
Recommended preset: Medium -> Large

Your custom loading rules were preserved.
```

---

## 33. State model

```typescript
interface DatabaseOptionsScreenState {
  readonly databaseFingerprint: string;
  readonly leagueSelectionSnapshotId: string;
  readonly competitionDetailSnapshotId: string;
  readonly selectedPresetId: string | null;
  readonly loadingRules: readonly PersonLoadingRule[];
  readonly effectiveRules: readonly EffectiveLoadingRule[];
  readonly generatedPersonConfiguration: GeneratedPersonConfiguration;
  readonly advancedOptions: AdvancedDatabaseOptions;
  readonly memoryBudgetPolicyId: string;
  readonly estimate: DatabasePerformanceEstimate | null;
  readonly estimateStatus: "idle" | "updating" | "ready" | "failed";
  readonly issues: readonly DatabaseConfigurationIssue[];
  readonly configurationRevision: number;
  readonly submitting: boolean;
}
```

Renderer-facing state must use serializable structures.

---

## 34. State transitions

```text
LOADING_INPUT_SNAPSHOTS
  |
  v
CALCULATING_GUARANTEED_SCOPE
  |
  v
APPLYING_RECOMMENDATION
  |
  v
ESTIMATING
  |
  v
READY
  |
  +-- change preset ---------> PREVIEWING_PRESET
  |                                |
  |                                +-- cancel -> READY
  |                                +-- apply -> RESOLVING_RULES
  |
  +-- edit rule ------------> RESOLVING_RULES
  |                                |
  |                                v
  |                            ESTIMATING
  |                                |
  +------------------------------ READY
  |
  +-- Continue -------------> VALIDATING_SUBMISSION
                                   |
                                   +-- errors -> READY_WITH_ERRORS
                                   +-- warnings -> AWAITING_WARNING_ACKNOWLEDGEMENT
                                   +-- valid -> SUBMITTING
                                                   |
                                                   v
                                             MANAGER_CREATION
```

A failed estimate must not corrupt rules or erase prior valid state.

---

## 35. Commands and events

### 35.1 Commands

```text
SET_DATABASE_PRESET
PREVIEW_DATABASE_PRESET
ADD_LOADING_RULE
EDIT_LOADING_RULE
ENABLE_LOADING_RULE
DISABLE_LOADING_RULE
REMOVE_LOADING_RULE
SET_GENERATED_PERSON_POLICY
SET_STAFF_LOADING_POLICY
SET_MEMORY_BUDGET_POLICY
SET_ADVANCED_DATABASE_OPTIONS
RESTORE_RECOMMENDED_CONFIGURATION
OPEN_INCLUSION_BREAKDOWN
OPEN_ESTIMATE_DETAILS
OPEN_REVIEW_SETUP
ACKNOWLEDGE_WARNING
REQUEST_BACK
REQUEST_CONTINUE
```

### 35.2 Events

```text
DATABASE_PRESET_CHANGED
LOADING_RULE_ADDED
LOADING_RULE_CHANGED
LOADING_RULE_REMOVED
LOADING_RULE_MARKED_REDUNDANT
GUARANTEED_SCOPE_RECALCULATED
GENERATED_PERSON_POLICY_CHANGED
DATABASE_ESTIMATE_STARTED
DATABASE_ESTIMATE_UPDATED
DATABASE_ESTIMATE_FAILED
DATABASE_CONFIGURATION_INVALID
DATABASE_SCOPE_SNAPSHOT_CREATED
SETUP_DRAFT_SAVED
```

---

## 36. Architecture and boundaries

The screen may depend on:

- Validated prior setup snapshots.
- Guaranteed-population query service.
- Loading-rule validator.
- Population-scope resolver.
- Recommendation service.
- Performance estimator.
- Storage-capacity service.
- System-capability service.
- Setup-draft repository.
- Localization service.

It must not directly depend on:

- Match-engine internals.
- Transfer AI implementation.
- Player attribute generation internals.
- Tactical engine.
- Club finances.
- Inbox generation.
- Final career serializer.

Recommended structure:

```text
Renderer
  |
  v
Database Options View Model
  |
  v
New Career Setup Application Service
  |
  +-- Guaranteed Scope Resolver
  +-- Loading Rule Resolver
  +-- Recommendation Service
  +-- Population Estimator
  +-- Resource Estimator
  +-- Validation Service
  +-- Draft Repository
  |
  v
Validated Setup Index and Prior Snapshots
```

---

## 37. Keyboard interaction

Recommended behavior:

- `Tab` and `Shift+Tab`: move between major controls.
- `Up Arrow` and `Down Arrow`: move through loading rules and preset options.
- `Space`: enable or disable the focused rule.
- `Enter`: edit the focused rule or activate a button.
- `Delete`: request removal of a user-created rule.
- `Ctrl+N`: add a new loading rule when focus is in the rule region.
- `Home` and `End`: move to first or last rule.
- `Page Up` and `Page Down`: move by viewport.
- `Escape`: close an editor or preview, then navigate Back when no transient interface remains.

Deletion must require an explicit confirmation or provide immediate undo.

---

## 38. Accessibility requirements

### 38.1 Rule list

Expose loading rules as an accessible list or grid.

Each rule communicates:

- Enabled state.
- Include or exclude action.
- Person type.
- Criteria summary.
- Source.
- Estimated unique additions.
- Redundant or invalid state.

Example accessible label:

```text
Enabled inclusion rule, players, current senior internationals worldwide,
from Medium preset, approximately 1,850 unique additions.
```

### 38.2 Estimates

Announce meaningful changes politely:

```text
Estimated population updated to approximately 34,200 players.
Expected processing speed changed to Medium.
```

Do not announce every metric after every minor adjustment.

### 38.3 Budget indicator

Expose:

- Current estimate.
- Selected budget.
- Budget state.
- Whether values are approximate.

Do not communicate budget state by color alone.

### 38.4 Focus management

- Rule editor receives focus when opened.
- Closing returns focus to the invoking rule or Add Rule button.
- Preset preview restores focus predictably.
- Submission errors focus a linked error summary.
- Returning from Review Setup restores prior focus.

### 38.5 Scaling

At high text scaling:

- Stack the performance summary below the options.
- Let rule summaries wrap.
- Keep values adjacent to their labels.
- Avoid clipping thresholds and units.
- Keep footer actions reachable.

---

## 39. Localization requirements

- Localize all labels, criteria summaries, and explanations.
- Use complete message templates rather than concatenated fragments.
- Localize counts, memory sizes, storage sizes, percentages, and duration ranges.
- Support right-to-left layout.
- Support locale-aware sorting and search.
- Preserve native scripts for nation, region, club, and role names.
- Keep stable IDs independent from display names.
- Allow long policy and preset descriptions to wrap.

Example template:

```text
Include {entityType} where {criterionSummary}.
```

---

## 40. Responsive behavior

### Wide desktop

Use a two-column layout with a sticky performance summary.

### Standard desktop

Prioritize rule readability over summary width.

### Narrow desktop

Stack:

```text
Preset
Database-scope editor
Performance summary
Footer actions
```

### Minimum viewport

- At least several rules remain visible.
- Rule editing remains usable.
- Summary can scroll independently if necessary.
- Continue and Back remain reachable.
- Dialogs fit inside the viewport.

### Ultrawide display

Use bounded content widths rather than stretching rule text across the display.

---

## 41. Performance requirements

The database may contain hundreds of thousands of person records.

The setup screen must not copy all person records into renderer memory.

Requirements:

- Use aggregate queries for previews.
- Resolve per-person details lazily.
- Cache estimates by full input fingerprint.
- Cancel stale queries.
- Bound custom rule complexity.
- Virtualize long rule and breakdown lists.
- Avoid rebuilding all rule summaries after one edit.
- Run heavy population intersections outside the renderer.
- Apply time and memory limits to preview operations.

Suggested targets:

- Immediate visible response to edits within 100 milliseconds.
- Preview activity feedback within 250 milliseconds.
- Smooth scrolling while estimation runs.
- Immediate Continue activity feedback.

---

## 42. Security requirements

Database metadata, presets, custom rules, and localized labels are untrusted.

Protect against:

- Script or markup injection.
- Unknown stable IDs.
- Invalid operators.
- Oversized rule lists.
- Excessive criterion lists.
- Malicious regular expressions, if text patterns are supported.
- Integer overflow in population and byte estimates.
- Forged system-profile values from the renderer.
- Path injection in storage settings.
- Invalid Unicode and bidirectional-control abuse.
- Tampered snapshot IDs.

Rules:

1. Render labels as text.
2. Validate every command in a trusted process.
3. Resolve entities by stable ID.
4. Bound rule and criterion counts.
5. Avoid arbitrary executable predicates.
6. Use safe integer handling for counts and byte values.
7. Obtain system capacity from trusted services.
8. Revalidate storage paths at the application boundary.
9. Recompute final estimates outside the renderer.
10. Revalidate all snapshots before Continue.

---

## 43. Persistence rules

The setup draft may persist:

- Selected preset.
- User loading rules.
- Enabled state of preset rules.
- Generated-person policy.
- Staff-loading policy.
- Advanced settings.
- Memory-budget policy.
- Last valid estimate and its complete fingerprint.
- Acknowledged warning codes tied to a revision.

It must not treat as valid:

- Rules containing unknown IDs.
- Estimates from another system profile.
- Estimates from different prior snapshots.
- Warning acknowledgments after relevant changes.
- Partially written rule transactions.
- Temporary preview state.

Draft writes should be atomic where supported.

---

## 44. Error and empty states

### No optional database records

```text
All available people are already required by the selected competitions.

No additional loading rules are necessary.
```

### Rule preview unavailable

```text
The impact of this rule could not be estimated.

The rule has not been added.

[Retry] [Cancel]
```

### System profile unavailable

```text
System capacity could not be measured reliably.

A conservative recommendation has been applied.
```

### Storage capacity unavailable

```text
Available storage could not be verified.

Check the configured data location before world generation.
```

Depending on product policy, this may be a warning or blocking issue.

### Estimate service failure

```text
Database performance could not be estimated.

Your settings are preserved.

[Retry Estimate] [Restore Conservative Defaults]
```

### Invalid restored draft

```text
Some database settings could not be restored because the world database
or competition scope changed.

[View Adjustments] [Use Recommended Settings]
```

---

## 45. Edge cases

### Rule refers to a removed nation or club

Mark it invalid and require edit or removal. Do not substitute by name.

### Preset rule becomes redundant

Keep the preset intact but identify the rule as adding no unique people.

### Guaranteed population exceeds the memory budget

Explain that database-size presets cannot remove guaranteed entities and direct the user back to league or competition-detail selection.

### Free storage changes while the screen is open

Mark the storage check stale and revalidate before Continue.

### System enters low-memory condition

Refresh the recommendation without silently changing user settings.

### Estimate results arrive out of order

Discard every result with stale snapshot IDs or revision.

### Generated-person policy conflicts with a competition requirement

Upgrade to the minimum viable policy or block submission, according to product design. Explain the reason.

### Explicit exclusion overlaps a guaranteed population

Retain guaranteed people and report the number the exclusion could not remove.

### Multiple rules match the same people

Deduplicate by stable person ID and expose unique additions in estimates.

### Very large custom rule

Apply configured complexity limits and offer a broader named criterion if available.

### Application closes during rule transaction

Restore the prior complete draft. Never persist a half-edited rule.

---

## 46. Acceptance criteria

The screen is complete when:

1. It receives and verifies all prior setup snapshots.
2. Competition scope and person-database scope are clearly distinguished.
3. Guaranteed players and staff cannot be removed by smaller presets or exclusions.
4. Presets apply documented optional-loading policies.
5. User-created loading rules use validated stable IDs and operators.
6. Based-in and nationality rules are clearly distinct.
7. Duplicate population matches are deduplicated.
8. Redundant rules are identified accurately.
9. Inclusion and exclusion precedence is deterministic and explainable.
10. Generated-person policies satisfy hard world requirements.
11. All thresholds and estimator premises come from named configuration values.
12. Memory, storage, initial save, annual growth, and generation-time estimates are distinct.
13. Estimates are asynchronous, cancellable, and revision-aware.
14. Stale estimates cannot overwrite current results.
15. Hard memory, storage, and entity limits block continuation.
16. Nonblocking warnings require acknowledgment only when current.
17. Restore Recommended previews and applies changes transactionally.
18. Review Setup accurately summarizes Screens 2 through 5.
19. Continue creates one immutable validated DatabaseScopeSnapshot.
20. Duplicate submission is prevented.
21. Back navigation preserves and safely reconciles the draft.
22. Keyboard and assistive-technology users can inspect and edit all settings.
23. Large source databases do not require all person records in renderer memory.
24. Untrusted labels, rules, and presets cannot execute markup or code.
25. No original proprietary assets or databases are required.

---

## 47. Recommended tests

### Unit tests

- Preset matching.
- Guaranteed-population preservation.
- Rule schema validation.
- Rule equivalence detection.
- Redundancy detection.
- Inclusion and exclusion precedence.
- Stable-ID deduplication.
- Reputation-band resolution.
- Multiple-nationality matching.
- Generated-policy minimum validation.
- Memory-budget state calculation.
- Storage-budget validation.
- Warning acknowledgment invalidation.
- Estimate-fingerprint generation.
- Snapshot compatibility validation.

### Integration tests

- Open with valid prior snapshots.
- Apply each built-in preset.
- Add a nationality rule.
- Add a based-in-region rule.
- Add a club rule without changing league playability.
- Add a staff-role rule.
- Detect an equivalent rule.
- Identify a redundant rule.
- Apply an exclusion overlapping guaranteed players.
- Change generated-person policy.
- Restore Recommended.
- Open Review Setup and navigate to an earlier screen.
- Continue within budget.
- Warn over recommended budget.
- Block over hard memory limit.
- Block with insufficient storage.
- Return from Manager Creation and restore state.

### Concurrency tests

- Edit rules rapidly while estimates run.
- Change preset during rule preview.
- Refresh system profile during estimation.
- Receive stale storage and estimate results.
- Press Continue twice rapidly.
- Navigate Back during estimation.
- Close during atomic rule persistence.

### Security tests

- Unknown nation, club, role, and tag IDs.
- Invalid criterion operator.
- Oversized rule list.
- Oversized criterion value list.
- Markup-like database labels.
- Invalid Unicode and bidirectional controls.
- Integer overflow in person counts.
- Integer overflow in byte estimates.
- Forged renderer system profile.
- Tampered prior snapshot ID.
- Malicious storage path.
- Arbitrary predicate injection attempt.

### Accessibility tests

- Keyboard-only preset and rule editing.
- Rule enabled-state announcement.
- Inclusion-breakdown navigation.
- Budget-state announcement.
- Rule-editor focus restoration.
- Error-summary links.
- Warning preview focus management.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long translated criteria summaries.

### Visual regression tests

Capture at least:

- Recommended Medium preset.
- Minimal preset.
- Extensive preset.
- Custom loading rules.
- Redundant rule state.
- Invalid rule state.
- Inclusion breakdown.
- Memory near-budget warning.
- Hard-limit blocking error.
- Insufficient-storage error.
- Restore Recommended preview.
- Review Setup summary.
- Estimate updating state.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 48. Condensed LLM implementation brief

```text
Implement a desktop Database Size and Performance Options screen for an
original football-management simulation's new-career workflow.

The screen receives validated LeagueSelectionSnapshot and
CompetitionDetailSnapshot inputs. Verify that all snapshots share the same
database fingerprint. Clearly distinguish competition scope from the
persistent player and staff database scope.

Show guaranteed population required by playable and detailed competitions.
Guaranteed people cannot be removed by smaller presets or exclusion rules.
Provide Minimal, Small, Medium, Large, Extensive, and Custom presets. Presets
are named loading-policy templates, not fixed person-count limits.

Allow validated optional loading rules for nationality, based-in nation or
region, club, competition, international status, reputation band, age band,
contract status, player position, staff role, and database tags. Use stable
IDs and configured threshold identifiers. Do not embed arbitrary numeric
premises in formulas or UI logic.

Maintain deterministic include and exclude precedence. Deduplicate people
by stable ID. Identify equivalent and redundant rules. For each rule, show
estimated matches, already included people, unique additions, memory impact,
and estimate confidence.

Provide explicit generated-player and generated-staff policies. Generation
must satisfy hard squad and competition requirements and be deterministic
for identical database fingerprints, snapshots, seeds, engine versions,
and policy versions.

Show separate estimates for guaranteed and optional people, generated
startup population, working memory, peak generation memory, initial save
size, annual save growth, temporary storage, world-generation duration
range, and expected processing-speed category. Use configured memory budget
policies with named premises. Estimation must be asynchronous, cancellable,
debounced, fingerprinted, and revision-aware. Discard stale results.

Provide Restore Recommended with a transactional preview, Advanced Options,
Inclusion Breakdown, Estimate Details, and Review Setup. Hard memory,
storage, person-count, snapshot, and generation-policy violations must block
Continue. Current nonblocking warnings require acknowledgment.

On Continue, commit rule edits, revalidate snapshots, resolve guaranteed
population, normalize rules, apply precedence, validate generation policy,
verify current estimates and hard limits, create one immutable
DatabaseScopeSnapshot, persist the setup draft atomically, and navigate to
Manager Creation. Prevent duplicate submission.

Keep person records outside renderer memory. Use aggregate queries, bounded
rule complexity, cancellable workers, and virtualized lists. Support full
keyboard operation, accessible rule semantics, visible focus, live-region
summaries, high text scaling, localization, and right-to-left layouts. Treat
all database labels, presets, rules, paths, and renderer commands as
untrusted. Do not copy proprietary artwork, exact text, source code, logos,
or databases.
```

---

## 49. Next planned item

**Screen 6: Game Loading and World Generation** should define setup-snapshot locking, deterministic world creation, staged progress, validation, cancellation boundaries, generated-person creation, initial fixtures and histories, career seed handling, failure recovery, save creation, and transition to Add Manager.

---

## Suggested Git commit

```text
feat(docs): specify database size and performance screen
```
