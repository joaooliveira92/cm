# Screen 8: Manager Personal Details

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, databases, source code, logos, exact interface wording, or other protected assets. Use an original visual identity and fictional or properly licensed football data.

---

## 1. Purpose

The **Manager Personal Details** screen collects the basic identity and local-control information for an incomplete human manager draft.

It appears after **Add Manager** creates or resumes a manager draft and before **Manager Nationality and Languages**.

The screen must allow the user to:

- Enter the manager's preferred display name.
- Enter structured name components when the product supports them.
- Choose how the manager's name appears throughout the interface.
- Enter a valid date of birth or select an age-based alternative where policy permits.
- Select a place of birth when supported by the world database.
- Configure an original portrait, generated avatar, initials badge, or no portrait.
- Configure local hot-seat privacy protection when supported.
- Understand whether another manager has a similar or identical display name.
- Review which fields are required and which are optional.
- Save progress as a manager draft.
- Return safely to Add Manager.
- Continue to Manager Nationality and Languages only after validation.

This screen creates a **manager identity draft**. It does not activate the manager, assign a club, create an inbox, or alter the football world.

---

## 2. Position in the manager-creation flow

```text
Add Manager
    |
    | Manager slot reserved and draft created
    v
Manager Personal Details
    |
    | Valid personal-details draft saved
    v
Manager Nationality and Languages
    |
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

When resuming a draft, this screen may open with previously saved values. It must distinguish saved values from unsaved edits.

---

## 3. Core concepts

### 3.1 Manager draft identity

The manager draft identity is the unconfirmed personal profile associated with a reserved manager slot.

It must remain separate from:

- The participant account.
- The local application profile.
- The manager's eventual club employment.
- The manager's nationality and language profile.
- The active career-manager record.

### 3.2 Legal or account identity

The game should not require a legal identity unless an external authenticated service explicitly needs it. A career manager can use a fictional display identity.

### 3.3 Display name

The display name is the principal name shown in:

- News headlines.
- Manager lists.
- Match reports.
- Club history.
- Competition records.
- Contracts and employment screens.
- Multiplayer manager lists.

### 3.4 Structured name

A structured name separates components such as given name, middle names, family name, and familiar name.

Structured names improve localization and sorting but must not force all cultures into one naming convention.

### 3.5 Name presentation format

The presentation format determines how valid name components are rendered.

Examples:

```text
Given name + family name
Family name + given name
Familiar name only
Custom display name
```

### 3.6 Date of birth

The date of birth establishes the manager's age at the career start date. It may affect:

- Biography text.
- Career-history dates.
- Age-based records.
- Retirement or long-term career rules, if modeled.
- Eligibility for specific scenarios, if explicitly supported.

### 3.7 Place of birth

Place of birth identifies a city, locality, or nation in the generated world. It must not be inferred automatically from IP address, device locale, or account location.

### 3.8 Portrait

A portrait is an optional visual representation of the manager. It may be:

- A generated original avatar.
- A user-provided image.
- A built-in original avatar.
- An initials badge.
- No portrait.

The product must not use unlicensed celebrity, player, or manager likenesses.

### 3.9 Local privacy protection

In hot-seat play, a manager may optionally use a local access code to reduce accidental access to private screens.

This is a local gameplay privacy feature, not a substitute for account authentication or encrypted network security.

---

## 4. Entry contract

The screen requires:

```typescript
interface OpenManagerPersonalDetailsRequest {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly managerSlotId: string;
  readonly expectedDraftRevision: number;
  readonly controllerContextId: string;
}
```

Before rendering editable data, the application must verify:

- The career exists and is readable.
- The manager draft exists.
- The manager slot remains reserved for the draft.
- The current controller owns or may edit the draft.
- The draft is not active, removed, retired, or claimed by another owner.
- The expected revision is current or can be refreshed safely.
- The career start date is available for age validation.
- Required geographic and naming metadata are available.

---

## 5. Conceptual desktop layout

```text
+--------------------------------------------------------------------------------+
| CREATE MANAGER                              Step 1 of 5: Personal Details       |
|--------------------------------------------------------------------------------|
| IDENTITY                                                                       |
|                                                                                |
| Given name *       [João____________________________________]                   |
| Family name *      [Monteiro________________________________]                   |
| Familiar name      [________________________________________]                   |
|                                                                                |
| Display as *       [João Monteiro___________________________]                   |
| Name format        [Given name + family name v]                                |
|                                                                                |
| Date of birth *    [12] [March v] [1975]                                       |
| Age at career start: 28                                                         |
|                                                                                |
| Place of birth     [Search city or nation...________________] [Select]          |
|                    Brasília, Example Federation                                |
|                                                                                |
| PORTRAIT                                                                       |
| +--------------+  [Use Initials] [Choose Built-in Avatar] [Upload Image]       |
| |      JM      |                                                             |
| +--------------+  [Remove Portrait]                                            |
|                                                                                |
| LOCAL PRIVACY                                                                  |
| [ ] Require an access code when switching to this manager                      |
|                                                                                |
| Draft saved 16:41                                                              |
|--------------------------------------------------------------------------------|
| [Back]                                      [Save Draft]             [Continue]|
+--------------------------------------------------------------------------------+
```

Narrow layout:

```text
Create Manager
Personal Details

