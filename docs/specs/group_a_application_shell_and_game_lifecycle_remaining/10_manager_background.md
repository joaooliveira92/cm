# Screen 10: Manager Background

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, databases, source code, logos, exact interface wording, or other protected assets. Use an original visual identity and fictional or properly licensed football data.

---

## 1. Purpose

The **Manager Background** screen defines the manager draft's prior football experience, professional qualifications, starting reputation, and initial managerial archetype.

It appears after **Manager Nationality and Languages** and before **Club Selection**.

The screen must allow the user to:

- Choose a prior playing-career level.
- Choose a coaching-qualification level where the simulation models qualifications.
- Select a starting-reputation profile within career rules.
- Choose or create a manager archetype.
- Allocate a fixed pool of points across high-level managerial attributes.
- Understand how background choices affect starting opportunities and expectations.
- Preview derived strengths without exposing hidden implementation formulas.
- Apply a balanced preset or another policy-defined preset.
- Detect invalid, contradictory, or over-budget configurations.
- Save progress as part of the manager draft.
- Return to Nationality and Languages without losing saved work.
- Continue to Club Selection only after validation succeeds.

This screen defines **initial conditions**, not guaranteed success. It must not predetermine match outcomes, player loyalty, board patience, or career progression.

---

## 2. Position in the manager-creation flow

```text
Add Manager
    |
    v
Manager Personal Details
    |
    v
Manager Nationality and Languages
    |
    | Identity and communication stage complete
    v
Manager Background
    |
    | Background stage complete
    v
Club Selection or Start Unemployed
    |
    v
Manager Confirmation
    |
    v
Career Inbox
```

When the screen resumes an existing draft, it restores the latest valid saved configuration and identifies any values invalidated by policy or database changes.

---

## 3. Core concepts

### 3.1 Playing-career background

Playing-career background describes the highest meaningful level at which the fictional manager previously played football.

It may affect:

- Initial reputation.
- Credibility with players.
- Familiarity with professional environments.
- Availability of some starting jobs.
- Media expectations.
- Starting relationships or knowledge, where explicitly modeled.

It must not produce stereotypes or guarantee managerial ability.

### 3.2 Coaching qualification

A coaching qualification represents formal training recognized by the simulation's fictional or licensed football structures.

It may affect:

- Starting coaching knowledge.
- Eligibility for some jobs.
- Training effectiveness baselines.
- Board assessment.
- Qualification-development paths.

### 3.3 Starting reputation

Starting reputation represents how the football world initially perceives the manager.

It is distinct from actual managerial attributes. A highly reputed former player can still be inexperienced as a manager.

### 3.4 Manager archetype

A manager archetype is a high-level distribution of strengths that influences the manager's initial profile.

The archetype should not lock future development. It provides starting emphasis only.

### 3.5 Attribute-allocation pool

The user receives a fixed number of points to distribute among high-level attributes.

For this specification, the default policy uses **12 points** distributed among manager attributes. The value must still come from named configuration and must not be embedded within formulas.

### 3.6 Derived capability

A derived capability is calculated from background, qualification, archetype, allocated points, and career policy.

Derived capabilities should be previewed qualitatively or in clearly labeled ranges.

---

## 4. Entry contract

```typescript
interface OpenManagerBackgroundRequest {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly expectedDraftRevision: number;
  readonly nationalityLanguagesStageRevision: number;
  readonly controllerContextId: string;
}
```

Before enabling edits, verify:

- The career exists and is readable.
- The manager draft exists and is incomplete.
- The current controller may edit the draft.
- Personal Details is complete.
- Nationality and Languages is complete.
- The expected revision is current.
- Background policies are available.
- Attribute and archetype definitions are compatible with the current engine version.

---

## 5. Conceptual desktop layout

```text
+--------------------------------------------------------------------------------+
| CREATE MANAGER                          Step 3 of 5: Manager Background         |
|--------------------------------------------------------------------------------|
| EXPERIENCE                                                                     |
|                                                                                |
| Playing career       [Professional, national level v]                          |
| Coaching qualification [Intermediate coaching certificate v]                  |
| Starting reputation  [Established professional v]                              |
|                                                                                |
| ARCHETYPE                                                                      |
|                                                                                |
| [Balanced] [Tactician] [Developer] [Motivator] [Recruiter] [Custom]            |
|                                                                                |
| Allocate 12 points                                                             |
|                                                                                |
| Tactical Insight          [-] 3 [+]     Strong                                 |
| Player Development        [-] 2 [+]     Capable                                |
| Leadership                [-] 3 [+]     Strong                                 |
| Recruitment               [-] 2 [+]     Capable                                |
| Club Management           [-] 2 [+]     Capable                                |
|                                                                                |
| Points remaining: 0                                                          |
|                                                                                |
| EFFECT PREVIEW                                                                 |
| Strong tactical preparation and leadership. Balanced recruitment and          |
| development. Starting reputation may attract professional-level vacancies.    |
|                                                                                |
| Draft saved 16:53                                                              |
|--------------------------------------------------------------------------------|
| [Back] [Restore Balanced] [Save as Preset] [Save Draft]              [Continue]|
+--------------------------------------------------------------------------------+
```

Narrow layout:

