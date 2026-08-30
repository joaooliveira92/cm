# Screen 16: Game Preferences

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, databases, source code, logos, exact interface wording, or other protected assets. Use an original visual identity and fictional or properly licensed football data.

---

## 1. Purpose

The **Game Preferences** screen allows users to configure application-wide behavior and, when a career is active, selected career-specific defaults.

It may be opened from the Main Menu or from the in-career application menu.

The screen must allow the user to:

- Change interface language, scale, density, and presentation preferences.
- Configure date, time, number, currency, and name-display formats.
- Configure autosave frequency, rotation, and failure behavior.
- Configure confirmations and safety prompts.
- Configure simulation processing and background behavior within supported limits.
- Configure accessibility preferences.
- Configure notification and inbox defaults.
- Configure privacy-sensitive and multiplayer-sensitive behavior.
- Understand which settings apply globally, per device, per account, per career, or per manager.
- Preview reversible visual changes.
- Identify settings that require a restart, career reload, or future save only.
- Apply valid changes atomically.
- Cancel without retaining unapplied changes.
- Restore one section or all settings to safe defaults.

The screen must keep presentation preferences separate from canonical career rules. A local user must not be able to change authoritative multiplayer simulation settings through client-only preferences.

---

## 2. Entry contexts

### Main Menu

```text
Main Menu
  -> Preferences
  -> Application and device settings
```

### Active career

```text
Career Menu
  -> Preferences
  -> Application settings
  -> Career settings, if authorized
  -> Manager-specific defaults
```

### First-run or recovery context

```text
Application startup
  -> Invalid or unavailable preferences
  -> Safe defaults
  -> Preferences
```

The available sections depend on context and permission, but hidden sections must not cause previously stored values to be deleted.

---

## 3. Core concepts

### 3.1 Preference definition

A preference definition describes a configurable value, its scope, validation, default, restart behavior, and authorization requirements.

### 3.2 Preference scope

```typescript
type PreferenceScope = "device" | "account" | "application" | "career" | "manager";
```

### 3.3 Effective preference

The effective preference is the resolved value after applying defaults and scope precedence.

### 3.4 Draft preference

A draft preference is an unsaved value edited in the current screen.

### 3.5 Restart requirement

A setting may apply:

- Immediately.
- After closing the preferences screen.
- After reloading the career.
- After restarting the application.
- Only to newly created careers or future saves.

### 3.6 Authoritative career setting

An authoritative career setting changes shared simulation behavior and must be controlled by the host or server in multiplayer.

### 3.7 Presentation setting

A presentation setting changes how information is shown locally without changing canonical world state.

---

## 4. Conceptual layout

```text
+--------------------------------------------------------------------------------+
| PREFERENCES                                              [Search settings...]  |
|--------------------------------------------------------------------------------|
| General              | INTERFACE                                               |
| Interface          > |                                                         |
| Formats              | Language                    [English v]                 |
| Saving               | Interface scale             [125% v]                    |
| Processing           | Information density         [Compact v]                 |
| Notifications        | Navigation animation        [Reduced v]                 |
| Accessibility        | Tooltip delay               [Standard v]                |
| Privacy              |                                                         |
| Multiplayer          | Preview                                                 |
| Advanced             | +-----------------------------------------------------+ |
|                      | | Example squad row and navigation preview            | |
|                      | +-----------------------------------------------------+ |
|                      |                                                         |
|                      | [Restore Interface Defaults]                            |
|--------------------------------------------------------------------------------|
| Some changes require an application restart.                                   |
| [Cancel] [Restore All Defaults]                       [Apply] [Apply and Close]|
+--------------------------------------------------------------------------------+
```

Narrow layout:

```text
Preferences
[Category v]
[Search settings]

Language
[Selection]

Interface scale
[Selection]

Information density
[Selection]

[Cancel] [Apply]
```

These diagrams define behavior and information hierarchy, not exact styling.

---

## 5. Screen regions

### 5.1 Header

Display:

- `Preferences`.
- Search field.
- Active context, when relevant.
- Unsaved-change indicator.
- Close or Back action.

### 5.2 Category navigation

Recommended categories:

1. General.
2. Interface.
3. Formats.
4. Saving.
5. Processing.
6. Notifications.
7. Accessibility.
8. Privacy.
9. Multiplayer.
10. Advanced.

### 5.3 Settings panel

Shows controls for the selected category with descriptions, scope labels, restart indicators, and validation messages.

### 5.4 Preview region

Used for visual, formatting, density, and accessibility previews. It must use synthetic example data rather than private career data where possible.

### 5.5 Footer actions

Recommended actions:

- `Cancel`
- `Restore All Defaults`
- `Apply`
- `Apply and Close`

---

## 6. Preference definition model

```typescript
interface PreferenceDefinition<T> {
  readonly id: string;
  readonly categoryId: string;
  readonly scope: PreferenceScope;
  readonly valueType: "boolean" | "integer" | "decimal" | "string" | "enum";
  readonly defaultValue: T;
  readonly allowedValues?: readonly T[];
  readonly validationPolicyId: string;
  readonly applyBehavior:
    | "immediate_preview"
    | "on_apply"
    | "career_reload_required"
    | "application_restart_required"
    | "new_career_only";
  readonly permissionId?: string;
  readonly dependencyIds: readonly string[];
  readonly conflictIds: readonly string[];
  readonly descriptionKey: string;
}
```