Given name
[________________________]

Family name
[________________________]

Display name
[________________________]

Date of birth
[Day] [Month] [Year]

Place of birth
[Search__________________]

Portrait
[Avatar preview]
[Choose portrait]

[Back] [Save Draft] [Continue]
```

These diagrams define behavior and information hierarchy rather than exact styling.

---

## 6. Screen regions

### 6.1 Header

Display:

- `Create Manager`.
- Current stage, such as `Personal Details`.
- Stable step progress when the number of stages is fixed.
- Draft save status.
- Back navigation.

### 6.2 Identity section

Contains:

- Name fields.
- Display-name preview.
- Name-format selection.
- Date of birth.
- Age-at-start preview.
- Place of birth.

### 6.3 Portrait section

Contains:

- Current portrait preview.
- Initials option.
- Built-in avatar selection.
- User image selection where supported.
- Generated avatar option where supported.
- Remove portrait action.

### 6.4 Local privacy section

Contains optional local hot-seat privacy controls.

This section should not appear when the feature is unavailable or inappropriate for the career mode.

### 6.5 Footer actions

Recommended actions:

- `Back`
- `Save Draft`
- `Continue`

Optional actions:

- `Cancel Manager Creation`
- `Reset Unsaved Changes`
- `Preview Profile`

---

## 7. Name data model

The product should support culturally flexible names.

```typescript
interface ManagerNameDraft {
  readonly givenName?: string;
  readonly middleNames?: string;
  readonly familyName?: string;
  readonly additionalFamilyName?: string;
  readonly familiarName?: string;
  readonly customDisplayName?: string;
  readonly presentationFormatId: string;
  readonly sortName?: string;
}
```

Not every field needs to appear for every locale. The domain model may support more components than the default form exposes.

### 7.1 Minimum required name

At minimum, require one nonblank displayable name.

A configuration may require both given and family names, but this should be a product policy rather than an assumption that applies to every culture.

```typescript
interface ManagerNamePolicy {
  readonly requiredComponentIds: readonly string[];
  readonly allowMononym: boolean;
  readonly allowCustomDisplayName: boolean;
  readonly minimumDisplayLength: number;
  readonly maximumDisplayLength: number;
  readonly maximumComponentLength: number;
  readonly allowedPresentationFormatIds: readonly string[];
}
```

### 7.2 Name fields

Recommended fields:

- Given name.
- Middle names, optional.
- Family name.
- Additional family name, locale-dependent.
- Familiar name, optional.
- Custom display name, optional.

### 7.3 Display-name preview

The screen should continually preview the effective display name after normalization.

```text
Your manager will appear as: João Monteiro
```

The preview must not mutate the underlying values.

### 7.4 Sort name

The game may calculate a sort key using locale-aware rules. Users should not normally edit it unless the product explicitly supports a custom sort name.

---

## 8. Name normalization

Permitted normalization may include:

- Trimming leading and trailing whitespace.
- Collapsing repeated ordinary spaces according to policy.
- Unicode normalization.
- Rejecting line breaks and prohibited control characters.
- Preserving valid accents and writing systems.
- Preserving intentional punctuation such as apostrophes and hyphens.

The system should not:

- Force every name to title case.
- Remove diacritics.
- Convert names to ASCII.
- Reorder names without the selected presentation format.
- Treat visually different scripts as equivalent without explicit policy.

```typescript
interface NormalizedManagerName {
  readonly components: Readonly<Record<string, string>>;
  readonly displayName: string;
  readonly comparisonKey: string;
  readonly warnings: readonly NameNormalizationWarning[];
}
```

---

## 9. Name validation

Validation should detect:

- Entirely blank name.
- Component exceeding configured length.
- Display name exceeding configured length.
- Unsupported control characters.
- Newline characters.
- Invalid Unicode.
- Name consisting only of punctuation.
- Characters prohibited by multiplayer or save-format policy.
- Display name that becomes empty after normalization.

Do not reject valid names simply because they contain:

- Accented characters.
- Apostrophes.
- Hyphens.
- Multiple family-name components.
- Non-Latin scripts.
- A single name when mononyms are allowed.

---

## 10. Similar and duplicate names

Identical manager display names may be legal. The screen should warn rather than block unless a career policy requires uniqueness.

Example:

```text
Another human manager in this career is also named Alex Silva.

Managers will remain distinct by slot, owner, and career identifier.