```text
Create Manager
Manager Background

Playing career
[Selection]

Coaching qualification
[Selection]

Starting reputation
[Selection]

Archetype
[Balanced v]

Tactical Insight
[-] 3 [+]

Player Development
[-] 2 [+]

Points remaining: 0

[Back] [Save Draft] [Continue]
```

These diagrams define behavior and information hierarchy rather than exact styling.

---

## 6. Screen regions

### 6.1 Header

Display:

- `Create Manager`.
- Current stage.
- Stable step indicator.
- Draft save status.
- Back navigation.

### 6.2 Experience section

Contains:

- Playing-career level.
- Coaching qualification.
- Starting-reputation profile.
- Explanatory descriptions.

### 6.3 Archetype section

Contains:

- Archetype preset choices.
- Attribute-allocation controls.
- Point-pool summary.
- Restore action.

### 6.4 Effect preview

Contains:

- Starting strengths.
- Likely opportunity level.
- Qualification or eligibility notes.
- Any tradeoffs.
- Warnings caused by unusual combinations.

### 6.5 Footer actions

Recommended actions:

- `Back`
- `Restore Balanced`
- `Save as Preset`, if user presets are supported.
- `Save Draft`
- `Continue`

---

## 7. Playing-career levels

Recommended semantic levels:

```typescript
type PlayingCareerLevel =
  | "none"
  | "amateur"
  | "semi_professional"
  | "professional_regional"
  | "professional_national"
  | "professional_continental"
  | "international";
```

Localized display labels may vary, but stored values remain stable.

### 7.1 No notable playing career

Represents a manager without meaningful competitive playing experience.

Possible effects:

- Lower initial player recognition.
- Lower starting reputation.
- No automatic playing-career credibility bonus.
- Greater emphasis on qualifications or managerial development.

This is a valid career path and must not be described as inferior in personal worth.

### 7.2 Amateur

Represents experience in organized amateur football.

### 7.3 Semi-professional

Represents experience in mixed or part-time competitive football.

### 7.4 Professional regional

Represents professional experience with limited geographic recognition.

### 7.5 Professional national

Represents established top or secondary-level professional experience within a nation.

### 7.6 Professional continental

Represents a widely recognized career across a continental football context.

### 7.7 International

Represents notable senior international playing experience.

It may increase starting recognition but must not automatically provide elite tactical or coaching capability.

---

## 8. Playing-career selection behavior

Changing the playing-career level must:

1. Validate the selected policy ID.
2. Recalculate allowed starting-reputation profiles.
3. Recalculate background-derived modifiers.
4. Recalculate job-opportunity previews.
5. Preserve manual attribute allocation.
6. Mark incompatible values for review rather than silently deleting them.
7. Mark the draft dirty.

Example:

```text
International playing experience increases initial recognition but does not
change your allocated managerial strengths.
```

---

## 9. Coaching qualifications

Recommended semantic levels:

```typescript
type CoachingQualificationLevel = "none" | "foundation" | "intermediate" | "advanced" | "elite";
```

Actual display names should be fictional or properly licensed.

### 9.1 Qualification definitions

Each qualification profile should describe:

- Intended level.
- Starting knowledge contribution.
- Job eligibility implications.
- Development path.
- Availability restrictions, if any.

```typescript
interface CoachingQualificationProfile {
  readonly id: CoachingQualificationLevel;
  readonly displayNameKey: string;
  readonly descriptionKey: string;
  readonly derivedModifierProfileId: string;
  readonly jobEligibilityProfileId: string;
  readonly progressionPathId?: string;
}
```

### 9.2 Qualification selection

Changing qualification must not rewrite the user's attribute allocation. It updates derived previews and eligibility only.

### 9.3 Career-mode restrictions

A challenge scenario may restrict available qualifications. Restrictions must be visible and explainable.

---

## 10. Starting-reputation profiles

Recommended levels:

```typescript
type StartingReputationProfile =
  "unknown" | "local" | "regional" | "national" | "continental" | "worldwide";
```

The selectable profiles may depend on:

- Playing-career background.
- Coaching qualification.
- Scenario policy.
- Selected career mode.
- Difficulty or realism policy where explicitly supported.

### 10.1 Reputation is perception

The interface must explain:

```text
Starting reputation affects how clubs and the media initially perceive your
manager. It does not directly determine tactical or coaching ability.
```

### 10.2 Maximum permitted reputation

The domain layer calculates the maximum selectable profile from policy.

```typescript
interface StartingReputationConstraint {
  readonly minimumProfileId: StartingReputationProfile;
  readonly maximumProfileId: StartingReputationProfile;
  readonly defaultProfileId: StartingReputationProfile;
  readonly reasonCodes: readonly string[];
}
```

### 10.3 Invalid restored reputation

If a draft's previous value is no longer permitted:

```text
Starting reputation was adjusted because the selected background no longer
supports the previous profile.

Previous: Continental
Available maximum: National
```

Require review before Continue.

---

## 11. Manager archetype system

The archetype system provides meaningful starting differentiation while preserving user control.

Recommended built-in archetypes:

- Balanced.
- Tactician.
- Player Developer.
- Motivator.
- Recruiter.
- Club Builder.
- Custom.

Names and exact distributions should be original and configurable.

