# Screen 9: Manager Nationality and Languages

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, databases, source code, logos, exact interface wording, or other protected assets. Use an original visual identity and fictional or properly licensed football data.

---

## 1. Purpose

The **Manager Nationality and Languages** screen defines the manager draft's national affiliations and communication abilities.

It appears after **Manager Personal Details** and before **Manager Background**.

The screen must allow the user to:

- Select a primary nationality.
- Select additional nationalities when permitted.
- Understand the distinction between nationality, place of birth, residence, and language ability.
- Select spoken languages.
- Assign a proficiency level to each selected language.
- Apply sensible suggestions derived from nationality or place of birth without making irreversible assumptions.
- Understand the gameplay effects of nationality and language choices.
- Detect duplicate, conflicting, unavailable, or unsupported selections.
- Save progress as part of the manager draft.
- Return to Personal Details without losing saved values.
- Continue to Manager Background only after validation succeeds.

This screen configures identity and communication data. It does not select a club, grant work authorization automatically, determine tactical ability, or activate the manager in the career.

---

## 2. Position in the manager-creation flow

```text
Add Manager
    |
    v
Manager Personal Details
    |
    | Personal details stage complete
    v
Manager Nationality and Languages
    |
    | Nationality and language stage complete
    v
Manager Background
    |
    v
Club Selection or Start Unemployed
    |
    v
Manager Confirmation
    |
    v
Career Inbox
```

When a draft is resumed, the screen should restore the latest valid saved selections and clearly distinguish them from unsaved edits.

---

## 3. Core concepts

### 3.1 Primary nationality

The primary nationality is the manager's principal national identity for career presentation and relevant game rules.

It may influence:

- Biography and profile display.
- Initial football-world familiarity.
- Reputation calculations where explicitly designed.
- Media context.
- National-team employment eligibility where modeled.
- Work-permission or registration logic where modeled.
- Default language suggestions.
- Club and supporter perception where explicitly modeled.

Primary nationality must not determine personality, tactical skill, intelligence, or moral character.

### 3.2 Additional nationality

An additional nationality represents another valid national affiliation.

It may influence:

- Employment eligibility.
- National-team management eligibility.
- Regional familiarity.
- Language suggestions.
- Media and biography text.

The number of additional nationalities must be controlled by named policy values.

### 3.3 Place of birth

Place of birth was configured on the previous screen. It is not equivalent to nationality.

A manager may:

- Be born in one nation and hold another nationality.
- Hold multiple nationalities.
- Speak languages unrelated to nationality.
- Decline to specify a place of birth while still selecting nationality.

### 3.4 Language

A language is a stable database or product entity representing a spoken communication system used by people and football organizations.

### 3.5 Language proficiency

Proficiency describes the manager's ability to communicate in a selected language.

Recommended normalized levels:

```typescript
type LanguageProficiency =
  "basic" | "conversational" | "professional" | "fluent" | "native_or_bilingual";
```

Alternative labels may be localized, but the stored semantic levels should remain stable.

### 3.6 Suggested selection

A suggested nationality or language is a reversible convenience based on existing draft values and database metadata.

Suggestions must not be silently committed as facts.

### 3.7 Familiarity

Familiarity is a derived gameplay concept describing the manager's knowledge of a football culture, region, or competition.

Nationality and language may contribute to familiarity, but the derivation belongs to the domain layer and should not be hardcoded in the form.

---

## 4. Entry contract

```typescript
interface OpenManagerNationalityLanguagesRequest {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly expectedDraftRevision: number;
  readonly personalDetailsStageRevision: number;
  readonly controllerContextId: string;
}
```

Before allowing edits, verify:

- The career exists.
- The manager draft exists and remains incomplete.
- The current controller may edit the draft.
- The Personal Details stage is complete.
- The expected draft revision is current.
- The selected place of birth, if any, still resolves.
- Nation and language metadata are available.
- The manager has not already become active.

---

## 5. Conceptual desktop layout

```text
+---------------------------------------------------------------------------------+
| CREATE MANAGER                     Step 2 of 5: Nationality and Languages       |
|---------------------------------------------------------------------------------|
| NATIONALITY                                                                     |
|                                                                                 |
| Primary nationality *   [Search nations...____________________] [Select]        |
|                         Example Federation                                      |
|                                                                                 |
| Additional nationality [Search nations...____________________] [Add]            |
|                         North Republic                              [Remove]    |
|                                                                                 |
| Place of birth          Brasília, Example Federation                            |
|                         This does not automatically determine nationality.      |
|                                                                                 |
| [Apply Suggested Nationality]                                                   |
|---------------------------------------------------------------------------------|
| LANGUAGES                                                                       |
|                                                                                 |
| Language                 Proficiency                           Actions          |
| Example Portuguese       Native or bilingual [v]              [Remove]          |
| International English    Professional         [v]              [Remove]         |
|                                                                                 |
| [+ Add Language]                                                                |
|                                                                                 |
| Suggestions                                                                     |
| [Add Example Portuguese] [Add Regional Spanish]                                 |
|                                                                                 |
| Communication summary: Strong communication in 2 selected languages             |
|---------------------------------------------------------------------------------|
| Draft saved 16:47                                                               |
| [Back]                                      [Save Draft]             [Continue] |
+---------------------------------------------------------------------------------+
```