[Change Name] [Use This Name]
```

Potential comparisons:

- Exact normalized display-name match.
- Same display name with different casing.
- Visually confusable Unicode sequence.
- Match with an active human manager.
- Match with an incomplete manager draft.

The game should not search all nonhuman football people merely to block common names.

```typescript
interface ManagerNameConflict {
  readonly type:
    "exact_human_manager_match" | "draft_match" | "visual_confusable" | "reserved_system_label";
  readonly severity: "information" | "warning" | "blocking_error";
  readonly conflictingManagerId?: string;
  readonly messageKey: string;
}
```

---

## 11. Reserved and misleading names

The product may restrict names that impersonate system roles in multiplayer contexts, such as labels equivalent to:

- Administrator.
- System.
- Server.
- Official support.

Restrictions must be locale-aware and policy-driven.

The game should avoid broad censorship of ordinary names. If a name is restricted, provide a clear neutral explanation and allow correction.

---

## 12. Date-of-birth input

### 12.1 Input methods

Support one or more of:

- Separate day, month, and year controls.
- A locale-aware date field.
- An accessible date picker.
- An age-at-career-start alternative that derives a date according to explicit policy.

Do not require users to type a locale-ambiguous numeric date without format guidance.

### 12.2 Career-relative age

Display the resulting age at the exact career start date.

```text
Age at career start: 28
```

Age calculation must use calendar dates, not a simple year subtraction.

### 12.3 Date policy

```typescript
interface ManagerBirthDatePolicy {
  readonly minimumAgeAtCareerStart: number;
  readonly maximumAgeAtCareerStart: number;
  readonly allowUnknownDay: boolean;
  readonly allowUnknownMonth: boolean;
  readonly defaultDateDerivationPolicyId?: string;
}
```

Every threshold must come from named configuration rather than a hidden literal in validation code.

### 12.4 Validation

Validate:

- Real calendar date.
- Leap year.
- Date before the career start date.
- Minimum and maximum manager age.
- Supported storage range.
- Scenario-specific eligibility rules.

### 12.5 Unknown day or month

If the product permits partial dates, represent uncertainty explicitly rather than inventing a date silently.

```typescript
interface PartialBirthDate {
  readonly year: number;
  readonly month?: number;
  readonly day?: number;
  readonly precision: "year" | "month" | "day";
}
```

If full dates are required by the world model, the derivation policy must be disclosed.

---

## 13. Place-of-birth selection

### 13.1 Search behavior

The place selector may search:

- Cities.
- Towns.
- Administrative areas.
- Nations.
- Database-defined places.

Search results should include enough context to distinguish identical names.

```text
Springfield, North Province, Exampleland
Springfield, Coast District, North Republic
```

### 13.2 Place hierarchy

```typescript
interface PlaceReference {
  readonly placeId: string;
  readonly displayName: string;
  readonly placeType: "city" | "town" | "region" | "nation" | "other";
  readonly parentDisplayNames: readonly string[];
  readonly nationId: string;
}
```

### 13.3 Optional place

If place of birth is optional, the clear value should be `Not specified`, not an invented city based on locale.

### 13.4 Missing place

Allow nation-only selection when the database lacks a desired city, if supported by policy.

Do not permit arbitrary free text if later systems require a stable geographic ID, unless the model includes a separate user-entered label with no geographic semantics.

### 13.5 Search state

The place search must be cancellable and revision-aware. Late results must not replace newer queries.

---

## 14. Portrait policy

```typescript
type ManagerPortraitSource =
  "none" | "initials" | "built_in_avatar" | "generated_avatar" | "user_image";
```

```typescript
interface ManagerPortraitDraft {
  readonly source: ManagerPortraitSource;
  readonly assetReferenceId?: string;
  readonly crop?: PortraitCrop;
  readonly generatedStyleId?: string;
  readonly initials?: string;
  readonly revision: number;
}
```

The canonical manager record should reference a managed asset rather than an arbitrary original file path.

---

## 15. Initials portrait

The initials portrait is the safest default.

It may derive initials from the effective display name according to a locale-aware policy.

Example:

```text
João Monteiro -> JM
```

The user may select:

- Background color from an accessible palette.
- Foreground color with enforced contrast.
- One or two initials where supported.

Do not derive colors from sensitive characteristics.

---

## 16. Built-in avatar selection

Built-in avatars must be original or properly licensed.

The selector should support:

- Search or category filters where many avatars exist.
- Keyboard selection.
- Clear focus and selected state.
- High-resolution previews.
- No implication that the avatar changes manager abilities.

Avatar metadata should avoid stereotypes and unnecessary demographic labeling.

---

## 17. Generated avatar

If the product supports generating a unique avatar:

- Use an approved image-generation service or local generator.
- Make the generated nature clear.
- Avoid reproducing real-person likenesses intentionally.
- Provide regenerate and remove controls.
- Record generation consent or invocation state where required.
- Validate the result before attaching it.
- Store only the managed output needed by the career.

Generated portraits are optional and must not block manager creation if the service is unavailable.

---

## 18. User-provided portrait

### 18.1 File selection

Accept only documented image types, such as:

- PNG.
- JPEG.
- WebP, when supported safely.

Reject files based on decoded content and schema, not extension alone.

### 18.2 Security validation

Validate:

- File type.
- File signature.
- Decoded dimensions.
- Pixel count.
- File size.
- Animation policy.
- Color profile policy.
- Metadata policy.
- Successful safe decode.

Protect against:

- Decompression bombs.
- Malformed images.
- Path traversal.
- Symbolic-link escape.
- Oversized images.
- Embedded scripts or unsupported containers.

### 18.3 Metadata handling

Strip unnecessary metadata, including location metadata, before storing the managed portrait.

### 18.4 Crop workflow

The crop editor should:

- Use a fixed portrait aspect ratio.
- Keep the crop within image bounds.
- Support zoom and pan.
- Support keyboard adjustment.
- Provide reset.
- Produce a normalized derivative.
- Preserve no arbitrary path to the original file.

### 18.5 Storage

Copy the normalized derivative to approved application storage under a generated asset ID. Do not depend on the user's original path after import.

---

## 19. Portrait fallback behavior

If portrait processing fails:

```text
The selected image could not be used.