### 11.1 Balanced

Distributes points broadly without a severe weakness.

### 11.2 Tactician

Emphasizes Tactical Insight and match preparation.

### 11.3 Player Developer

Emphasizes Player Development and long-term progression.

### 11.4 Motivator

Emphasizes Leadership and communication-related management.

### 11.5 Recruiter

Emphasizes Recruitment and talent evaluation.

### 11.6 Club Builder

Emphasizes Club Management, planning, and organizational stability.

### 11.7 Custom

Allows direct allocation within policy bounds.

---

## 12. High-level manager attributes

Recommended high-level attributes:

```typescript
type ManagerArchetypeAttributeId =
  "tactical_insight" | "player_development" | "leadership" | "recruitment" | "club_management";
```

### 12.1 Tactical Insight

Represents high-level tactical analysis, match preparation, and adaptation.

It may contribute to:

- Tactical familiarity speed.
- Quality of tactical recommendations.
- Match-plan evaluation.
- Recognition of tactical problems.

It does not automate user decisions or guarantee match results.

### 12.2 Player Development

Represents ability to organize development environments and support progression.

It may contribute to:

- Training-plan quality.
- Youth-development effectiveness.
- Development conversations.
- Long-term player progression support.

### 12.3 Leadership

Represents group management, credibility, motivation, and conflict handling.

It may contribute to:

- Dressing-room response.
- Team-talk effectiveness.
- Response to grievances.
- Staff cohesion.

### 12.4 Recruitment

Represents talent identification, squad planning, and transfer-market judgment.

It may contribute to:

- Reliability of recruitment summaries.
- Shortlist organization.
- Squad-needs evaluation.
- Transfer target suitability assessment.

It should not replace scouts' knowledge or reveal hidden attributes automatically.

### 12.5 Club Management

Represents organizational planning and coordination across staff, budgets, schedules, and long-term objectives.

It may contribute to:

- Board communication.
- Delegation quality.
- Staff organization.
- Budget-planning support.
- Operational consistency.

---

## 13. Attribute policy

```typescript
interface ManagerArchetypePolicy {
  readonly totalAllocationPoints: number;
  readonly minimumPointsPerAttribute: number;
  readonly maximumPointsPerAttribute: number;
  readonly attributeIds: readonly ManagerArchetypeAttributeId[];
  readonly builtInArchetypeIds: readonly string[];
  readonly allowUnspentPoints: boolean;
  readonly allowUserPresets: boolean;
}
```

The default configuration may define:

```text
Total allocation points: 12
Minimum per attribute: 0
Maximum per attribute: policy-defined
```

Every calculation must reference the policy values. Do not embed `12`, minima, or maxima in allocator formulas.

---

## 14. Attribute allocation behavior

### 14.1 Increment

Incrementing an attribute:

- Is disabled at the per-attribute maximum.
- Is disabled when no points remain.
- Updates the remaining-point count immediately.
- Recalculates the qualitative preview.
- Changes the selected archetype to Custom unless the distribution matches a named preset.

### 14.2 Decrement

Decrementing an attribute:

- Is disabled at the minimum.
- Returns one point to the available pool.
- Recalculates the preview.
- Preserves other attributes.

### 14.3 Direct numeric entry

If direct entry is supported:

- Accept integers only.
- Enforce configured bounds.
- Validate the total atomically.
- Do not permit temporary committed values outside policy.

### 14.4 Keyboard control

Each stepper supports:

- Left or Down to decrement.
- Right or Up to increment.
- Home to set the minimum.
- End to set the maximum permitted by remaining points.
- Direct numeric entry where accessible.

### 14.5 Point accounting

```typescript
function calculateRemainingPoints(
  policyTotal: number,
  allocations: Readonly<Record<ManagerArchetypeAttributeId, number>>,
): number;
```

The function uses the configured policy total. No literal allocation budget belongs inside the calculation.

---

## 15. Archetype preset definitions

```typescript
interface ManagerArchetypePreset {
  readonly id: string;
  readonly displayNameKey: string;
  readonly descriptionKey: string;
  readonly allocations: Readonly<Record<ManagerArchetypeAttributeId, number>>;
  readonly policyVersion: string;
}
```

Preset validation must confirm:

- Every required attribute exists.
- No unknown attribute exists.
- Every allocation is an integer.
- Every allocation is within bounds.
- The total equals the configured budget unless unspent points are permitted.

---

## 16. Applying an archetype

Selecting a preset should preview replacement when the user has a custom distribution.

```text
Apply the Tactician archetype?

Your current custom allocation will be replaced.

[Keep Custom Allocation] [Apply Tactician]
```

The preset application is one atomic change and one undoable action during the current session if undo is supported.

---

## 17. Restore Balanced

`Restore Balanced` applies the policy-defined Balanced preset.

It must not compute balance using hidden ad hoc logic in the renderer.

If unsaved custom values exist, preview the replacement or provide immediate undo.

---

## 18. User-defined presets

If supported, users may save an allocation as a reusable preset.