Narrow layout:

```text
Create Manager
Nationality and Languages

Primary nationality
[Search__________________]
[Selected nation]

Additional nationalities
[Selected nation] [Remove]
[Add nationality]

Languages
[Language]
[Proficiency]
[Remove]

[Add language]

[Back] [Save Draft] [Continue]
```

These diagrams define behavior and information hierarchy rather than exact styling.

---

## 6. Screen regions

### 6.1 Header

Display:

- `Create Manager`.
- Current stage.
- Step indicator when stable.
- Draft save status.
- Back navigation.

### 6.2 Nationality section

Contains:

- Primary nationality selector.
- Additional nationality list.
- Add and remove controls.
- Place-of-birth reference.
- Suggestions and explanations.
- Eligibility or gameplay summary where appropriate.

### 6.3 Languages section

Contains:

- Selected language list.
- Proficiency selector per language.
- Add Language action.
- Suggested-language actions.
- Communication summary.

### 6.4 Gameplay-effects summary

Optional panel explaining effects without revealing hidden formulas:

- Familiarity.
- Communication.
- Employment eligibility.
- Media context.

### 6.5 Footer actions

Recommended actions:

- `Back`
- `Save Draft`
- `Continue`

---

## 7. Nation data model

```typescript
interface NationSelectionReference {
  readonly nationId: string;
  readonly displayName: string;
  readonly shortDisplayName?: string;
  readonly associationId?: string;
  readonly regionIds: readonly string[];
  readonly availableForManagerNationality: boolean;
}
```

Nationality selectors must use stable nation IDs. Display names may be localized and can change without altering the identity reference.

### 7.1 Nation availability

A nation may be unavailable for manager nationality when:

- It is a historical nation not valid at the career start date.
- It is a regional football association rather than a nationality.
- It is incomplete custom-database metadata.
- Product policy excludes it from manager creation.

Unavailable nations may appear read-only in existing drafts but must not be selectable for new values.

---

## 8. Primary nationality behavior

### 8.1 Selection

Selecting a primary nationality must:

1. Validate the nation ID.
2. Confirm it is selectable at the career start date.
3. Remove it from additional-nationality candidates.
4. Recalculate language suggestions.
5. Recalculate derived familiarity previews.
6. Revalidate national-team and employment summaries.
7. Mark the draft dirty.

### 8.2 Changing primary nationality

If the new primary nationality already exists as an additional nationality, swap or promote it according to a clear policy.

Recommended behavior:

```text
Make North Republic the primary nationality?

Example Federation will become an additional nationality.

[Cancel] [Change Primary Nationality]
```

If the additional-nationality limit is already reached, the old primary nationality may replace the promoted entry without increasing the total count.

### 8.3 Required state

Primary nationality is normally required. If a scenario supports unknown or stateless identity, it must be represented explicitly through policy rather than an empty required field.

---

## 9. Additional nationalities

### 9.1 Capacity

```typescript
interface ManagerNationalityPolicy {
  readonly requirePrimaryNationality: boolean;
  readonly maximumAdditionalNationalities: number;
  readonly allowStatelessIdentity: boolean;
  readonly allowHistoricalNationReferences: boolean;
  readonly eligibilityValidationPolicyId: string;
}
```

### 9.2 Add behavior

The Add action opens a searchable selector excluding:

- The current primary nationality.
- Already selected additional nationalities.
- Unavailable nations.

### 9.3 Remove behavior

Removing an additional nationality:

- Does not change primary nationality.
- Recalculates suggestions and gameplay previews.
- Invalidates acknowledgments tied to that nationality.
- Does not remove selected languages automatically.

A language can remain valid without a corresponding nationality.

### 9.4 Ordering

Additional nationalities may be ordered by:

- User selection order.
- Database-defined priority.
- Locale-aware display name.

If order has gameplay meaning, expose reorder controls and document it. Otherwise, treat additional nationalities as an unordered semantic set.

---

## 10. Nationality eligibility

The product may choose one of two policies.

### 10.1 Free profile creation

Users may select any supported nationality for their fictional manager.

This is the simplest and most flexible policy.

### 10.2 Relationship-based eligibility

A scenario may require an explicit relationship through:

- Place of birth.
- Parent nationality.
- Residency.
- Scenario background.
- Existing authenticated profile data, only with explicit consent.

If used, eligibility rules must be transparent and configurable.

The game must not pretend to perform real legal citizenship verification.

---

## 11. Place-of-birth suggestion

If a place of birth is selected, the screen may suggest its nation as primary nationality.