Your manager details were preserved. Choose another image or continue with
an initials portrait.

[Choose Another Image] [Use Initials]
```

A portrait failure must not discard text-field edits.

---

## 20. Local hot-seat privacy

### 20.1 Purpose

An optional local access code can reduce accidental viewing of another local manager's private screens when several people share one device.

### 20.2 Disclosure

The interface must explain:

```text
This access code protects local manager switching only. It is not an online
account password and does not encrypt the career save.
```

### 20.3 Access-code policy

```typescript
interface LocalManagerAccessPolicy {
  readonly enabled: boolean;
  readonly minimumLength: number;
  readonly maximumLength: number;
  readonly permittedCharacterPolicyId: string;
  readonly retryLimitPolicyId: string;
  readonly lockoutPolicyId: string;
}
```

### 20.4 Storage

- Never store the access code in plaintext.
- Use a modern password-hashing mechanism with configured parameters.
- Never display the code after saving.
- Never include it in telemetry or ordinary logs.
- Provide an authorized reset workflow appropriate to local gameplay.

### 20.5 Network play

Network authentication should use participant accounts and session security. A local access code must not replace network authentication.

---

## 21. Form behavior

### 21.1 Dirty state

The screen tracks whether current values differ from the last persisted draft revision.

```typescript
type DraftSaveState = "unchanged" | "unsaved" | "saving" | "saved" | "save_failed" | "conflicted";
```

### 21.2 Field validation timing

- Validate required fields on blur and submission.
- Validate simple limits during input without disruptive dialogs.
- Do not show errors before the user has interacted with an empty optional field.
- Show blocking errors together in an error summary after Continue.

### 21.3 Unsaved-change behavior

If the user selects Back with unsaved changes:

```text
Save changes to this manager draft?

[Discard Unsaved Changes] [Keep Editing] [Save and Go Back]
```

The safe default is `Keep Editing`.

### 21.4 Autosave

Optional debounced autosave may be supported. It should:

- Save only valid serializable draft state.
- Not activate the manager.
- Use revision checks.
- Display save state.
- Retry transient failures conservatively.
- Never overwrite a newer revision from another session.

---

## 22. Save Draft behavior

Selecting `Save Draft` must:

1. Commit active field-editor values.
2. Normalize name data.
3. Validate values that are required for a partial draft.
4. Store portrait references only after successful managed import.
5. Hash any local access code before persistence.
6. Submit the expected draft revision.
7. Persist atomically.
8. Return the new draft revision.
9. Update the save-status indicator.

```typescript
interface SaveManagerPersonalDetailsCommand {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly expectedDraftRevision: number;
  readonly requestId: string;
  readonly details: ManagerPersonalDetailsInput;
}
```

Repeated requests with the same request ID must be idempotent.

---

## 23. Continue behavior

Selecting `Continue` must:

1. Commit active controls.
2. Normalize the manager name.
3. Validate all required personal details.
4. Validate date of birth against the career start date.
5. Validate place references.
6. Validate portrait asset state.
7. Check human-manager name conflicts.
8. Require acknowledgment of current nonblocking conflicts.
9. Save the personal-details stage atomically.
10. Advance the draft stage.
11. Navigate to Manager Nationality and Languages.

```typescript
interface ManagerPersonalDetailsSnapshot {
  readonly managerDraftId: string;
  readonly draftRevision: number;
  readonly name: NormalizedManagerName;
  readonly birthDate: PartialBirthDate;
  readonly placeOfBirth?: PlaceReference;
  readonly portrait?: ManagerPortraitDraft;
  readonly localPrivacyEnabled: boolean;
  readonly acknowledgedWarningCodes: readonly string[];
  readonly completedAt: string;
}
```

Disable Continue immediately after activation and ignore duplicate submissions.

---

## 24. Back behavior

Back returns to Add Manager.

Rules:

- Preserve saved draft values.
- Prompt about unsaved edits.
- Keep the slot reserved while the draft remains valid.
- Do not remove the draft automatically.
- Provide a separate explicit Remove Draft action on Add Manager.
- Release transient portrait-editor resources.

---

## 25. Cancel Manager Creation

If exposed, this action navigates to the same destructive draft-removal workflow used by Add Manager.

It must not combine silent navigation and draft deletion.

```text
Cancel manager creation and remove this draft?