```typescript
interface UserManagerArchetypePreset {
  readonly id: string;
  readonly displayName: string;
  readonly policyVersion: string;
  readonly attributeSchemaFingerprint: string;
  readonly allocations: Readonly<Record<ManagerArchetypeAttributeId, number>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

Preset names are untrusted input and must be safely rendered.

### 18.1 Compatibility

A user preset may be applied only when:

- Its attribute schema is compatible.
- Its policy version is supported or explicitly migrated.
- Its values pass current limits.

Do not map unknown attributes by similar display names.

---

## 19. Derived capability profiles

The user allocation should not be the final low-level simulation state by itself.

```typescript
interface ManagerBackgroundDerivationInput {
  readonly playingCareerProfileId: PlayingCareerLevel;
  readonly qualificationProfileId: CoachingQualificationLevel;
  readonly reputationProfileId: StartingReputationProfile;
  readonly archetypeAllocations: Readonly<Record<ManagerArchetypeAttributeId, number>>;
  readonly nationalityLanguagesStageRevision: number;
  readonly derivationPolicyVersion: string;
}
```

```typescript
interface ManagerBackgroundPreview {
  readonly strengthSummaries: readonly ManagerStrengthSummary[];
  readonly opportunityBand: string;
  readonly qualificationNotes: readonly string[];
  readonly initialFamiliarityNotes: readonly string[];
  readonly warningCodes: readonly string[];
  readonly exactValuesHidden: boolean;
}
```

The preview can show descriptive bands such as:

- Developing.
- Capable.
- Strong.
- Exceptional starting emphasis.

---

## 20. Separation of reputation and attributes

The data model must keep these separate:

```text
Reputation: How the football world perceives the manager
Attributes: Where the manager's initial capabilities are emphasized
Qualifications: Formal preparation and eligibility
Playing background: Prior experience and recognition
```

A high-reputation, low-qualification configuration can be allowed if policy supports it, but the preview should explain the tradeoff.

---

## 21. Background compatibility rules

Possible rules include:

- Some reputation levels require a minimum playing background.
- Some jobs require a minimum coaching qualification.
- Challenge scenarios may restrict reputation.
- Qualification and reputation may have independent maximums.
- Archetype allocation remains independent unless the scenario explicitly limits it.

```typescript
interface ManagerBackgroundConstraint {
  readonly fieldId: string;
  readonly permittedValueIds: readonly string[];
  readonly defaultValueId: string;
  readonly reasonCodes: readonly string[];
}
```

The renderer receives permitted choices and reasons. It must not recreate eligibility rules.

---

## 22. Contradictory combinations

A combination is not invalid merely because it is unusual.

Examples that may be valid:

- International playing career with no coaching qualification.
- No playing career with an advanced qualification.
- High Leadership with low Tactical Insight.
- Strong Recruitment with unknown reputation.

Only explicit career rules should block a combination.

Warnings may explain tradeoffs without judging the user.

---

## 23. Opportunity preview

The screen may show a qualitative employment preview:

```text
Likely starting opportunities

- Lower professional divisions: Strong access
- Top professional divisions: Limited access
- Elite continental clubs: Unlikely initially
- Unemployed start: Available
```

This is an estimate, not a promise. Club-selection availability is determined on the next screen from current vacancies and policy.

---

## 24. Expectations preview

Higher starting reputation may increase expectations:

```text
An established reputation may attract stronger clubs, but boards, players,
and media may also expect faster results.
```

The game should avoid framing high reputation as an unqualified difficulty reduction.

---

## 25. Difficulty and fairness

Background choices may change starting conditions, but they must not secretly alter unrelated simulation rules.

If the product offers difficulty profiles, display them separately. Do not disguise difficulty as nationality, playing background, or language.

In multiplayer:

- Career policy may enforce identical point budgets.
- Background choices remain visible according to profile-visibility rules.
- The server validates every allocation.

---

## 26. Form behavior

### 26.1 Dirty state

```typescript
type ManagerBackgroundSaveState =
  "unchanged" | "unsaved" | "saving" | "saved" | "save_failed" | "conflicted";
```

### 26.2 Validation timing

- Validate individual selections immediately.
- Validate point totals continuously.
- Do not show a submission error before the user interacts with required fields.
- Recalculate preview after a short debounce.
- Keep the last valid preview while recalculating.

### 26.3 Archetype matching

After every allocation change:

- Compare the canonical allocation with valid built-in presets.
- Show the matching preset if exactly equal.
- Otherwise show Custom.

### 26.4 Unsaved changes

Back with unsaved edits opens:

```text
Save manager background changes?