All choices, ranges, thresholds, and defaults must come from named definitions or policy values. They must not be embedded as unexplained literals in control logic.

---

## 7. Preference scope and precedence

Recommended precedence:

```text
Manager-specific override
  -> Career setting
  -> Account preference
  -> Device preference
  -> Application default
```

Only applicable scopes participate in resolution.

```typescript
interface EffectivePreference<T> {
  readonly preferenceId: string;
  readonly value: T;
  readonly sourceScope: PreferenceScope | "default";
  readonly inherited: boolean;
  readonly editable: boolean;
  readonly reasonCodes: readonly string[];
}
```

The interface should indicate inherited values and allow `Use inherited value` where appropriate.

---

## 8. General preferences

Possible settings:

- Startup destination.
- Default Main Menu behavior.
- Resume last career prompt.
- Check for recoverable transactions at startup.
- Pause when application loses focus.
- Confirm before quitting.
- Open external links policy.
- Default manager when several local managers exist.

Example:

```text
Startup destination
(o) Main Menu
( ) Last safe career screen
( ) Ask every time
```

Restoring the last career must still pass save integrity and ownership checks.

---

## 9. Interface language

Changing application language affects presentation only.

Requirements:

- Use a stable locale ID.
- Display language names in an understandable form.
- Preview the change where supported.
- Preserve the prior language until the new resources load successfully.
- Mark restart requirement accurately.
- Fall back safely when a translation resource is incomplete.

```typescript
interface LanguagePreferenceValue {
  readonly localeId: string;
  readonly fallbackLocaleIds: readonly string[];
}
```

The manager's spoken languages remain separate from the application language.

---

## 10. Interface scale

Interface scale changes text and control dimensions.

The control should expose supported policy-defined steps rather than unrestricted values that can make the UI unusable.

Requirements:

- Preview without permanently trapping the user.
- Preserve a visible revert control.
- Ensure dialogs remain inside the viewport.
- Support operating-system scaling.
- Store per device where appropriate.

If a preview becomes unusable, revert automatically after a configured timeout unless the user confirms it.

---

## 11. Information density

Suggested profiles:

```typescript
type InformationDensity = "comfortable" | "standard" | "compact";
```

Density may affect:

- Row height.
- Panel spacing.
- Secondary metadata visibility.
- Toolbar wrapping.

It must not hide essential status, warnings, focus indicators, or accessible labels.

---

## 12. Navigation and animation

Possible settings:

- Page-transition animation.
- Reduced motion.
- Scroll animation.
- Match-event animation speed.
- Hover effects.
- Auto-opening contextual panels.

Accessibility-level reduced-motion preferences should override decorative animation settings.

---

## 13. Tooltip behavior

Possible settings:

- Enabled.
- Delay profile.
- Dismissal behavior.
- Keyboard-triggered help.
- Advanced-data tips.

Tooltips must not contain information unavailable through keyboard focus or assistive technology.

---

## 14. Theme and contrast

Possible profiles:

- System.
- Light.
- Dark.
- High contrast.
- Custom theme when supported.

Use original visual assets and palettes.

Theme changes must not encode game state differently in a way that changes meaning.

---

## 15. Formats category

Possible settings:

- Date format.
- Time format.
- First day of week.
- Number separators.
- Decimal precision profiles.
- Currency display.
- Transfer-fee abbreviations.
- Wage period.
- Distance units.
- Temperature units.
- Height and weight units.
- Manager and person name order.

Format changes alter presentation, not canonical values.

---

## 16. Date and time format

```typescript
interface DateTimeFormatPreferences {
  readonly dateStyleId: string;
  readonly timeStyleId: string;
  readonly firstDayOfWeekId: string;
  readonly timeZoneDisplayPolicyId: string;
}
```

The career simulation date remains canonical and timezone-independent where appropriate.

Preview:

```text
Career date: 12 February 2005
Saved at: 18 March 2005, 21:47
```

Avoid ambiguous numeric date previews without labels.

---

## 17. Currency presentation

Options may include:

- Club native currency.
- Account-preferred display currency.
- Career base currency.
- Native plus converted value.

```typescript
interface CurrencyDisplayPreference {
  readonly mode: "native" | "preferred" | "career_base" | "native_and_preferred";
  readonly preferredCurrencyId?: string;
  readonly roundingProfileId: string;
}
```

Canonical contracts and finances retain original currency and minor units.

Conversion rates must be career-defined when the simulation models them.

---

## 18. Wage-period format

Suggested values:

- Weekly.
- Monthly.
- Annual.
- Club-native convention.

Conversion is presentation-only and must use explicit configured calendar premises.

---

## 19. Name presentation

Possible options:

- Respect each person's configured name order.
- Given name first where supported.
- Family name first where supported.
- Short name in compact lists.
- Full name in reports.

Never destroy the canonical structured name to satisfy a display preference.

---

## 20. Saving preferences

Possible settings:

- Autosave enabled.
- Autosave frequency profile.
- Autosave trigger events.
- Rotation count.
- Primary save repository.
- Cloud synchronization behavior.
- Save compression profile.
- Protected milestone behavior.
- Save-failure notification policy.
- Background save policy where supported.

---

## 21. Autosave frequency