[Keep Draft] [Remove Draft]
```

---

## 26. State model

```typescript
interface ManagerPersonalDetailsInput {
  readonly name: ManagerNameDraft;
  readonly birthDate: PartialBirthDate | null;
  readonly placeOfBirthId?: string;
  readonly portrait: ManagerPortraitDraft;
  readonly localPrivacy:
    | { readonly enabled: false }
    | {
        readonly enabled: true;
        readonly accessCodeSubmissionToken: string;
      };
}
```

```typescript
interface ManagerPersonalDetailsScreenState {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly managerSlotId: string;
  readonly draftRevision: number;
  readonly careerStartDate: string;
  readonly input: ManagerPersonalDetailsInput;
  readonly effectiveDisplayName: string;
  readonly ageAtCareerStart?: number;
  readonly nameConflicts: readonly ManagerNameConflict[];
  readonly validationIssues: readonly PersonalDetailsIssue[];
  readonly saveState: DraftSaveState;
  readonly portraitOperationState: "idle" | "selecting" | "processing" | "ready" | "failed";
  readonly submitting: boolean;
}
```

Sensitive access-code values must not be retained in ordinary renderer state longer than necessary. Prefer one-time secure submission tokens where the architecture supports them.

---

## 27. State transitions

```text
LOADING_DRAFT
  |
  v
READY
  |
  +-- edit field ----------> DIRTY
  |                            |
  |                            +-- Save Draft -> VALIDATING_PARTIAL
  |                            |                    |
  |                            |                    +-- invalid -> DIRTY_WITH_ERRORS
  |                            |                    +-- valid -> SAVING -> READY
  |                            |
  |                            +-- Continue -> VALIDATING_COMPLETE
  |                                                 |
  |                                                 +-- errors -> DIRTY_WITH_ERRORS
  |                                                 +-- warnings -> AWAITING_ACKNOWLEDGMENT
  |                                                 +-- valid -> SAVING_STAGE
  |                                                               |
  |                                                               v
  |                                               NATIONALITY_AND_LANGUAGES
  |
  +-- choose portrait -----> PROCESSING_PORTRAIT -> DIRTY
  |
  +-- Back ----------------> CHECKING_UNSAVED_CHANGES
                                 |
                                 +-- keep editing -> READY or DIRTY
                                 +-- discard -> ADD_MANAGER
                                 +-- save -> SAVING -> ADD_MANAGER
```

A draft conflict changes state to `CONFLICTED` and blocks saving until refreshed or resolved.

---

## 28. Commands and events

### 28.1 Commands

```text
LOAD_MANAGER_PERSONAL_DETAILS
SET_MANAGER_NAME_COMPONENT
SET_MANAGER_PRESENTATION_FORMAT
SET_MANAGER_CUSTOM_DISPLAY_NAME
SET_MANAGER_BIRTH_DATE
SEARCH_BIRTH_PLACES
SELECT_BIRTH_PLACE
CLEAR_BIRTH_PLACE
SELECT_INITIALS_PORTRAIT
SELECT_BUILT_IN_AVATAR
GENERATE_MANAGER_AVATAR
IMPORT_MANAGER_PORTRAIT
UPDATE_PORTRAIT_CROP
REMOVE_MANAGER_PORTRAIT
ENABLE_LOCAL_MANAGER_ACCESS_CODE
DISABLE_LOCAL_MANAGER_ACCESS_CODE
SET_LOCAL_MANAGER_ACCESS_CODE
SAVE_MANAGER_PERSONAL_DETAILS_DRAFT
ACKNOWLEDGE_MANAGER_NAME_WARNING
REQUEST_BACK
REQUEST_CONTINUE
REQUEST_CANCEL_MANAGER_CREATION
```

### 28.2 Events

```text
MANAGER_PERSONAL_DETAILS_LOADED
MANAGER_NAME_CHANGED
MANAGER_DISPLAY_NAME_DERIVED
MANAGER_NAME_CONFLICT_DETECTED
MANAGER_BIRTH_DATE_CHANGED
MANAGER_BIRTH_PLACE_SELECTED
MANAGER_PORTRAIT_IMPORTED
MANAGER_PORTRAIT_IMPORT_FAILED
MANAGER_LOCAL_PRIVACY_CHANGED
MANAGER_PERSONAL_DETAILS_SAVED
MANAGER_DRAFT_CONFLICT_DETECTED
MANAGER_PERSONAL_DETAILS_COMPLETED
```

Every mutating command should include the manager draft ID, expected revision where appropriate, and an idempotency request ID.

---

## 29. Concurrency and conflict handling

Potential conflicts:

- The same draft is edited on two devices.
- Ownership transfers while the screen is open.
- The draft is removed from Add Manager in another session.
- A network participant loses permission.
- A portrait import finishes after the draft revision changes.
- Autosave and manual Save overlap.

Recommended policy:

- Use optimistic revision checks.
- Serialize saves per draft.
- Cancel obsolete portrait operations.
- Reject stale saves rather than overwriting new state.
- Refresh authorization before Continue.

Conflict message:

```text
This manager draft was changed in another session.

Your unsaved values have not been applied. Review the latest saved version
before continuing.