[Discard Unsaved Changes] [Keep Editing] [Save and Go Back]
```

The safe default is `Keep Editing`.

---

## 27. Save Draft behavior

Selecting `Save Draft` must:

1. Commit open selectors and steppers.
2. Validate playing background.
3. Validate qualification.
4. Validate starting reputation.
5. Validate every attribute ID and allocation.
6. Validate the total point budget.
7. Validate the archetype policy version.
8. Recalculate the current preview fingerprint.
9. Save with the expected draft revision.
10. Return the new revision and save status.

```typescript
interface SaveManagerBackgroundCommand {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly expectedDraftRevision: number;
  readonly requestId: string;
  readonly background: ManagerBackgroundDraft;
}
```

The command must be idempotent for the same request ID.

---

## 28. Continue behavior

Selecting `Continue` must:

1. Commit active controls.
2. Revalidate draft ownership.
3. Revalidate upstream stage revision.
4. Validate background selections against current policy.
5. Validate reputation constraints.
6. Validate attribute schema and total.
7. Recalculate the authoritative derived preview.
8. Require acknowledgment of current nonblocking warnings.
9. Save the completed background stage atomically.
10. Advance the manager draft stage.
11. Navigate to Club Selection.

```typescript
interface ManagerBackgroundSnapshot {
  readonly managerDraftId: string;
  readonly draftRevision: number;
  readonly playingCareerProfileId: PlayingCareerLevel;
  readonly qualificationProfileId: CoachingQualificationLevel;
  readonly reputationProfileId: StartingReputationProfile;
  readonly selectedArchetypeId: string;
  readonly allocations: Readonly<Record<ManagerArchetypeAttributeId, number>>;
  readonly policyVersion: string;
  readonly derivationPolicyVersion: string;
  readonly derivedPreviewFingerprint: string;
  readonly acknowledgedWarningCodes: readonly string[];
  readonly completedAt: string;
}
```

Disable Continue immediately after activation and prevent duplicate completion.

---

## 29. Back behavior

Back returns to Manager Nationality and Languages.

Rules:

- Preserve saved background values.
- Prompt about unsaved changes.
- Keep the manager slot reserved.
- Do not alter nationality or language selections.
- Mark derived previews stale if upstream data later changes.

---

## 30. Manager background state model

```typescript
interface ManagerBackgroundDraft {
  readonly playingCareerProfileId: PlayingCareerLevel | null;
  readonly qualificationProfileId: CoachingQualificationLevel | null;
  readonly reputationProfileId: StartingReputationProfile | null;
  readonly selectedArchetypeId: string;
  readonly allocations: Readonly<Record<ManagerArchetypeAttributeId, number>>;
  readonly policyVersion: string;
}
```

```typescript
interface ManagerBackgroundScreenState {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly draftRevision: number;
  readonly nationalityLanguagesStageRevision: number;
  readonly background: ManagerBackgroundDraft;
  readonly policy: ManagerArchetypePolicy;
  readonly constraints: readonly ManagerBackgroundConstraint[];
  readonly pointsUsed: number;
  readonly pointsRemaining: number;
  readonly preview: ManagerBackgroundPreview | null;
  readonly previewState: "idle" | "updating" | "ready" | "failed";
  readonly validationIssues: readonly ManagerBackgroundIssue[];
  readonly saveState: ManagerBackgroundSaveState;
  readonly submitting: boolean;
}
```

Renderer-facing state must use serializable validated data.

---

## 31. State transitions

```text
LOADING_DRAFT_STAGE
  |
  v
RESOLVING_BACKGROUND_POLICY
  |
  v
READY
  |
  +-- change background ---> DIRTY
  |                              |
  |                              v
  |                       UPDATING_PREVIEW
  |                              |
  |                              v
  |                            DIRTY
  |
  +-- change allocation --> DIRTY -> UPDATING_PREVIEW -> DIRTY
  |
  +-- apply preset -------> PREVIEWING_REPLACEMENT
  |                              |
  |                              +-- cancel -> DIRTY
  |                              +-- apply -> DIRTY
  |
  +-- Save Draft ---------> VALIDATING_PARTIAL
  |                              |
  |                              +-- invalid -> DIRTY_WITH_ERRORS
  |                              +-- valid -> SAVING -> READY
  |
  +-- Continue -----------> VALIDATING_COMPLETE
                                 |
                                 +-- errors -> DIRTY_WITH_ERRORS
                                 +-- warnings -> AWAITING_ACKNOWLEDGMENT
                                 +-- valid -> SAVING_STAGE
                                               |
                                               v
                                         CLUB_SELECTION