```text
Suggested from place of birth: Example Federation

[Apply Suggestion]
```

Rules:

- Do not apply automatically.
- Do not overwrite an existing primary nationality silently.
- Do not remove additional nationalities.
- Hide the suggestion if already represented.
- Explain that place of birth and nationality are distinct.

---

## 12. Language data model

```typescript
interface LanguageReference {
  readonly languageId: string;
  readonly displayName: string;
  readonly endonym?: string;
  readonly scriptIds: readonly string[];
  readonly associatedNationIds: readonly string[];
  readonly associatedRegionIds: readonly string[];
  readonly availableForManagerProfile: boolean;
}
```

The language list must be database-driven or product-configured. Do not derive languages solely from country names.

### 12.1 Language identity

A language ID should remain stable across localization changes.

### 12.2 Language variants

If the simulation distinguishes variants, model them explicitly:

```text
Language
  -> Variant
```

Do not create variants merely for display if they have no gameplay meaning.

---

## 13. Selected-language model

```typescript
interface ManagerLanguageSelection {
  readonly languageId: string;
  readonly proficiency: LanguageProficiency;
  readonly source: "user" | "suggestion" | "restored";
}
```

A manager may select a language only once. Changing proficiency updates the existing selection rather than adding a duplicate row.

---

## 14. Add Language workflow

```text
Add Language

Search [____________________________]

Example Portuguese
Regional Spanish
International English
Northern Sign Language

[Cancel]
```

After selection:

```text
Proficiency
(o) Basic
( ) Conversational
( ) Professional
( ) Fluent
( ) Native or bilingual

[Cancel] [Add Language]
```

The language search should match:

- Localized name.
- Endonym.
- Supported alternative names.
- Database-defined search aliases.

Search aliases are data, not displayed identity.

---

## 15. Proficiency semantics

The game must define each proficiency level consistently.

### 15.1 Basic

- Handles simple greetings and limited instructions.
- Significant communication limitations remain.

### 15.2 Conversational

- Manages ordinary daily communication.
- Complex tactical, contractual, or media communication may remain limited.

### 15.3 Professional

- Communicates effectively in most football and workplace contexts.
- Minor limitations may remain in nuanced situations.

### 15.4 Fluent

- Communicates comfortably across nearly all relevant contexts.

### 15.5 Native or bilingual

- Uses the language at native or equivalent functional proficiency.

These labels should not be presented as certified real-world assessments.

---

## 16. Proficiency gameplay effects

Potential effects include:

- Speed of adaptation at clubs using the language.
- Communication with players and staff.
- Media-interaction effectiveness.
- Initial uncertainty in player relationships.
- Dressing-room cohesion modifiers.
- Scouting report comprehension where modeled.
- Reputation and employment fit in some contexts.

Effects must be bounded and must not make lower proficiency render the game unplayable.

The form should show qualitative effects, not hidden formulas.

Example:

```text
Professional proficiency supports effective communication in most club and
media situations.
```

---

## 17. Native-language suggestions

A nationality may suggest one or more associated languages.

Example:

```text
Suggested languages for Example Federation:

Example Portuguese     Suggested proficiency: Native or bilingual
Regional Spanish       Suggested proficiency: Conversational
```

Rules:

- Suggestions come from explicit metadata.
- Suggested proficiency is a default, not a fact.
- The user must apply each suggestion or an explicit Apply All action.
- Existing selections must not be downgraded.
- A language associated with several nations appears once.

---

## 18. Suggestion metadata

```typescript
interface NationalityLanguageSuggestionRule {
  readonly nationId: string;
  readonly languageId: string;
  readonly suggestedProficiency: LanguageProficiency;
  readonly priority: number;
  readonly explanationKey: string;
}
```

All suggestions should be traceable to a rule and explainable.

Do not infer language proficiency from ethnicity, name, portrait, or real-world stereotypes.

---

## 19. Minimum language requirement

A manager should normally have at least one selected language.

```typescript
interface ManagerLanguagePolicy {
  readonly minimumLanguages: number;
  readonly maximumLanguages: number;
  readonly permittedProficiencies: readonly LanguageProficiency[];
  readonly minimumPrimaryLanguageProficiency: LanguageProficiency;
  readonly requireOneFluentLanguage: boolean;
}
```

All limits must come from named policy values.

If at least one fluent language is required:

```text
Select at least one language at Fluent or Native or bilingual proficiency.
```

---

## 20. Primary communication language

The product may optionally require one selected language to be marked as the manager's primary communication language.

```typescript
interface ManagerCommunicationProfileDraft {
  readonly languages: readonly ManagerLanguageSelection[];
  readonly primaryLanguageId?: string;
}
```

If exposed:

- Exactly one selected language may be primary.
- Removing it requires selection of a replacement.
- Primary communication language affects default media and communication context, not interface localization.

The game's UI language remains an application preference and is not controlled by the manager's language profile.

---

## 21. Language ordering