[Review Differences] [Reload Draft]
```

Do not merge identity fields automatically unless the product implements a clear field-level merge workflow.

---

## 30. Validation issue model

```typescript
interface PersonalDetailsIssue {
  readonly code: string;
  readonly severity: "information" | "warning" | "blocking_error";
  readonly fieldId?: string;
  readonly messageKey: string;
  readonly parameters?: Readonly<Record<string, string | number>>;
}
```

Blocking examples:

- Required name missing.
- Invalid date.
- Manager below configured minimum age.
- Manager above configured maximum age.
- Unknown place ID.
- Portrait asset not safely processed.
- Draft ownership invalid.
- Access-code policy violation.

Warning examples:

- Duplicate human-manager display name.
- Visually confusable name.
- Place of birth not specified.
- Portrait omitted.

---

## 31. Error states

### 31.1 Draft unavailable

```text
This manager draft is no longer available.

It may have been removed or completed in another session.

[Return to Add Manager]
```

### 31.2 Permission lost

```text
You no longer have permission to edit this manager draft.

Your latest unsaved changes could not be stored.

[Return to Add Manager]
```

### 31.3 Draft save failure

```text
The manager draft could not be saved.

Your current values remain on this screen.

[Retry Save] [Copy Non-sensitive Summary] [Keep Editing]
```

Do not include access codes in copied summaries.

### 31.4 Place search unavailable

```text
Place search is temporarily unavailable.

You can retry or leave place of birth unspecified if it is optional.
```

### 31.5 Portrait service unavailable

```text
Generated avatars are temporarily unavailable.

Choose an initials portrait, a built-in avatar, or continue without one.
```

### 31.6 Portrait storage failure

```text
The portrait could not be stored safely.

Text details were not lost.