```

A stale revision moves the screen to a conflict state.

---

## 32. Commands and events

### 32.1 Commands

```text
LOAD_MANAGER_BACKGROUND
SET_PLAYING_CAREER_PROFILE
SET_COACHING_QUALIFICATION
SET_STARTING_REPUTATION
SELECT_MANAGER_ARCHETYPE
INCREMENT_MANAGER_ATTRIBUTE
DECREMENT_MANAGER_ATTRIBUTE
SET_MANAGER_ATTRIBUTE_VALUE
RESTORE_BALANCED_ARCHETYPE
SAVE_USER_ARCHETYPE_PRESET
APPLY_USER_ARCHETYPE_PRESET
REMOVE_USER_ARCHETYPE_PRESET
ACKNOWLEDGE_MANAGER_BACKGROUND_WARNING
SAVE_MANAGER_BACKGROUND_DRAFT
REQUEST_BACK
REQUEST_CONTINUE
```

### 32.2 Events

```text
MANAGER_PLAYING_CAREER_CHANGED
MANAGER_QUALIFICATION_CHANGED
MANAGER_STARTING_REPUTATION_CHANGED
MANAGER_ARCHETYPE_SELECTED
MANAGER_ATTRIBUTE_ALLOCATION_CHANGED
MANAGER_ARCHETYPE_MATCH_CHANGED
MANAGER_BACKGROUND_PREVIEW_UPDATED
MANAGER_BACKGROUND_SAVED
MANAGER_BACKGROUND_CONFLICT_DETECTED
MANAGER_BACKGROUND_COMPLETED
```

Mutating commands require draft ID, expected revision where applicable, and idempotency request ID.

---

## 33. Asynchronous preview behavior

Derived previews may be asynchronous when they depend on career vacancies or world state.

```typescript
interface ManagerBackgroundPreviewRequest {
  readonly requestRevision: number;
  readonly managerDraftId: string;
  readonly backgroundFingerprint: string;
  readonly careerCheckpointId: string;
  readonly signal: AbortSignal;
}
```

Rules:

- Debounce repeated allocation changes.
- Cancel obsolete preview requests.
- Discard stale results.
- Keep selection editing available when preview fails.
- Recalculate authoritatively during Continue.

---

## 34. Validation issue model

```typescript
interface ManagerBackgroundIssue {
  readonly code: string;
  readonly severity: "information" | "warning" | "blocking_error";
  readonly fieldId?: string;
  readonly attributeId?: ManagerArchetypeAttributeId;
  readonly messageKey: string;
  readonly parameters?: Readonly<Record<string, string | number>>;
}
```

Blocking issues include:

- Missing playing-career profile.
- Missing qualification profile.
- Missing reputation profile.
- Unknown archetype attribute.
- Missing required archetype attribute.
- Noninteger allocation.
- Allocation outside bounds.
- Incorrect total point use.
- Reputation outside allowed constraints.
- Unsupported policy version.
- Unauthorized or stale draft.

Warnings include:

- High reputation with limited qualification.
- Qualification insufficient for some likely vacancies.
- Strong specialization creating a low starting emphasis elsewhere.
- User preset migrated to current policy.

---

## 35. Error states

### Background policy unavailable

```text
Manager background options could not be loaded.

Your saved manager details remain unchanged.

[Retry] [Return to Nationality and Languages]
```

### Draft unavailable

```text
This manager draft is no longer available.

[Return to Add Manager]
```

### Preview unavailable

```text
The background effect preview is temporarily unavailable.

Your selections are preserved. The configuration will be validated again
before continuing.

[Retry Preview]
```

### Save failure

```text
Manager background could not be saved.

Your current values remain on this screen.

[Retry Save] [Keep Editing]
```

### User preset incompatible

```text
This archetype preset was created for a different attribute policy.

No changes were applied.

[View Differences] [Close]
```

### Upstream stage changed

```text
Nationality or language details changed in another session.

Reload the manager draft before continuing.