Selected languages should be ordered by a clear policy:

- Primary first, if supported.
- Then proficiency.
- Then locale-aware name.

If order has no gameplay meaning, users should not be forced to reorder them manually.

---

## 22. Duplicate and conflicting selections

### Duplicate nationality

```text
North Republic is already selected as an additional nationality.
```

### Primary duplicated as additional

Promote, swap, or reject according to the defined interaction. Do not store duplicate IDs.

### Duplicate language

```text
International English is already selected. Its proficiency can be changed in
the language list.
```

### Unsupported language

```text
This language is no longer available in the current database configuration.
```

### Proficiency conflict

A restored proficiency unsupported by the current policy should be mapped only through an explicit migration rule. Otherwise require review.

---

## 23. Gameplay summary

An optional read-only summary may show:

```text
Manager profile summary

Primary nationality: Example Federation
Additional nationality: North Republic

Communication:
- Native or bilingual in Example Portuguese
- Professional in International English

Likely initial familiarity:
- Example Federation football culture: Strong
- North Republic football culture: Moderate
- International environments using English: Strong
```

The summary must label derived values as estimates or initial familiarity, not immutable traits.

---

## 24. Work permission and employment eligibility

If the game models work authorization, nationality may affect employment eligibility.

The screen should provide a neutral summary:

```text
Selected nationalities may affect work authorization in some competitions.
Exact eligibility will be evaluated when a job or contract is considered.
```

Do not claim legal accuracy unless the rule database explicitly supports the relevant season and jurisdiction.

Nationality selection must not silently grant eligibility outside modeled rules.

---

## 25. National-team management eligibility

If national-team employment has nationality restrictions:

- Explain this qualitatively.
- Evaluate exact eligibility in the domain layer.
- Do not assume primary nationality is the only possible basis.
- Allow database-specific policies.

Example:

```text
Your nationality profile may affect eligibility for some national-team roles.
```

---

## 26. Form behavior

### 26.1 Dirty state

```typescript
type NationalityLanguageDraftSaveState =
  "unchanged" | "unsaved" | "saving" | "saved" | "save_failed" | "conflicted";
```

### 26.2 Validation timing

- Validate required values on blur and submission.
- Detect duplicate items immediately.
- Do not display blocking errors for untouched optional fields.
- Recalculate suggestions after relevant changes.
- Debounce expensive familiarity previews.

### 26.3 Suggestion state

Suggestions should have:

```typescript
type SuggestionState = "not_applicable" | "available" | "applied" | "dismissed" | "stale";
```

A dismissed suggestion may return if the underlying nationality changes substantially.

---

## 27. Save Draft behavior

Selecting `Save Draft` must:

1. Commit open selectors.
2. Validate stable IDs.
3. Remove no item silently.
4. Normalize selected nationalities into a unique set.
5. Normalize selected languages into one row per language.
6. Validate proficiency values.
7. Validate policy capacities.
8. Save with expected draft revision.
9. Return the new revision.
10. Update save status.

```typescript
interface SaveManagerNationalityLanguagesCommand {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly expectedDraftRevision: number;
  readonly requestId: string;
  readonly nationality: ManagerNationalityDraft;
  readonly communication: ManagerCommunicationProfileDraft;
}
```

Repeated submission with the same request ID must be idempotent.

---

## 28. Continue behavior

Selecting `Continue` must:

1. Commit open editors.
2. Verify draft ownership and current revision.
3. Validate primary nationality.
4. Validate additional-nationality uniqueness and capacity.
5. Validate nationality availability at the career start date.
6. Validate language count and uniqueness.
7. Validate every proficiency level.
8. Validate primary communication language if supported.
9. Recalculate current warnings and gameplay summaries.
10. Require acknowledgment of current nonblocking warnings.
11. Save the completed stage atomically.
12. Advance the draft stage.
13. Navigate to Manager Background.

```typescript
interface ManagerNationalityLanguagesSnapshot {
  readonly managerDraftId: string;
  readonly draftRevision: number;
  readonly primaryNationalityId: string;
  readonly additionalNationalityIds: readonly string[];
  readonly languages: readonly ManagerLanguageSelection[];
  readonly primaryLanguageId?: string;
  readonly derivedFamiliarityPreview: readonly FamiliarityPreviewItem[];
  readonly acknowledgedWarningCodes: readonly string[];
  readonly completedAt: string;
}
```

Disable Continue immediately after activation and prevent duplicate stage completion.

---

## 29. Back behavior

Back returns to Manager Personal Details.

Rules:

- Preserve saved values.
- Prompt about unsaved edits.
- Keep the manager slot reserved.
- Do not alter Personal Details values automatically.
- If place of birth changed on the previous screen, mark relevant suggestions stale on return.

Unsaved-change dialog:

```text
Save nationality and language changes?

[Discard Unsaved Changes] [Keep Editing] [Save and Go Back]
```

The safe default is `Keep Editing`.

---