[Retry] [Use Initials]
```

### 31.7 Name conflict changed

If another manager is created while this form is open, rerun the conflict check before Continue.

---

## 32. Accessibility requirements

### 32.1 Form semantics

Every input must have:

- A persistent label.
- Required or optional state.
- Description when needed.
- Programmatically associated error message.
- Predictable tab order.

Placeholder text must not replace a label.

### 32.2 Date input

- Expose expected date format.
- Announce resulting age.
- Support direct keyboard entry.
- Avoid inaccessible calendar-only input.
- Announce invalid dates clearly.

### 32.3 Place search

Expose search results as an accessible combobox or listbox with city, region, and nation context.

### 32.4 Portrait controls

The portrait preview needs alternative text describing source, not inferred appearance.

Examples:

```text
Initials portrait showing J M.
Built-in manager avatar selected.
User-provided portrait selected.
No portrait selected.
```

### 32.5 Live updates

Use polite announcements for:

```text
Display name updated to João Monteiro.
Age at career start is 28.
Portrait imported successfully.
Draft saved.
```

Do not announce every keystroke in the name fields.

### 32.6 Error focus

After Continue with errors:

- Focus a summary at the top.
- Provide links to invalid fields.
- Do not clear valid input.
- Move focus to the first field only after the user activates its error link or according to a consistent form policy.

### 32.7 High text scaling

- Stack labels above controls.
- Let descriptions wrap.
- Keep portrait actions near the preview.
- Prevent footer overlap.
- Avoid horizontal scrolling for the main form.

---

## 33. Keyboard interaction

- `Tab` and `Shift+Tab`: move between form controls.
- Arrow keys: operate select controls and date components.
- `Enter`: activate the focused button or select a highlighted search result.
- `Space`: toggle checkboxes and select avatar tiles.
- `Escape`: close a selector or dialog, then request Back.
- `Ctrl+S`: save the draft.
- `Ctrl+Enter`: continue when the form is valid, if enabled by product policy.
- `Delete`: remove the portrait only when its control has focus and confirmation or undo is provided.

Keyboard shortcuts must never expose or copy the local access code.

---

## 34. Localization requirements

- Localize all labels, errors, descriptions, date controls, and name-format options.
- Use locale-aware date entry and formatting.
- Preserve the career's canonical date independently of display format.
- Support culturally appropriate name order.
- Support mononyms where policy permits.
- Support right-to-left layout.
- Use locale-aware city and nation sorting.
- Preserve accents and native scripts.
- Localize age and plural messages.
- Keep stable field and format IDs language-independent.
- Do not construct name-order descriptions by concatenating translated words.

---

## 35. Responsive behavior

### Wide desktop

Use a two-column form where appropriate, with identity fields on the left and portrait or preview on the right.

### Standard desktop

Use a single primary form column with a secondary portrait panel.

### Narrow desktop

Stack every section vertically.

### High text scaling

- Put each label above its field.
- Render date components in a wrapping group.
- Keep the effective display-name preview close to the name fields.
- Place footer actions in a nonoverlapping sticky or trailing region.

### Ultrawide display

Keep the form at a readable maximum width rather than stretching inputs across the entire display.

---

## 36. Security and privacy requirements

Treat every entered name, selected place, portrait, filename, and multiplayer message as untrusted.

Protect against:

- Script and markup injection.
- Invalid Unicode and control characters.
- Bidirectional text spoofing.
- Oversized text input.
- Malformed image files.
- Image decompression bombs.
- Path traversal and symbolic-link escape.
- Embedded metadata disclosure.
- Unauthorized draft access.
- Stale revision overwrite.
- Access-code leakage.
- Clipboard leakage of sensitive values.
- Portrait operation races.

Rules:

1. Render names as text.
2. Validate and normalize on trusted boundaries.
3. Use stable place IDs.
4. Decode images in a constrained component.
5. Strip unnecessary image metadata.
6. Store managed derivatives, not arbitrary source paths.
7. Hash local access codes with configured secure parameters.
8. Never log or return the plaintext access code.
9. Revalidate ownership before Save and Continue.
10. Use expected revisions and idempotency keys.
11. Reject late portrait results for obsolete operations.
12. Minimize collection of personal information.

---

## 37. Persistence rules

Persist in the manager draft:

- Structured name components.
- Selected presentation format.
- Effective custom display-name preference.
- Birth date and precision.
- Stable place-of-birth ID.
- Managed portrait asset reference.
- Local privacy enabled state and secure verifier reference.
- Draft revision.
- Current stage.
- Warning acknowledgments tied to relevant field fingerprints.

Do not persist:

- Plaintext local access code.
- Original portrait filesystem path.
- Unprocessed image bytes as a valid portrait.
- Temporary search results.
- Stale name-conflict acknowledgment after the name changes.
- Partial save transactions.

---

## 38. Observability

Useful operational events:

- Personal-details screen opened.
- Draft loaded.
- Draft save succeeded or failed.
- Portrait source selected.
- Portrait processing success or failure category.
- Place-search failure category.
- Validation issue codes.
- Draft conflict.
- Stage completed.

Avoid recording:

- The manager's full entered name in telemetry.
- Exact birth date.
- Access code.
- Original portrait path.
- Portrait image content.
- Exact place of birth unless explicit diagnostic consent exists.

---

## 39. Edge cases

### Mononym

Allow a single display name when policy permits. Do not duplicate it into both given and family fields.

### Very long localized name

Preserve the valid full value while using wrapping or accessible truncation in later compact views.

### Leap-day birth

Calculate age correctly in non-leap years according to the configured calendar policy.

### Career starts before birthday

Calculate age from full dates, not year difference.

### Place renamed in a content update

Use the stable place ID and display the current localized name. Do not change the historical semantic reference silently.

### Place removed

Mark the reference unavailable and require reselection or clearing if the draft is not yet active.

### Duplicate human-manager name created concurrently

Rerun conflict detection before stage completion.

### Portrait import completes after Back

Cancel or ignore the late result. Do not attach it to a different draft or screen instance.

### Portrait file deleted after selection

Because the product imports a managed derivative, deletion of the original after successful import must not break the portrait.

### Save fails after portrait import

Keep the managed asset temporarily and clean it later if no draft references it.

### Access-code confirmation mismatch

Show a field-level error without clearing the first value unnecessarily.

### Draft edited from another device

Reject stale save and offer reload or difference review.

### Career start date changes unexpectedly

Mark age validation stale and block Continue until the input context is revalidated.

---

## 40. Acceptance criteria

The screen is complete when:

1. It opens only for an authorized incomplete manager draft.
2. The manager draft remains separate from the active manager record.
3. Name fields support configurable cultural naming policies.
4. A valid display name can be derived or entered explicitly.
5. Name normalization preserves accents, scripts, apostrophes, and hyphens.
6. Invalid control characters and unsafe text are rejected.
7. Duplicate human-manager names produce a policy-driven warning or error.
8. Date-of-birth validation uses the exact career start date.
9. Minimum and maximum ages come from named policy values.
10. Leap years and partial dates are handled correctly.
11. Place-of-birth selection uses stable geographic IDs.
12. No place is inferred from device or network location.
13. Portraits may use initials, original built-in assets, generated assets, user images, or none according to policy.
14. User images are safely decoded, normalized, and stripped of unnecessary metadata.
15. Original portrait paths are not required after successful import.
16. Portrait failures do not discard text changes.
17. Local access codes are clearly described as local gameplay privacy only.
18. Plaintext access codes are never persisted or logged.
19. Save Draft is atomic, revision-checked, and idempotent.
20. Unsaved edits are handled explicitly when navigating Back.
21. Continue validates and saves one personal-details stage revision.
22. Duplicate Continue activation cannot advance twice.
23. Concurrent edits cannot silently overwrite newer draft revisions.
24. Keyboard users can operate every field and action.
25. Screen-reader users receive labels, errors, age updates, place context, and portrait state.
26. High text scaling and right-to-left layouts remain usable.
27. Successful completion navigates to Manager Nationality and Languages.
28. No proprietary artwork, exact wording, source code, logos, or original database content is required.

---

## 41. Recommended tests

### Unit tests

- Name-component normalization.
- Mononym policy.
- Display-name derivation.
- Locale-specific presentation order.
- Maximum-length validation.
- Control-character rejection.
- Similar-name conflict generation.
- Date validity.
- Leap-year validation.
- Exact age-at-start calculation.
- Minimum and maximum age policy.
- Partial-date precision.
- Place-reference validation.
- Initials derivation.
- Access-code policy validation.
- Warning-acknowledgment invalidation.
- Draft dirty-state derivation.

### Integration tests

- Create a manager with given and family names.
- Create a mononym manager where allowed.
- Use a custom display name.
- Select a valid birth date.
- Reject an out-of-policy age.
- Select and clear a place of birth.
- Save and resume the personal-details draft.
- Continue to nationality and languages.
- Return from the next screen and restore values.
- Import a safe portrait.
- Reject a malformed portrait.
- Use an initials portrait after import failure.
- Enable and disable local privacy.
- Detect another human manager with the same display name.
- Navigate Back with unsaved changes.

### Concurrency tests

- Autosave and manual Save overlap.
- Save from two sessions with the same revision.
- Ownership changes during Save.
- Draft is removed while the screen is open.
- Portrait processing finishes after a newer portrait is selected.
- Place-search responses arrive out of order.
- Continue is activated twice rapidly.

### Security tests

- Markup-like manager name.
- Invalid Unicode.
- Bidirectional-control spoofing.
- Oversized name components.
- Forged place ID.
- Path traversal in portrait filename.
- Symbolic-link portrait source.
- Image decompression bomb.
- Malformed image container.
- Embedded image location metadata.
- Unsupported animated image.
- Plaintext access code in logs.
- Unauthorized draft ID.
- Stale revision overwrite.
- Reused idempotency request.

### Accessibility tests

- Keyboard-only form completion.
- Screen-reader labels and required state.
- Error-summary navigation.
- Date entry without a pointer.
- Age announcement.
- Place combobox navigation.
- Portrait-source announcement.
- Save-status announcement.
- Unsaved-changes dialog focus.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long localized names and place labels.

### Visual regression tests

Capture at least:

- Empty personal-details form.
- Valid completed form.
- Mononym configuration.
- Duplicate-name warning.
- Date validation error.
- Place search results.
- Initials portrait.
- Built-in avatar selector.
- User portrait crop editor.
- Portrait-processing error.
- Local privacy enabled.
- Draft saving state.
- Draft save failure.
- Unsaved-changes dialog.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 42. Condensed LLM implementation brief

```text
Implement a desktop Manager Personal Details screen for an original
football-management simulation. It edits an authorized incomplete
ManagerDraft created by Add Manager. The draft is not an active manager and
must not control a club, receive an inbox, or affect world simulation.