[Reload Draft]
```

---

## 36. Accessibility requirements

### 36.1 Form controls

Every selector requires:

- Persistent label.
- Current value.
- Description.
- Constraint explanation when disabled.
- Programmatically associated validation message.

### 36.2 Archetype controls

Expose archetypes as a radio group or single-selection list.

Each option should announce its emphasis summary.

Example:

```text
Tactician archetype, emphasizes Tactical Insight, replaces the current
allocation if selected.
```

### 36.3 Attribute steppers

Each stepper must announce:

- Attribute name.
- Current value.
- Minimum.
- Maximum.
- Points remaining.

Example:

```text
Tactical Insight, value 3 of 5. Zero allocation points remaining.
```

### 36.4 Live announcements

Use polite announcements for meaningful changes:

```text
Tactician archetype applied. Zero points remaining.
Leadership increased to 3. One point remaining.
Manager background draft saved.
```

Do not announce the entire preview after every single step.

### 36.5 Error focus

After Continue with errors:

- Focus an error summary.
- Link each issue to the relevant selector or attribute.
- Preserve valid values.
- Do not move focus because an asynchronous preview completes.

### 36.6 Non-color indicators

Strength, specialization, remaining points, warnings, and disabled states require text or icon-plus-text communication.

---

## 37. Keyboard interaction

- `Tab` and `Shift+Tab`: move between controls.
- Arrow keys: navigate selectors and archetype options.
- `Space`: select an archetype option.
- Left or Down: decrement a focused attribute stepper.
- Right or Up: increment a focused attribute stepper.
- `Home`: set the focused attribute to its minimum.
- `End`: set it to the maximum currently permitted.
- `Ctrl+S`: save the draft.
- `Ctrl+Enter`: continue when valid, if enabled.
- `Escape`: close a preview or dialog, then request Back.

Keyboard operations must use the same validation path as pointer operations.

---

## 38. Localization requirements

- Localize all profile, qualification, reputation, archetype, and attribute labels.
- Use complete message templates.
- Preserve stable IDs independently from display names.
- Support right-to-left layouts.
- Support long descriptions and labels.
- Localize point counts and plural forms.
- Avoid English-centric assumptions about playing-level terminology.
- Use fictional or licensed qualification labels.
- Do not concatenate translated fragments to build effect previews.

---

## 39. Responsive behavior

### Wide desktop

Use experience controls on one side and archetype allocation with preview on the other.

### Standard desktop

Use a main form column with a trailing preview panel.

### Narrow desktop

Stack:

```text
Experience
Qualifications
Reputation
Archetype selector
Attribute steppers
Points summary
Effect preview
Actions
```

### High text scaling

- Put labels above selectors.
- Let descriptions wrap.
- Keep each stepper's controls adjacent to its value.
- Display points remaining in a persistent position.
- Prevent footer overlap.

### Ultrawide display

Use a readable maximum width. Do not stretch allocation rows across the entire display.

---

## 40. Security and integrity requirements

Treat preset names, database labels, policy values, draft values, and renderer commands as untrusted.

Protect against:

- Unknown profile IDs.
- Unknown attribute IDs.
- Missing required attributes.
- Duplicate attribute IDs.
- Noninteger or overflowed values.
- Forged point totals.
- Unsupported policy versions.
- Malicious preset payloads.
- Script and markup injection.
- Invalid Unicode.
- Unauthorized draft access.
- Stale revision overwrite.
- Forged preview results.

Rules:

1. Render all labels as text.
2. Validate every ID in a trusted process.
3. Recalculate point totals outside the renderer.
4. Obtain the total budget and bounds from named policy values.
5. Reject unknown or duplicate allocation keys.
6. Validate user-preset schemas and fingerprints.
7. Revalidate ownership before Save and Continue.
8. Use expected revisions and idempotency keys.
9. Recalculate authoritative derivation before completion.
10. Do not trust renderer-supplied preview values.

---

## 41. Persistence rules

Persist in the manager draft:

- Playing-career profile ID.
- Coaching-qualification profile ID.
- Starting-reputation profile ID.
- Selected archetype ID.
- Canonical allocation map.
- Archetype policy version.
- Derivation policy version.
- Draft revision.
- Stage status.
- Warning acknowledgments tied to the background fingerprint.

Do not persist as canonical manager data:

- Transient hover descriptions.
- Obsolete preview results.
- Renderer-calculated point totals.
- Invalid partial allocations.
- Unvalidated user presets.
- Partial save transactions.

---

## 42. Observability

Useful operational events:

- Screen opened.
- Background policy loaded or failed.
- Built-in archetype applied.
- User preset compatibility failure.
- Validation issue codes.
- Preview failure category.
- Save success or failure.
- Revision conflict.
- Stage completed.

Avoid recording in telemetry:

- Manager name.
- Nationality or language selections.
- Exact custom allocation unless explicitly allowed for aggregate balancing research.
- Participant identity.
- Club preference.

---

## 43. Edge cases

### Policy budget changes

If the point budget changes after a draft was saved, require explicit migration or reallocation. Do not silently discard points.

### Attribute schema changes

Use explicit stable-ID migration. Do not map by similar display names.

### Preset total is invalid

Reject the preset during policy validation and do not expose it as selectable.

### All points allocated to a narrow specialization

Allow it if within policy. Show the resulting tradeoff neutrally.

### Unspent points allowed

Display the consequence clearly. Continue may proceed only if policy permits unspent points.

### Reputation becomes invalid after background change

Keep the previous value visible as invalid and guide the user to an allowed choice, or preview a policy-defined adjustment requiring acknowledgment.

### Qualification removed by content update

Mark the value unavailable and require replacement. Do not select a similarly named qualification automatically.

### Preview finishes after a new allocation

Discard it using the request revision and fingerprint.

### Same draft opened in two sessions

Reject stale saves and offer reload or difference review.

### Multiplayer policy changes capacity or budget

Refresh constraints without silently changing the current allocation. Block Continue until reconciled.

### Continue during preview calculation

Perform authoritative validation independently. The visual preview does not determine correctness.

---

## 44. Acceptance criteria

The screen is complete when:

1. It opens only for an authorized incomplete draft with prior stages complete.
2. Playing career, qualification, reputation, and archetype are distinct concepts.
3. Every selectable profile uses a stable policy-defined ID.
4. Reputation affects initial perception rather than directly replacing attributes.
5. Playing background does not guarantee managerial competence.
6. Qualification affects only explicitly modeled knowledge and eligibility.
7. The archetype policy exposes a named total allocation budget.
8. The default policy supports a 12-point allocation without embedding that value in formulas.
9. Every allocation uses known unique high-level attribute IDs.
10. Per-attribute minima and maxima come from policy.
11. Point totals are recalculated in a trusted process.
12. Built-in presets are validated against the active policy.
13. A custom distribution changes the archetype label appropriately.
14. Applying a preset replaces custom values only through an explicit atomic action.
15. Derived previews are qualitative, revision-aware, and nonauthoritative.
16. Unusual but valid background combinations are not blocked arbitrarily.
17. Invalid reputation or qualification combinations produce clear guidance.
18. Save Draft is atomic, revision-checked, and idempotent.
19. Unsaved edits are handled explicitly on Back.
20. Continue revalidates ownership, upstream revision, profiles, allocations, totals, and policy versions.
21. Continue creates exactly one completed ManagerBackgroundSnapshot.
22. Duplicate Continue activation is prevented.
23. Concurrent edits cannot silently overwrite a newer draft.
24. Keyboard users can select profiles and allocate every point.
25. Screen-reader users receive labels, stepper values, limits, points remaining, and errors.
26. High text scaling and right-to-left layouts remain usable.
27. Successful completion navigates to Club Selection.
28. No proprietary artwork, exact wording, source code, logos, or original database content is required.

---

## 45. Recommended tests

### Unit tests

- Playing-career profile validation.
- Qualification profile validation.
- Reputation constraint calculation.
- Attribute-schema validation.
- Allocation minimum and maximum validation.
- Configured point-total calculation.
- Remaining-point calculation.
- Preset total validation.
- Archetype exact-match detection.
- Custom-label derivation.
- Preset compatibility fingerprint.
- Warning-acknowledgment invalidation.
- Preview-fingerprint generation.
- Draft dirty-state derivation.

### Integration tests

- Select each playing-career level.
- Select each qualification level.
- Apply an allowed reputation profile.
- Reject a disallowed reputation profile.
- Apply Balanced.
- Apply Tactician.
- Create a custom distribution.
- Restore Balanced from a custom distribution.
- Save and resume the background draft.
- Continue to Club Selection.
- Return from Club Selection and restore values.
- Navigate Back with unsaved edits.
- Apply a compatible user preset.
- Reject an incompatible user preset without changing state.

### Concurrency tests

- Save from two sessions using one revision.
- Upstream stage changes while the screen is open.
- Preview responses arrive out of order.
- Apply preset while a preview is running.
- Autosave overlaps manual Save.
- Continue is activated twice rapidly.
- Draft ownership changes during Save.

### Security tests

- Unknown playing-career ID.
- Unknown qualification ID.
- Unknown reputation ID.
- Unknown attribute ID.
- Duplicate allocation key.
- Missing required allocation key.
- Noninteger allocation.
- Integer overflow.
- Forged point total.
- Unsupported policy version.
- Malicious preset name.
- Oversized preset payload.
- Markup-like labels.
- Unauthorized manager draft.
- Stale revision overwrite.
- Forged preview payload.

### Accessibility tests

- Keyboard-only background completion.
- Archetype radio-group navigation.
- Attribute-stepper operation.
- Points-remaining announcement.
- Disabled-selector explanation.
- Preset replacement dialog focus.
- Error-summary links.
- Save-status announcement.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long localized qualification and archetype labels.

### Visual regression tests

Capture at least:

- Default Balanced background.
- Tactician preset.
- Player Developer preset.
- Custom distribution.
- Points remaining.
- Invalid point total.
- Reputation constraint warning.
- Qualification eligibility note.
- Preset replacement dialog.
- User-preset incompatibility.
- Preview updating state.
- Draft save failure.
- Unsaved-changes dialog.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 46. Condensed LLM implementation brief

```text
Implement a desktop Manager Background screen for an original football-
management simulation. It edits an authorized incomplete ManagerDraft after
Nationality and Languages and before Club Selection.