## 30. State model

```typescript
interface ManagerNationalityDraft {
  readonly primaryNationalityId: string | null;
  readonly additionalNationalityIds: readonly string[];
}
```

```typescript
interface ManagerNationalityLanguagesScreenState {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly draftRevision: number;
  readonly personalDetailsStageRevision: number;
  readonly placeOfBirth?: PlaceReference;
  readonly nationality: ManagerNationalityDraft;
  readonly communication: ManagerCommunicationProfileDraft;
  readonly nationalitySuggestions: readonly NationalitySuggestion[];
  readonly languageSuggestions: readonly LanguageSuggestion[];
  readonly familiarityPreview: readonly FamiliarityPreviewItem[];
  readonly validationIssues: readonly NationalityLanguageIssue[];
  readonly saveState: NationalityLanguageDraftSaveState;
  readonly searchState: "idle" | "searching" | "ready" | "failed";
  readonly submitting: boolean;
}
```

State crossing process or network boundaries must be serializable and schema-validated.

---

## 31. State transitions

```text
LOADING_DRAFT_STAGE
  |
  v
READY
  |
  +-- change nationality ---> DIRTY
  |                              |
  |                              v
  |                        UPDATING_SUGGESTIONS
  |                              |
  |                              v
  |                           DIRTY
  |
  +-- add language --------> DIRTY
  |
  +-- change proficiency --> DIRTY
  |
  +-- Save Draft ----------> VALIDATING_PARTIAL
  |                              |
  |                              +-- invalid -> DIRTY_WITH_ERRORS
  |                              +-- valid -> SAVING -> READY
  |
  +-- Continue ------------> VALIDATING_COMPLETE
                                 |
                                 +-- errors -> DIRTY_WITH_ERRORS
                                 +-- warnings -> AWAITING_ACKNOWLEDGMENT
                                 +-- valid -> SAVING_STAGE
                                               |
                                               v
                                      MANAGER_BACKGROUND
```

A stale revision moves the screen to `CONFLICTED` until resolved.

---

## 32. Commands and events

### 32.1 Commands

```text
LOAD_MANAGER_NATIONALITY_LANGUAGES
SEARCH_MANAGER_NATIONALITIES
SET_PRIMARY_NATIONALITY
ADD_ADDITIONAL_NATIONALITY
REMOVE_ADDITIONAL_NATIONALITY
APPLY_NATIONALITY_SUGGESTION
DISMISS_NATIONALITY_SUGGESTION
SEARCH_MANAGER_LANGUAGES
ADD_MANAGER_LANGUAGE
REMOVE_MANAGER_LANGUAGE
SET_MANAGER_LANGUAGE_PROFICIENCY
SET_PRIMARY_COMMUNICATION_LANGUAGE
APPLY_LANGUAGE_SUGGESTION
APPLY_ALL_LANGUAGE_SUGGESTIONS
DISMISS_LANGUAGE_SUGGESTION
SAVE_MANAGER_NATIONALITY_LANGUAGES_DRAFT
ACKNOWLEDGE_NATIONALITY_LANGUAGE_WARNING
REQUEST_BACK
REQUEST_CONTINUE
```

### 32.2 Events

```text
MANAGER_PRIMARY_NATIONALITY_CHANGED
MANAGER_ADDITIONAL_NATIONALITY_ADDED
MANAGER_ADDITIONAL_NATIONALITY_REMOVED
MANAGER_LANGUAGE_ADDED
MANAGER_LANGUAGE_REMOVED
MANAGER_LANGUAGE_PROFICIENCY_CHANGED
MANAGER_LANGUAGE_SUGGESTIONS_UPDATED
MANAGER_FAMILIARITY_PREVIEW_UPDATED
MANAGER_NATIONALITY_LANGUAGES_SAVED
MANAGER_DRAFT_CONFLICT_DETECTED
MANAGER_NATIONALITY_LANGUAGES_COMPLETED
```

Mutating commands require the manager draft ID, current revision where appropriate, and an idempotency request ID.

---

## 33. Asynchronous search and preview behavior

Nation and language search must be:

- Debounced.
- Cancellable.
- Query-revision aware.
- Locale-aware.
- Independent from form persistence.

```typescript
interface ReferenceSearchRequest {
  readonly queryRevision: number;
  readonly query: string;
  readonly locale: string;
  readonly excludedIds: readonly string[];
  readonly signal: AbortSignal;
}
```

Late results from an older query must be discarded.

Familiarity previews may also be asynchronous. They must be tied to the full current nationality and language fingerprint.

---

## 34. Concurrency and conflict handling

Potential conflicts:

- The same draft is edited on two devices.
- Personal Details changes place of birth in another session.
- Draft ownership changes.
- A language or nation becomes unavailable after a content update.
- Autosave overlaps manual Save.
- Continue overlaps a late suggestion calculation.

Policy:

- Use optimistic revision checks.
- Serialize writes per manager draft.
- Revalidate upstream stage revisions before Continue.
- Cancel stale searches and previews.
- Do not overwrite newer state silently.

Conflict message:

```text
This manager draft was changed in another session.

Review the latest saved values before continuing.

[Review Differences] [Reload Draft]
```

---

## 35. Validation issue model

```typescript
interface NationalityLanguageIssue {
  readonly code: string;
  readonly severity: "information" | "warning" | "blocking_error";
  readonly fieldId?: string;
  readonly entityId?: string;
  readonly messageKey: string;
  readonly parameters?: Readonly<Record<string, string | number>>;
}
```

Blocking issues:

- Missing required primary nationality.
- Unknown or unavailable nationality ID.
- Duplicate nationality ID.
- Too many additional nationalities.
- No required language.
- Duplicate language ID.
- Unsupported proficiency.
- Missing required fluent language.
- Primary language not present in selected languages.
- Unauthorized draft access.
- Stale upstream stage.

Warnings:

- Nationality differs from place-of-birth nation.
- No suggested national language selected.
- All selected languages have low proficiency.
- Selected nationality has limited football data in the database.
- Work-authorization implications may restrict some jobs.

A nationality differing from place of birth should normally be informational, not suspicious or blocking.

---

## 36. Error states

### Nation metadata unavailable

```text
Nationality data could not be loaded.

Your saved manager details remain unchanged.

[Retry] [Return to Personal Details]
```

### Language metadata unavailable

```text
Language data could not be loaded.

[Retry]
```

### Draft unavailable

```text
This manager draft is no longer available.

[Return to Add Manager]
```

### Save failure

```text
Nationality and language details could not be saved.

Your current selections remain on this screen.

[Retry Save] [Keep Editing]
```

### Upstream stage changed

```text
Manager Personal Details changed in another session.

Reload the draft before continuing.

[Reload Draft]
```

### Suggestion service failure

Suggestions are optional. Preserve manual editing and display a nonblocking message.

---

## 37. Accessibility requirements

### 37.1 Nation selectors

Expose nation search as an accessible combobox or searchable listbox.

Each result should announce:

- Nation name.
- Region context if needed.
- Selected, unavailable, or already used state.

### 37.2 Language list

Expose selected languages as a list or grid with:

- Language name.
- Proficiency.
- Primary status if supported.
- Remove action.

Example accessible label:

```text
Example Portuguese, Native or bilingual proficiency, primary communication
language, Remove action available.
```

### 37.3 Suggestions

Suggestion buttons must state the result:

```text
Add Example Portuguese at Native or bilingual proficiency.
```

### 37.4 Live announcements

Use polite updates:

```text
Primary nationality changed to Example Federation.
International English added at Professional proficiency.
Language suggestions updated.
Draft saved.
```

Do not announce every search result while the user types.

### 37.5 Error handling

After Continue with errors:

- Focus the error summary.
- Link each issue to its field or row.
- Preserve valid selections.
- Avoid moving focus while asynchronous suggestions update.

### 37.6 Non-color communication

Nationality, proficiency, warnings, and suggested states must use text or icon-plus-text, not color alone.

---

## 38. Keyboard interaction

- `Tab` and `Shift+Tab`: move between controls.
- Arrow keys: navigate search results and proficiency options.
- `Enter`: select a highlighted nation or language and activate buttons.
- `Space`: toggle suggestion selection or primary-language state where applicable.
- `Delete`: remove a focused additional nationality or language after confirmation or with immediate undo.
- `Ctrl+F`: focus the currently active search field.
- `Ctrl+S`: save the draft.
- `Ctrl+Enter`: continue when valid, if supported.
- `Escape`: close a selector or dialog, then request Back.

Keyboard input must never trigger duplicate additions.

---

## 39. Localization requirements

- Localize nation and language display names.
- Use endonyms as optional secondary labels, not replacements imposed on every locale.
- Apply locale-aware sorting and search.
- Preserve native scripts and diacritics.
- Support right-to-left layout.
- Localize proficiency labels and explanatory text.
- Use complete message templates.
- Keep nation, language, policy, and proficiency IDs language-independent.
- Do not assume one language per nation.
- Do not assume one nation per language.
- Do not concatenate translated fragments to build selection summaries.

---

## 40. Responsive behavior

### Wide desktop

Use separate nationality and language sections, potentially side by side when space allows.

### Standard desktop

Use one main form column and a secondary gameplay-summary panel.

### Narrow desktop

Stack:

```text
Primary nationality
Additional nationalities
Place-of-birth context
Languages
Suggestions
Gameplay summary
Actions
```

### High text scaling

- Put labels above controls.
- Let language rows wrap.
- Place proficiency below the language name if necessary.
- Keep Remove associated with the correct row.
- Avoid horizontal scrolling for ordinary form controls.

### Ultrawide display

Use a readable maximum width rather than stretching selectors across the screen.

---

## 41. Security and privacy requirements