Collect culturally flexible structured name components, presentation format,
effective display name, date of birth, optional place of birth, optional
portrait, and optional local hot-seat privacy. Do not require legal or account
identity. Support mononyms and non-Latin scripts according to a named
ManagerNamePolicy. Preserve accents, apostrophes, hyphens, and intentional name
order. Reject unsafe control characters, blank effective names, and configured
length violations.

Calculate manager age from the exact career start date and a valid calendar
date. Minimum and maximum ages must come from named policy values, not hidden
literals. If partial dates are supported, store their precision explicitly.
Never infer place of birth from IP address, account data, or device locale.
Use stable place IDs and context-rich place-search results.

Support no portrait, initials, original built-in avatars, approved generated
avatars, and safely imported user images. Validate decoded image type,
signature, dimensions, pixel count, file size, and metadata. Protect against
malformed images, decompression bombs, path traversal, and symbolic-link
escape. Strip unnecessary metadata and store a normalized managed derivative,
not the original path. Portrait failures must preserve text edits.

For optional local hot-seat privacy, explain that an access code is not online
authentication and does not encrypt the save. Validate it with named policy
values, hash it securely, and never persist, log, copy, or expose plaintext.

Use a dirty-state model and atomic revision-checked draft saves. Save and
Continue commands require the career ID, draft ID, expected revision, and an
idempotency request ID. Reject stale concurrent writes. Cancel obsolete place
searches and portrait operations. Duplicate human-manager display names should
produce policy-driven warnings or errors without relying on names as identity.

On Continue, normalize and validate all required fields, recheck ownership,
age, place, portrait, and current name conflicts, save one completed personal-
details stage revision, advance the draft, and navigate to Manager Nationality
and Languages. Prevent duplicate submission.

Support complete keyboard operation, persistent labels, accessible date input,
accessible place combobox behavior, visible focus, error-summary links, save-
status announcements, high text scaling, localization, culturally appropriate
name order, and right-to-left layouts. Treat all names, images, paths, places,
network messages, and renderer commands as untrusted. Do not copy proprietary
artwork, exact wording, source code, logos, or databases.
```

---

## 43. Next planned item

**Screen 9: Manager Nationality and Languages** should define primary and additional nationalities, eligibility and place-of-birth relationships, spoken-language proficiency, database-driven language lists, duplicate and conflicting selections, gameplay effects on reputation and communication, validation, draft persistence, and transition to Manager Background.

---

## Suggested Git commit

```text
feat(docs): specify manager personal details screen
```