Suggested named profiles:

- Disabled.
- Every in-game week.
- Every in-game month.
- Before fixtures.
- After fixtures.
- On major transactions.
- Custom supported combination.

The scheduler must use stable trigger IDs and career sequence boundaries.

---

## 22. Autosave rotation

```typescript
interface AutosavePreferenceValue {
  readonly enabled: boolean;
  readonly frequencyProfileId: string;
  readonly triggerIds: readonly string[];
  readonly rotationCount: number;
  readonly repositoryId: string;
  readonly failurePolicyId: string;
}
```

Rotation bounds come from policy. The screen should estimate storage impact.

---

## 23. Cloud synchronization

Possible settings:

- Off.
- Manual.
- After successful local save.
- Wi-Fi or unmetered network only where supported.
- Ask before upload.

Do not claim cloud durability until provider verification completes.

---

## 24. Save compression

Profiles may trade save time against storage size:

- Fast.
- Balanced.
- Compact.

Compression profile changes apply to future revisions and must not rewrite existing saves automatically.

---

## 25. Processing preferences

Possible settings:

- Background processing allowed.
- Worker-count policy.
- Battery-saving profile.
- Processing priority.
- Continue-button behavior.
- Pause simulation on important message.
- Auto-continue timeout, if supported.
- Match-processing presentation speed.
- Network synchronization tolerance.

Authoritative competition detail and database scope cannot be changed here after career creation unless the game provides an explicit migration workflow.

---

## 26. Processing profiles

Suggested profiles:

```typescript
type ProcessingProfile = "battery_saver" | "balanced" | "performance" | "custom";
```

Profiles may control named policies for:

- Maximum worker count.
- CPU utilization target.
- Background usage.
- Thermal response.
- Progress update frequency.

Do not place raw processor assumptions in UI formulas.

---

## 27. Worker-count policy

The UI may expose:

- Automatic.
- Conservative.
- Maximum supported.
- Explicit allowed values for advanced users.

The application must remain within safety and memory budgets regardless of preference.

Changing worker count must not change deterministic canonical simulation results.

---

## 28. Background processing

Possible options:

- Continue safe noninteractive processing when unfocused.
- Pause when minimized.
- Allow cloud upload in background.
- Allow search-index rebuilding in background.

The screen must distinguish canonical simulation from background maintenance.

---

## 29. Continue behavior preferences

Possible settings:

- Stop on every inbox item requiring action.
- Stop only on high-priority items.
- Stop before fixtures.
- Stop at configured calendar dates.
- Auto-continue after read-only messages.

These become career or manager-scoped preferences and must not skip mandatory decisions.

---

## 30. Notifications category

Possible settings:

- Inbox severity defaults.
- Desktop notifications.
- Sound notifications.
- Flash or badge behavior.
- Transfer alerts.
- Contract alerts.
- Injury alerts.
- Match reminders.
- Job-vacancy alerts.
- Multiplayer turn alerts.
- Save and synchronization warnings.

Operating-system notification permission must be separate from in-game subscription settings.

---

## 31. Notification channels

```typescript
type NotificationChannel = "in_game" | "desktop" | "sound" | "badge";
```

```typescript
interface NotificationPreference {
  readonly eventTypeId: string;
  readonly enabledChannels: readonly NotificationChannel[];
  readonly minimumSeverityId: string;
  readonly scope: PreferenceScope;
}
```

Privileged career information must not appear in operating-system notifications when privacy mode suppresses it.

---

## 32. Notification preview

Use synthetic content:

```text
Example notification
Match reminder: Example City FC plays North United tomorrow.
```

Do not expose another hot-seat manager's private inbox in a preview.

---

## 33. Accessibility category

Recommended settings:

- High contrast.
- Reduced motion.
- Text scale.
- Focus-indicator enhancement.
- Keyboard-navigation hints.
- Screen-reader verbosity.
- Live-update verbosity.
- Announce table sorting.
- Color-vision-safe status palette.
- Do not rely on color.
- Sound cues.
- Captioned sound cues.
- Match-commentary pacing.
- Hold versus toggle behavior where applicable.

Accessibility settings should be available before any career loads.

---

## 34. Screen-reader verbosity

Possible profiles:

- Concise.
- Standard.
- Detailed.

This setting changes supplemental announcements, not access to information.

Do not suppress blocking errors or critical state changes in Concise mode.

---

## 35. Live-update verbosity

Controls announcements for:

- Search result counts.
- Processing stages.
- Match events.
- Inbox updates.
- Transfer status.

Rate-limit announcements to avoid overwhelming users.

---

## 36. Keyboard preferences

Possible settings:

- Shortcut preset.
- Custom key bindings.
- Single-key navigation enabled.
- Confirm destructive shortcuts.
- Focus wrapping.
- Sticky modifier assistance where supported.

Key conflicts must be detected before Apply.

---

## 37. Custom key bindings

```typescript
interface KeyBindingPreference {
  readonly commandId: string;
  readonly keyChord: string;
  readonly contextIds: readonly string[];
}
```

Validation must detect:

- Duplicate bindings in overlapping contexts.
- Reserved operating-system shortcuts.
- Unsupported key chords.
- Bindings that remove all access to a required action.

Provide `Restore Shortcut Defaults`.

---

## 38. Privacy category

Possible settings:

- Hide private inbox content during manager switching.
- Redact desktop notification details.
- Lock local manager after inactivity.
- Clear recent-career previews on shared devices.
- Telemetry preference where applicable.
- Diagnostic-upload consent.
- Portrait and user-content handling.
- Clipboard warning behavior.

Privacy settings must use clear purpose-specific language.

---

## 39. Hot-seat privacy

Possible settings:

- Hide the previous manager's screen before switching.
- Require the manager's local access code.
- Hide private notifications.
- Clear clipboard-sensitive summaries.
- Return to a neutral handoff screen.

These are local privacy controls and do not replace account authentication.

---

## 40. Telemetry and diagnostics

If included, separate:

- Essential operational diagnostics.
- Optional product analytics.
- Optional crash reports.
- Explicit diagnostic bundle upload.

Do not bundle these choices into unrelated preferences.

The screen should explain what is collected at a high level and provide links to applicable privacy information.

---

## 41. Multiplayer category

Possible local preferences:

- Display participant connection status.
- Turn-ready notification.
- Automatic reconnect.
- Voice or chat presentation if supported.
- Private-message notification privacy.

Possible authoritative settings, host-only:

- Join policy.
- Save permission policy.
- Turn or Continue policy.
- Manager-capacity policy.
- Pause-on-disconnect behavior.
- Host migration policy.

Clearly distinguish local settings from shared career settings.

---

## 42. Multiplayer authorization

```typescript
type PreferencePermission =
  | "edit_local_preferences"
  | "edit_manager_preferences"
  | "edit_career_preferences"
  | "edit_multiplayer_host_preferences"
  | "restore_shared_defaults";
```

Authoritative settings are enforced by the host or server. A client cannot enable them by modifying local state.

---

## 43. Advanced category

Possible options:

- Logging verbosity.
- Cache limits.
- Search-index rebuild.
- Hardware acceleration.
- Experimental features.
- Save verification depth.
- Developer diagnostics, nonproduction only.

Advanced settings require clear warnings and safe defaults.

They must not expose secrets, unsafe command execution, or arbitrary filesystem access.

---

## 44. Cache settings

Possible settings:

- Cache size profile.
- Clear image cache.
- Rebuild search indexes.
- Clear disposable setup indexes.

Clearing caches must not delete canonical saves or career data.

---

## 45. Hardware acceleration

If supported:

- Show current availability.
- Mark restart requirement.
- Fall back safely after startup failure.
- Preserve a recovery launch mode.
- Avoid claiming performance improvements universally.

---

## 46. Experimental features

Experimental settings should:

- Be disabled by default in production unless explicitly released.
- Explain instability risk.
- Record feature-policy version.
- Never be required for loading a standard save unless the save manifest records the dependency.
- Support safe rollback where possible.

---

## 47. Search settings

The search field should match:

- Setting name.
- Description.
- Category.
- Search aliases.

Requirements:

- Locale-aware.
- Debounced.
- Keyboard accessible.
- Nonmutating.
- Show category context in results.
- Highlight matching labels without injecting markup.

Example:

```text
Search: autosave

Saving > Autosave frequency
Saving > Autosave rotation
Notifications > Autosave failure alerts
```

---

## 48. Setting row specification

Each setting row should include:

- Persistent label.
- Control.
- Description.
- Scope.
- Inherited state.
- Restart or reload indicator.
- Validation error.
- Restore-setting action where useful.

```typescript
interface PreferenceRowModel<T> {
  readonly definitionId: string;
  readonly label: string;
  readonly description: string;
  readonly effectiveValue: T;
  readonly draftValue: T;
  readonly sourceScope: PreferenceScope | "default";
  readonly editable: boolean;
  readonly inherited: boolean;
  readonly applyBehavior: PreferenceDefinition<T>["applyBehavior"];
  readonly issueCodes: readonly string[];
}
```

---

## 49. Dependency behavior

A setting may depend on another setting.

Example:

```text
Cloud upload frequency
Available only when cloud synchronization is enabled.
```

Disabled dependent controls must:

- Remain inspectable.
- Explain the dependency.
- Preserve their last valid value unless policy resets it explicitly.
- Not contribute to the active effective configuration while disabled.

---

## 50. Conflict behavior

Example:

```text
Reduced Motion conflicts with Animated Page Transitions.

Applying Reduced Motion will disable page-transition animation.

[Review Changes] [Apply]
```

Conflicts should be resolved through policy-defined previews, not arbitrary last-write-wins behavior.

---

## 51. Immediate preview

Visual preferences may preview immediately while remaining uncommitted.

Examples:

- Theme.
- Scale.
- Density.
- Date format.
- Currency format.
- Reduced motion.

Preview rules:

- Keep a copy of the prior effective state.
- Provide Revert.
- Revert on Cancel.
- Revert after a timeout if the UI becomes inaccessible and confirmation is required.
- Do not write canonical career state.

---

## 52. Restart-required settings

Display a consistent indicator:

```text
Restart required
```

On Apply:

- Persist the value.
- Keep the current runtime value unchanged.
- Add it to a pending-restart summary.
- Offer `Restart Now` and `Later` where appropriate.

Do not pretend the value is active immediately.

---

## 53. Career-reload-required settings

A career reload requirement may apply to:

- Some display indexes.
- Manager permission presentation.
- Search-index policy.

The screen should offer:

```text
Apply and Reload Career
Apply for Next Load
Cancel
```

Do not reload without protecting unsaved career state.

---

## 54. New-career-only settings

Settings affecting world creation should be marked:

```text
Applies to new careers only
```

Changing them must not mutate the active career.

Examples may include default database-size preset or default competition-detail profile.

---

## 55. Dirty-state model

```typescript
type PreferencesDirtyState =
  | "unchanged"
  | "modified"
  | "validating"
  | "invalid"
  | "applying"
  | "applied"
  | "apply_failed"
  | "conflicted";
```

Category navigation must preserve unsaved edits.

---

## 56. Apply behavior

Selecting `Apply` must:

1. Commit active control editors.
2. Validate every changed preference.
3. Validate cross-setting dependencies and conflicts.
4. Revalidate authorization for shared settings.
5. Calculate an application plan.
6. Preview consequential automatic changes when needed.
7. Persist changed scopes transactionally.
8. Apply immediate runtime changes.
9. Record pending reload or restart changes.
10. Update effective preference values.
11. Keep the screen open.

---

## 57. Apply and Close

Performs Apply, then closes only after successful persistence.

If Apply fails, remain on the screen with edits preserved.

---

## 58. Cancel behavior

Cancel must:

- Revert all uncommitted immediate previews.
- Discard draft changes.
- Preserve settings already applied through a prior Apply action.
- Close the screen.
- Restore focus to the invoking control.

If expensive preview resources are active, cancel them deterministically.

---

## 59. Unsaved-change close behavior

If the user closes using Back or window controls with unapplied changes:

```text
Apply preference changes?

[Discard Changes] [Keep Editing] [Apply and Close]
```

The safe default is `Keep Editing`.

---

## 60. Restore section defaults

Restores draft values in the current category to policy defaults.

It does not apply immediately unless the user chooses Apply.

Show a preview when restoring would change many settings.

---

## 61. Restore all defaults

This is a broad change and requires confirmation.

```text
Restore all preferences to their safe defaults?

Application, device, account, and editable career preferences shown here will
be reset in the current draft. Changes are not applied until you select Apply.

[Cancel] [Restore Draft Defaults]
```

Do not reset inaccessible server-controlled settings or unrelated account security data.

---

## 62. Application plan

```typescript
interface PreferenceApplicationPlan {
  readonly planId: string;
  readonly expectedPreferenceRevision: number;
  readonly changes: readonly PreferenceChange[];
  readonly automaticChanges: readonly PreferenceChange[];
  readonly immediatePreferenceIds: readonly string[];
  readonly careerReloadPreferenceIds: readonly string[];
  readonly restartPreferenceIds: readonly string[];
  readonly newCareerOnlyPreferenceIds: readonly string[];
  readonly warningCodes: readonly string[];
  readonly blockingReasonCodes: readonly string[];
  readonly planFingerprint: string;
}
```

The plan must be rebuilt if policy, permissions, or current preferences change.

---

## 63. Preference persistence

Use separate stores where appropriate:

- Device preferences.
- Account preferences.
- Application profile.
- Career preferences.
- Manager preferences.
- Host-authoritative multiplayer preferences.

A single failed store must not create an unexplained half-applied configuration.

Use a transaction when stores share an authority boundary. Use a saga with precise partial-failure reporting across local and remote boundaries.

---

## 64. Preference command

```typescript
interface ApplyPreferencesCommand {
  readonly applicationPlanId: string;
  readonly expectedPreferenceRevision: number;
  readonly expectedPlanFingerprint: string;
  readonly controllerContextId: string;
  readonly requestId: string;
}
```

The command references an authoritative plan rather than arbitrary renderer-supplied setting IDs and values.

---

## 65. Idempotency

Apply is idempotent by request ID.

Repeated requests must:

- Return the active operation state.
- Return the original result after success.
- Not apply side effects twice.
- Not restart services repeatedly.
- Not issue duplicate multiplayer updates.

---

## 66. Preferences state model

```typescript
interface GamePreferencesScreenState {
  readonly context: "main_menu" | "career";
  readonly activeCategoryId: string;
  readonly searchQuery: string;
  readonly rows: readonly PreferenceRowModel<unknown>[];
  readonly preferenceRevision: number;
  readonly draftValues: Readonly<Record<string, unknown>>;
  readonly effectiveValues: Readonly<Record<string, unknown>>;
  readonly issues: readonly PreferenceIssue[];
  readonly dirtyState: PreferencesDirtyState;
  readonly previewState: "idle" | "active" | "reverting" | "failed";
  readonly pendingRestartPreferenceIds: readonly string[];
  readonly pendingCareerReloadPreferenceIds: readonly string[];
  readonly applying: boolean;
}
```

---

## 67. State transitions

```text
LOADING_DEFINITIONS
  |
  v
LOADING_EFFECTIVE_VALUES
  |
  v
READY
  |
  +-- edit setting -------> MODIFIED
  |                            |
  |                            +-- visual setting -> PREVIEWING -> MODIFIED
  |
  +-- restore defaults --> MODIFIED
  |
  +-- Apply -------------> VALIDATING
  |                            |
  |                            +-- errors -> INVALID
  |                            +-- conflicts -> REVIEWING_PLAN
  |                            +-- valid -> APPLYING
  |                                           |
  |                                           +-- success -> READY
  |                                           +-- partial -> APPLY_FAILED
  |                                           +-- failure -> APPLY_FAILED
  |
  +-- Cancel ------------> REVERTING_PREVIEW -> CLOSED
```