Treat nation names, language names, search aliases, manager selections, and multiplayer messages as untrusted.

Protect against:

- Script and markup injection.
- Invalid Unicode.
- Bidirectional-control abuse.
- Oversized search text.
- Unknown stable IDs.
- Duplicate IDs.
- Forged proficiency values.
- Unauthorized draft access.
- Stale revision overwrite.
- Search-result injection.
- Enumeration of private profile data.

Rules:

1. Render labels as text.
2. Validate IDs in a trusted process.
3. Validate proficiency against the active policy.
4. Bound selected-item counts.
5. Bound search query length.
6. Use expected revisions and idempotency keys.
7. Revalidate ownership before Save and Continue.
8. Discard stale search and preview results.
9. Do not infer nationality or language from sensitive data.
10. Do not expose nationality-language selections outside career visibility policy.

---

## 42. Persistence rules

Persist in the manager draft:

- Primary nationality ID.
- Unique additional-nationality IDs.
- Unique selected language IDs.
- Proficiency per language.
- Primary communication language if supported.
- Draft revision.
- Stage status.
- Current warning acknowledgments tied to a selection fingerprint.

Do not persist:

- Search queries as canonical manager data.
- Search-result lists.
- Unapplied suggestions.
- Duplicate IDs.
- Stale familiarity previews as canonical traits.
- Partial save transactions.

Familiarity should be derived or committed later through an explicit activation policy.

---

## 43. Observability

Useful operational events:

- Screen opened.
- Metadata load success or failure.
- Nation or language search failure category.
- Validation issue codes.
- Suggestion application counts.
- Draft save success or failure.
- Revision conflict.
- Stage completion.

Avoid recording in telemetry:

- Exact nationality selections.
- Exact language selections.
- Manager name.
- Place of birth.
- Participant identity.

Aggregate product analytics should be privacy-preserving and optional where required.

---

## 44. Edge cases

### Nation has no associated languages

Show no automatic suggestions and allow manual language selection.

### Nation has several official or common languages

Show all configured suggestions with explicit suggested proficiency values.

### Language belongs to many nations

Represent one stable language entry and avoid duplicate rows.

### Primary nationality changes after suggestions were applied

Do not remove user-selected languages. Mark affected suggestion provenance as stale or user-retained.

### Additional nationality removed

Keep languages unless the user removes them explicitly.

### Primary language is removed

Require a replacement or select one only through a documented policy with clear notification.

### Language metadata changes between versions

Use stable-ID migration. Do not map solely by display-name similarity.

### Historical nation becomes invalid at career start

Require a valid current nationality unless historical identities are explicitly supported.

### Stateless manager

Allow only if the active policy supports it and ensure later eligibility systems handle the state explicitly.

### Visually identical nation names

Show region or association context in search results.

### Search completes after the selector closes

Discard the result.

### Draft changes on another session

Reject stale save and offer reload or difference review.

### Maximum language count reached

Disable Add Language with an explanation while keeping existing rows editable.

---

## 45. Acceptance criteria

The screen is complete when:

1. It opens only for an authorized manager draft with completed Personal Details.
2. Primary nationality, additional nationality, place of birth, and language are modeled as distinct concepts.
3. Primary nationality uses a stable supported nation ID.
4. Additional nationalities are unique and policy-bounded.
5. Changing primary nationality handles an existing additional selection predictably.
6. Place of birth creates only an explicit optional suggestion.
7. No nationality is inferred from IP address, device locale, name, or portrait.
8. Language data comes from stable database or product metadata.
9. Selected languages are unique.
10. Each selected language has one valid proficiency.
11. Language suggestions are explainable, reversible, and never silently persisted as facts.
12. The system does not assume one language per nation or one nation per language.
13. Gameplay effects are qualitative, bounded, and derived in the domain layer.
14. Nationality does not determine personality or management ability.
15. Work and national-team eligibility are evaluated by explicit rules.
16. All capacities and minimums come from named policy values.
17. Search is cancellable and stale results are discarded.
18. Save Draft is atomic, revision-checked, and idempotent.
19. Unsaved edits are handled explicitly on Back.
20. Continue revalidates ownership, upstream revision, IDs, capacities, and proficiency.
21. Continue creates exactly one completed stage revision.
22. Concurrent edits cannot silently overwrite newer state.
23. Keyboard users can complete every selection.
24. Screen-reader users receive nation context, proficiency, suggestions, errors, and save state.
25. High text scaling and right-to-left layouts remain usable.
26. Successful completion navigates to Manager Background.
27. No proprietary artwork, exact wording, source code, logos, or original database content is required.

---

## 46. Recommended tests

### Unit tests

- Primary nationality validation.
- Additional-nationality uniqueness.
- Additional-nationality capacity.
- Primary and additional swap behavior.
- Place-of-birth suggestion generation.
- Language uniqueness.
- Proficiency validation.
- Minimum and maximum language count.
- Fluent-language requirement.
- Primary communication language validation.
- Suggestion deduplication.
- Familiarity-preview input generation.
- Warning-acknowledgment invalidation.
- Draft dirty-state derivation.
- Stable-ID migration.