Keep playing-career level, coaching qualification, starting reputation, and
managerial attributes as separate concepts. Playing background and reputation
may affect recognition, expectations, eligibility, and opportunity previews,
but must not automatically determine tactical or coaching competence.
Qualifications affect only explicitly modeled preparation and job eligibility.

Provide policy-defined playing-career, qualification, and reputation choices
using stable IDs. The trusted domain layer supplies permitted choices,
defaults, constraints, and explanation codes. Do not recreate eligibility
rules in the renderer.

Provide original manager archetypes such as Balanced, Tactician, Player
Developer, Motivator, Recruiter, Club Builder, and Custom. Allocate a fixed
policy-defined pool across Tactical Insight, Player Development, Leadership,
Recruitment, and Club Management. The default policy uses 12 points, but the
total, minimum, and maximum values must come from named configuration and must
never be embedded as literals inside allocation formulas.

Every increment and decrement updates points remaining and changes the selected
archetype to Custom unless the allocation exactly matches a validated preset.
Applying a preset is an explicit atomic replacement. Validate built-in and user
presets against the attribute-schema fingerprint, policy version, per-attribute
bounds, and configured total. Never migrate attributes by similar display name.

Show a qualitative, nonauthoritative preview of starting strengths, likely job
opportunities, qualification implications, and reputation expectations. Preview
requests must be debounced, cancellable, fingerprinted, and revision-aware.
Discard stale results and recalculate authoritatively on Continue.

Use optimistic manager-draft revisions and idempotency request IDs. Save Draft
must validate all profile IDs, allocation keys, integer values, bounds, totals,
and policy versions in a trusted process. Do not trust renderer-calculated point
totals or derived previews.

On Continue, revalidate ownership and upstream revisions, resolve all background
constraints, calculate authoritative derived data, acknowledge current warnings,
save one immutable ManagerBackgroundSnapshot, advance the draft, and navigate
to Club Selection. Prevent duplicate submission. Back preserves saved values and
handles unsaved edits explicitly.

Support complete keyboard allocation, accessible radio groups and steppers,
visible focus, points-remaining announcements, linked validation errors, high
text scaling, localization, and right-to-left layouts. Treat policy labels,
preset names, draft values, and renderer commands as untrusted. Do not copy
proprietary artwork, exact wording, source code, logos, or databases.
```

---

## 47. Next planned item

**Screen 11: Club Selection** should define eligible and ineligible clubs, playable-competition filtering, club search, vacancy and incumbent-manager policies, club information previews, board expectations, squad and financial summaries, national-team selection where supported, unemployed start, multiplayer conflicts, final selection validation, and transition to Manager Confirmation.

---

## Suggested Git commit

```text
feat(docs): specify manager background screen
```