---

## 68. Commands and events

### Commands

```text
OPEN_GAME_PREFERENCES
SELECT_PREFERENCE_CATEGORY
SEARCH_PREFERENCES
SET_PREFERENCE_DRAFT_VALUE
USE_INHERITED_PREFERENCE
RESTORE_PREFERENCE_DEFAULT
RESTORE_CATEGORY_DEFAULTS
RESTORE_ALL_PREFERENCE_DEFAULTS
PREVIEW_PREFERENCE_CHANGE
REVERT_PREFERENCE_PREVIEW
BUILD_PREFERENCE_APPLICATION_PLAN
APPLY_PREFERENCES
APPLY_AND_CLOSE_PREFERENCES
REQUEST_RESTART
REQUEST_CAREER_RELOAD
CANCEL_PREFERENCES
```

### Events

```text
PREFERENCE_DEFINITIONS_LOADED
EFFECTIVE_PREFERENCES_RESOLVED
PREFERENCE_DRAFT_CHANGED
PREFERENCE_PREVIEW_APPLIED
PREFERENCE_PREVIEW_REVERTED
PREFERENCE_APPLICATION_PLAN_CREATED
PREFERENCES_APPLIED
PREFERENCE_RESTART_REQUIRED
PREFERENCE_CAREER_RELOAD_REQUIRED
PREFERENCE_APPLICATION_FAILED
PREFERENCE_CONFLICT_DETECTED
```

---

## 69. Validation issue model

```typescript
interface PreferenceIssue {
  readonly code: string;
  readonly severity: "information" | "warning" | "blocking_error";
  readonly preferenceId?: string;
  readonly categoryId?: string;
  readonly messageKey: string;
  readonly parameters?: Readonly<Record<string, string | number>>;
  readonly correctiveActionId?: string;
}
```

Blocking examples:

- Unsupported value.
- Numeric value outside policy range.
- Conflicting key bindings.
- Unavailable save repository.
- Missing permission for a shared career setting.
- Invalid locale resource.
- Unsupported accessibility combination.
- Stale preference revision.

Warnings:

- Restart required.
- Career reload required.
- Future saves only.
- Increased storage usage.
- Increased battery or CPU use.
- Potentially private desktop notifications.

---

## 70. Error states

### Definitions unavailable

```text
Preferences could not be loaded.

Safe defaults remain active.

[Retry] [Close]
```

### Apply failure

```text
Preferences could not be applied.

Your draft changes remain available for review.

[Retry Apply] [Review Details] [Discard Changes]
```

### Partial remote application

```text
Local preferences were applied, but shared career preferences could not be
updated on the host.

Shared settings remain unchanged.

[Retry Shared Settings] [Close]
```

### Preview failure

```text
The visual preview could not be applied and was reverted.
```

### Permission changed

```text
You no longer have permission to change one or more shared career settings.

Those draft changes were not applied.
```

---

## 71. Accessibility requirements

### Category navigation

Expose categories as a navigation list or tabs with selected state.

### Setting rows

Each control must announce:

- Label.
- Current or draft value.
- Scope.
- Inherited state.
- Restart or reload requirement.
- Description.
- Error or warning.

### Search results

Results must include category context and support direct navigation.

### Live announcements

Use polite announcements:

```text
Interface scale preview set to 125 percent.
Three settings require an application restart.
Preferences applied successfully.
Preview reverted.
```

### Focus management

- Opening focuses the heading or restored category.
- Search result activation focuses the relevant control.
- Validation summary links to affected settings.
- Restore confirmation returns focus predictably.
- Closing restores focus to the invoking control.

### Non-color communication

Scope, inherited state, restart requirement, warnings, and errors require text or icon-plus-text.

---

## 72. Keyboard interaction

- `Tab` and `Shift+Tab`: move between categories, search, settings, and actions.
- Arrow keys: navigate category lists and option groups.
- `Enter` or `Space`: activate controls.
- `Ctrl+F`: focus settings search.
- `Ctrl+S`: Apply.
- `Escape`: close a selector, clear search, or request Cancel in that order.
- `Home` and `End`: move to first or last category or search result.
- `Page Up` and `Page Down`: scroll long categories.

Custom shortcut capture must not activate the command being assigned accidentally.

---

## 73. Localization requirements

- Localize every setting label, description, choice, error, and scope name.
- Use complete message templates.
- Support right-to-left layouts.
- Localize dates, numbers, currencies, sizes, and duration examples.
- Display language names clearly in both current UI language and endonym where helpful.
- Keep preference, locale, profile, repository, and command IDs language-independent.
- Do not concatenate translated fragments.
- Ensure search aliases are localized metadata.

---

## 74. Responsive behavior

### Wide desktop

Use fixed category navigation and a scrollable settings panel.

### Standard desktop

Keep the category rail compact and allow descriptions to wrap.

### Narrow desktop

Convert category navigation to a selector or separate category screen.

### High text scaling