### Integration tests

- Select a primary nationality.
- Add and remove additional nationalities.
- Promote an additional nationality to primary.
- Apply a place-of-birth suggestion.
- Add several languages.
- Change proficiency.
- Apply one language suggestion.
- Apply all suggestions without duplicates.
- Save and resume the draft.
- Continue to Manager Background.
- Return from Manager Background and restore values.
- Navigate Back with unsaved changes.
- Handle a nation with no language suggestions.
- Handle a multilingual nation.

### Concurrency tests

- Save from two sessions using the same revision.
- Personal Details changes while this screen is open.
- Ownership changes during Save.
- Search results arrive out of order.
- Suggestions update after a newer nationality change.
- Autosave overlaps manual Save.
- Continue is activated twice rapidly.

### Security tests

- Unknown nation ID.
- Unknown language ID.
- Forged proficiency value.
- Duplicate ID payload.
- Oversized selection arrays.
- Oversized search text.
- Markup-like nation and language labels.
- Invalid Unicode.
- Bidirectional-control abuse.
- Unauthorized manager draft.
- Stale revision overwrite.
- Reused idempotency key.
- Forged upstream stage revision.

### Accessibility tests

- Keyboard-only nationality selection.
- Searchable listbox navigation.
- Additional-nationality removal.
- Language-list navigation.
- Proficiency announcement.
- Suggested-action labels.
- Duplicate-error announcement.
- Error-summary links.
- Save-status announcement.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long localized nation and language names.

### Visual regression tests

Capture at least:

- Empty nationality and language form.
- Completed valid form.
- Multiple nationalities.
- Primary-nationality swap dialog.
- Place-of-birth suggestion.
- Multilingual suggestion set.
- Duplicate-language error.
- Maximum-language state.
- Gameplay summary.
- Draft saving state.
- Draft conflict state.
- Unsaved-changes dialog.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 47. Condensed LLM implementation brief

```text
Implement a desktop Manager Nationality and Languages screen for an original
football-management simulation. It edits an authorized incomplete
ManagerDraft after Personal Details and before Manager Background.

Model primary nationality, additional nationalities, place of birth, and
spoken languages as distinct concepts. The primary nationality is normally
required. Additional nationalities form a unique policy-bounded set. Use
stable nation IDs from validated metadata. Do not infer nationality from IP
address, locale, name, portrait, or place of birth. Place of birth may produce
an explicit reversible suggestion only.

Allow a configurable primary-nationality change workflow. If the selected
nation already exists as an additional nationality, preview a swap or
promotion rather than storing duplicate IDs. Capacity and eligibility rules
must come from a named ManagerNationalityPolicy.

Use a database-driven language list with stable IDs, localized names,
optional endonyms, and explicit associations to nations and regions. Do not
assume one language per nation or one nation per language. Each selected
language has exactly one semantic proficiency: Basic, Conversational,
Professional, Fluent, or Native or Bilingual. Enforce language counts and any
fluent-language requirement through a named ManagerLanguagePolicy.

Nationality-based language suggestions must come from explicit traceable
metadata. Suggestions are defaults, not facts. The user must apply them, they
must not downgrade existing selections, and duplicate languages must collapse
to one row. Never infer language proficiency from ethnicity, name, portrait,
or stereotypes.

Show qualitative effects on communication, adaptation, familiarity, media,
and possible employment eligibility without exposing or embedding hidden
formulas. Nationality must not determine personality, intelligence, tactical
skill, or moral character. Exact work and national-team eligibility must be
evaluated by explicit career rules.

Nation and language search must be locale-aware, debounced, cancellable, and
query-revision aware. Discard stale results. Use optimistic manager-draft
revision checks and idempotency request IDs for saves. Revalidate ownership,
upstream stage revision, IDs, capacities, and proficiency on Continue.

On Continue, save one immutable ManagerNationalityLanguagesSnapshot, advance
the manager draft, and navigate to Manager Background. Prevent duplicate
submission. Back must preserve saved values and handle unsaved edits
explicitly.

Support full keyboard operation, accessible combobox and list semantics,
visible focus, context-rich result labels, proficiency announcements,
error-summary links, high text scaling, localization, and right-to-left
layouts. Treat database labels, search aliases, IDs, selections, and renderer
commands as untrusted. Do not copy proprietary artwork, exact wording, source
code, logos, or databases.
```

---

## 48. Next planned item

**Screen 10: Manager Background** should define playing-career experience, coaching qualifications, prior reputation, preferred tactical style where appropriate, initial skill derivation, balanced archetype or attribute allocation, policy-driven defaults, gameplay consequences, validation, draft persistence, and transition to Club Selection.

---

## Suggested Git commit

```text
feat(docs): specify manager nationality and languages screen
```