- Place labels above controls.
- Let descriptions and warnings wrap.
- Keep scope and restart indicators close to the setting.
- Avoid horizontal scrolling for ordinary controls.
- Keep footer actions reachable.

### Ultrawide display

Use a readable maximum width for settings rather than stretching control rows across the whole display.

---

## 75. Security and integrity requirements

Treat preference files, cloud values, labels, key bindings, repository IDs, and multiplayer policy messages as untrusted.

Protect against:

- Unknown preference IDs.
- Forged shared-setting permission.
- Stale revision overwrite.
- Invalid enum values.
- Numeric overflow.
- Script and markup injection.
- Unsafe locale package loading.
- Arbitrary filesystem paths.
- Malicious key-chord strings.
- Privacy-setting bypass.
- Renderer-created application plans.
- Duplicate side effects.

Rules:

1. Load definitions from trusted signed or bundled configuration.
2. Validate all draft values in a trusted process.
3. Build authoritative application plans outside the renderer.
4. Use expected revisions and idempotency request IDs.
5. Enforce multiplayer settings on the host or server.
6. Restrict repositories and cache locations to approved adapters.
7. Never execute preference content.
8. Sanitize labels and diagnostics.
9. Revert unsafe visual previews.
10. Preserve safe startup defaults after configuration failure.

---

## 76. Persistence rules

Persist:

- Values in their correct scopes.
- Preference schema version.
- Policy version.
- Pending restart and reload markers.
- Last successful category where useful.
- Custom key bindings.
- Autosave and notification profiles.

Do not persist:

- Invalid draft values.
- Temporary search queries as canonical settings.
- Unconfirmed visual previews.
- Renderer-only permission decisions.
- Plain authentication secrets.
- Partial cross-scope transactions presented as full success.

Preference files should be written atomically where supported.

---

## 77. Observability

Useful operational events:

- Preferences opened.
- Category viewed.
- Validation issue codes.
- Preview failure category.
- Apply duration.
- Restart and reload requirements.
- Partial remote failure.
- Safe-default recovery.

Avoid recording:

- Exact privacy-sensitive settings without necessity.
- Custom key bindings in telemetry.
- Save repository paths.
- Manager identity.
- Notification content.
- Authentication data.

---

## 78. Edge cases

### UI scale preview makes controls inaccessible

Automatically revert after the configured confirmation window.

### Language resource fails to load

Keep the prior language and show a recoverable error.

### Career closes while preferences are open

Apply only valid noncareer scopes. Mark career-scoped drafts stale.

### Host changes a shared setting concurrently

Expire the local application plan and require review.

### Save repository is removed

Mark it unavailable and require another target before applying autosave settings.

### Key binding conflicts only in one context

Explain the overlapping context rather than rejecting unrelated bindings.

### Reduced motion enabled while animations are customized

Apply the accessibility override and preserve the lower-priority preference for later restoration.

### Cloud provider goes offline during Apply

Apply local scopes, retain shared or cloud-scoped values unchanged, and report partial outcome accurately.

### Restart now with unsaved career progress

Open the normal Save and Quit workflow before restarting.

### Restore defaults while search filter is active

Restore the intended scope, not only visible search results, and preview the breadth of the action.

### Preference schema changes after update

Migrate through explicit versioned rules and preserve unknown prior values only in quarantined backup metadata.

---

## 79. Acceptance criteria

The screen is complete when:

1. It distinguishes device, account, application, career, and manager scopes.
2. Effective values expose their source and inherited state.
3. Local presentation settings cannot alter canonical multiplayer simulation state.
4. Settings, defaults, ranges, and thresholds come from named definitions or policies.
5. Categories and search provide access to all permitted preferences.
6. Search does not mutate values.
7. Interface language remains separate from manager-spoken languages.
8. Format changes preserve canonical dates, money, names, and measurements.
9. Autosave settings reference approved repositories and bounded rotation policies.
10. Processing profiles do not change deterministic simulation results.
11. Accessibility preferences override conflicting decorative behavior safely.
12. Notification previews use synthetic or privacy-safe information.
13. Hot-seat privacy controls remain distinct from account authentication.
14. Shared multiplayer preferences require host or server authorization.
15. Immediate previews can be reverted on Cancel or accessibility timeout.
16. Restart, reload, immediate, and new-career-only behaviors are labeled accurately.
17. Apply validates all changed values, dependencies, conflicts, and permissions.
18. Apply references an authoritative revision-bound application plan.
19. Duplicate Apply requests cannot repeat side effects.
20. Apply and Close closes only after successful persistence.
21. Cancel reverts previews and discards only unapplied changes.
22. Restore defaults changes the draft first and does not silently apply.
23. Partial local and remote outcomes are reported accurately.
24. Invalid preference files recover to safe defaults.
25. Keyboard users can search, navigate, edit, apply, and cancel.
26. Screen-reader users receive labels, scope, inherited state, requirements, warnings, and outcomes.
27. High text scaling and right-to-left layouts remain usable.
28. No proprietary artwork, exact wording, source code, logos, or original database content is required.

---

## 80. Recommended tests

### Unit tests

- Scope precedence.
- Effective-value resolution.
- Inherited-state derivation.
- Definition schema validation.
- Enum and numeric validation.
- Dependency enabling and disabling.
- Conflict resolution.
- Restart and reload classification.
- Application-plan fingerprinting.
- Key-binding conflict detection.
- Autosave storage estimation.
- Notification privacy filtering.
- Idempotency-result lookup.

### Integration tests

- Open from Main Menu.
- Open from an active career.
- Change language.
- Preview and apply interface scale.
- Cancel a theme preview.
- Change date and currency presentation.
- Configure autosave and rotation.
- Select an unavailable save repository.
- Apply a processing profile.
- Enable reduced motion.
- Configure notification channels.
- Configure hot-seat privacy.
- Apply host-authoritative multiplayer settings.
- Reject unauthorized shared settings.
- Restore one category.
- Restore all defaults.
- Apply restart-required settings.
- Apply career-reload-required settings.

### Concurrency tests

- Host setting changes while a plan is open.
- Account preferences synchronize during editing.
- Apply is submitted twice.
- Career closes during Apply.
- Cloud provider fails after local persistence.
- Restart is requested while a career has unsaved progress.
- Preview operation completes after Cancel.

### Security tests

- Unknown preference ID.
- Forged shared-setting permission.
- Forged application plan.
- Stale preference revision.
- Invalid enum value.
- Numeric overflow.
- Markup-like localized label.
- Malicious locale package.
- Arbitrary repository path.
- Malformed key chord.
- Privacy-setting bypass attempt.
- Diagnostic secret leakage.

### Accessibility tests

- Keyboard-only category navigation.
- Settings search and result navigation.
- Scope and inherited-state announcement.
- Immediate-preview announcement and reversion.
- Validation-summary links.
- Custom key-binding capture.
- Restart-required summary.
- Restore-defaults confirmation focus.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long translated labels and descriptions.

### Visual regression tests

Capture at least:

- General preferences.
- Interface preview.
- Formats category.
- Saving category.
- Processing category.
- Notifications category.
- Accessibility category.
- Privacy category.
- Multiplayer host settings.
- Advanced settings warning.
- Search results.
- Inherited preference.
- Disabled dependency.
- Conflict preview.
- Restart-required summary.
- Apply failure.
- Restore-all confirmation.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 81. Condensed LLM implementation brief

```text
Implement a desktop Game Preferences screen for an original football-management
simulation. It can open from the Main Menu or an active career and must expose
only settings valid for the current context and permissions.

Model device, account, application, career, and manager scopes separately.
Resolve effective values through explicit scope precedence and show whether a
value is inherited. Keep local presentation settings separate from authoritative
career or multiplayer settings. Host or server authority must enforce shared
simulation preferences.

Drive the interface from trusted versioned PreferenceDefinition records. Every
default, range, allowed value, threshold, dependency, conflict, scope, and apply
behavior must come from named configuration or policy values rather than
unexplained literals in renderer logic.

Provide categories for General, Interface, Formats, Saving, Processing,
Notifications, Accessibility, Privacy, Multiplayer, and Advanced settings.
Include locale-aware settings search with category context. Search affects
visibility only.

Support interface language, scale, density, theme, contrast, motion, tooltips,
date and time formatting, currency presentation, wage period, measurement units,
and person-name presentation. These settings must preserve canonical underlying
career values. The application's UI language is separate from a manager's
spoken-language profile.

Provide autosave frequency, trigger, rotation, repository, failure, compression,
cloud, and background-save preferences. Use approved repositories and named
policies. Provide processing profiles for battery, balanced, and performance
behavior without changing deterministic canonical results.

Provide notification channels and severities, desktop-notification privacy,
accessibility settings, screen-reader and live-update verbosity, key bindings,
hot-seat privacy, telemetry and diagnostic consent, and authorized multiplayer
settings. Privacy-sensitive previews must use synthetic data.

Visual settings may preview immediately but remain uncommitted. Preserve the
prior effective state, support Revert, revert on Cancel, and automatically revert
an inaccessible scale or display preview according to configured safety policy.
Label settings accurately as immediate, career-reload required, application-
restart required, or new-career only.

On Apply, commit active controls, validate all draft values, dependencies,
conflicts, scopes and permissions, build an authoritative revision-bound
PreferenceApplicationPlan, preview consequential automatic changes, persist
scope stores transactionally where possible, apply immediate changes, and record
pending reload or restart settings. Use expected revisions and idempotency
request IDs. Never trust a renderer-created application plan.

Cancel discards only unapplied changes and reverts immediate previews. Restore
Category or Restore All changes the draft first and requires Apply. Partial local
and remote results must be reported accurately.

Support complete keyboard operation, accessible category navigation, persistent
labels, scope and inherited-state announcements, linked errors, safe key-binding
capture, visible focus, high text scaling, localization, and right-to-left
layouts. Treat preference files, labels, locale packages, key chords, repository
references, cloud values, and renderer commands as untrusted. Recover invalid
configuration to safe defaults. Do not copy proprietary artwork, exact wording,
source code, logos, or databases.
```

---

## 82. Next planned item

**Screen 17: Display and Sound Options** should define display mode, resolution and monitor selection, refresh and frame pacing, hardware acceleration, interface rendering, brightness and contrast preview, master and channel volumes, mute behavior, background music, interface and match sounds, output device, accessibility captions and visual sound cues, safe preview and automatic rollback, restart requirements, persistence, and recovery from invalid display configuration.

---

## Suggested Git commit

```text
feat(docs): specify game preferences screen
```
