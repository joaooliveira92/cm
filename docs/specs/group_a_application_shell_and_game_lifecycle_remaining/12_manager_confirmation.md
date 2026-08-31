# Screen 12: Manager Confirmation

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, databases, source code, logos, exact interface wording, or other protected assets. Use an original visual identity and fictional or properly licensed football data.

---

## 1. Purpose

The **Manager Confirmation** screen is the final review and transactional activation step for an incomplete human manager draft.

It appears after **Club Selection** and before the manager enters the active career interface.

The screen must allow the user to:

- Review every manager-creation section in one place.
- Verify personal details, nationalities, languages, background, archetype allocation, and initial role.
- Return directly to any editable section.
- Understand the consequences of the selected club, national team, or unemployed start.
- Review any AI incumbent replacement.
- Review the initial contract and board expectations when employed.
- Review ownership and local privacy behavior.
- Review unresolved warnings.
- Confirm that manager creation will become permanent career state.
- Activate the manager through one atomic transaction.
- Recover safely when eligibility, availability, ownership, or reservation state changes.
- Enter the career only after the manager, employment, inbox, knowledge, and checkpoint updates are durable.

This screen is the boundary between a **manager draft** and an **active career manager**.

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
    v
Manager Background
    |
    v
Club Selection
    |
    | All manager stages complete
    v
Manager Confirmation
    |
    | Atomic activation succeeds
    v
Career Home or Manager Inbox
```

If activation fails, the manager remains a draft and the user returns to this screen or the relevant editable stage.

---

## 3. Core concepts

### 3.1 Manager draft

The draft contains the user's saved choices but has no active simulation authority.

### 3.2 Active manager

An active manager is a canonical career entity that can:

- Control an assigned organization.
- Receive private news and messages.
- Submit tactical and administrative commands.
- Advance through a career history.
- Hold reputation and relationships.
- Participate in multiplayer ownership and turn policies.

### 3.3 Activation transaction

Activation is the atomic operation that converts the draft into an active manager and applies every related career-state change.

### 3.4 Initial appointment

An initial appointment creates the manager's first employment relationship with a club or national team.

### 3.5 Unemployed activation

Unemployed activation creates the manager without an organization role.

### 3.6 Incumbent replacement

When policy permits, an AI incumbent may leave during initial manager activation. This must occur within the same transaction as the new appointment.

### 3.7 Activation checkpoint

A durable checkpoint created after activation allows the career to recover with the manager fully active or not active at all.

---

## 4. Entry contract

```typescript
interface OpenManagerConfirmationRequest {
  readonly careerId: string;
  readonly careerCheckpointId: string;
  readonly managerDraftId: string;
  readonly expectedDraftRevision: number;
  readonly personalDetailsStageRevision: number;
  readonly nationalityLanguagesStageRevision: number;
  readonly managerBackgroundStageRevision: number;
  readonly clubSelectionStageRevision: number;
  readonly controllerContextId: string;
}
```

Before rendering confirmation, verify:

- The career and initial checkpoint exist.
- The manager draft exists and is incomplete.
- The current controller owns or may confirm the draft.
- Every required stage is complete.
- Stage revisions match the draft manifest.
- No stage references unknown or removed entities.
- The selected role or unemployed mode remains structurally valid.
- No activation transaction is already running for the draft.

---

## 5. Conceptual desktop layout

```text
+--------------------------------------------------------------------------------+
| CREATE MANAGER                               Step 5 of 5: Review and Confirm    |
|--------------------------------------------------------------------------------|
| PERSONAL DETAILS                                                    [Edit]      |
| João Monteiro, age 28                                                         |
| Born in Brasília, Example Federation                                           |
| Portrait: Initials                                                             |
|--------------------------------------------------------------------------------|
| NATIONALITY AND LANGUAGES                                           [Edit]      |
| Primary nationality: Example Federation                                        |
| Additional nationality: North Republic                                         |
| Example Portuguese: Native or bilingual                                        |
| International English: Professional                                            |
|--------------------------------------------------------------------------------|
| MANAGER BACKGROUND                                                  [Edit]      |
| Playing career: Professional, national level                                   |
| Qualification: Intermediate coaching certificate                               |
| Starting reputation: Established professional                                  |
| Archetype: Balanced                                                            |
| Tactical 3 | Development 2 | Leadership 3 | Recruitment 2 | Club Mgmt 2       |
|--------------------------------------------------------------------------------|
| STARTING ROLE                                                       [Edit]      |
| North United, Exampleland First Division                                       |
| Status: Manager vacancy                                                        |
| Contract: 2 seasons                                                            |
| Board objective: Finish in the top half                                        |
|--------------------------------------------------------------------------------|
| WARNINGS                                                                       |
| [!] Wage budget is currently constrained.                                      |
| [ ] I understand that confirmation will activate this manager.                 |
|--------------------------------------------------------------------------------|
| [Back] [Save Draft and Exit]                          [Confirm and Enter Career]|
+--------------------------------------------------------------------------------+
```

Unemployed version:

```text
STARTING ROLE
Start unemployed

No organization will be assigned. You may apply for vacancies and receive
approaches according to career rules after entering the career.
```

These diagrams define information hierarchy and behavior rather than exact styling.

---

## 6. Screen regions

### 6.1 Header

Display:

- `Create Manager`.
- `Review and Confirm`.
- Final step indicator.
- Draft save state.
- Back navigation.

### 6.2 Review sections

Required sections:

- Personal Details.
- Nationality and Languages.
- Manager Background.
- Starting Role.
- Ownership and Privacy, when relevant.
- Warnings and consequences.

Each section includes an `Edit` action.

### 6.3 Confirmation acknowledgment

A final acknowledgment may be required for consequential activation.

It should describe the action neutrally and must not contain hidden consent for unrelated data processing.

### 6.4 Footer actions

Recommended actions:

- `Back`
- `Save Draft and Exit`
- `Confirm and Enter Career`

Optional:

- `Export Non-sensitive Summary`
- `Review Career Setup`

---

## 7. Review-section behavior

Each section must display the authoritative saved draft values, not unsaved renderer state from another screen.

Selecting `Edit`:

1. Records the confirmation return route.
2. Navigates to the chosen stage.
3. Preserves all other completed stages.
4. Marks dependent summaries stale if relevant.
5. Returns to Confirmation after the edited stage is saved and continued.

Example dependency behavior:

```text
Edit Personal Details
  -> Name or birth date may change
  -> Nationality and language stage remains unless policy invalidates it
  -> Background remains
  -> Club eligibility is revalidated
  -> Confirmation summary refreshes
```

---

## 8. Personal-details summary

Display:

- Effective display name.
- Age at career start.
- Date of birth according to privacy policy.
- Place of birth, if specified.
- Portrait source and preview.
- Local access protection state, without any secret.

Do not display:

- Plaintext access code.
- Original portrait path.
- Hidden account identifiers.

---

## 9. Nationality and languages summary

Display:

- Primary nationality.
- Additional nationalities.
- Selected languages and proficiency.
- Primary communication language when supported.
- Important employment or eligibility notes.

Do not imply that nationality or language predetermines personality or ability.

---

## 10. Background summary

Display:

- Playing-career profile.
- Coaching qualification.
- Starting-reputation profile.
- Archetype.
- Attribute allocation.
- Qualitative strength summary.
- Initial opportunity implications.

The point total must be recalculated from policy and canonical allocations.

---

## 11. Starting-role summary

### 11.1 Club appointment

Display:

- Club name.
- Nation and competition.
- Role.
- Vacancy or incumbent state.
- Contract preview.
- Board expectations.
- Financial warning summary.
- Reservation state.
- Eligibility state.

### 11.2 National-team appointment

Display:

- Association.
- Team level.
- Current campaign.
- Expectations.
- Eligibility.
- Dual-role implications where relevant.

### 11.3 Unemployed start

Display:

- Explicit unemployed state.
- No contract.
- No organization control.
- Job-search availability.
- No promise of immediate employment.

---

## 12. Contract preview

If the manager will begin employed, show a contract preview.

```typescript
interface InitialManagerContractPreview {
  readonly organizationId: string;
  readonly roleId: string;
  readonly startDate: string;
  readonly endDate?: string;
  readonly durationPolicyId: string;
  readonly wage?: Money;
  readonly wageVisibility: "exact" | "rounded" | "hidden";
  readonly currencyId?: string;
  readonly clauses: readonly ManagerContractClausePreview[];
  readonly boardExpectationIds: readonly string[];
}
```

Contract values must come from the authoritative appointment service.

The user should not negotiate unless the product explicitly introduces a negotiation workflow before activation.

---

## 13. AI incumbent replacement summary

When the selected role has an AI incumbent and replacement is permitted, display:

```text
Current manager: Jordan Ellis

Confirming this profile will replace the AI-controlled manager as a setup
appointment. Their prior career history will remain in the world database.
```

The summary should disclose whether the outgoing manager becomes:

- Unemployed.
- Reassigned by scenario policy.
- Removed only if they are a temporary setup placeholder.

Do not execute the replacement until activation commits.

---

## 14. Ownership summary

For a local manager, show:

```text
Control: Local manager on this device
```

For a network manager, show:

```text
Control: Network participant Jamie Silva
Connection: Connected
```

Ownership binding is revalidated during activation.

The screen must not reveal authentication secrets, invitation codes, or private account identifiers.

---

## 15. Final warnings

Warnings may include:

- AI incumbent replacement.
- Language mismatch.
- Qualification near the minimum.
- High board expectations.
- Financial distress.
- Weak squad depth.
- Unemployed career with few suitable vacancies.
- Local privacy not enabled in hot-seat play.
- Appointment reservation near expiry.

Warnings should be grouped by severity:

```typescript
type ManagerConfirmationIssueSeverity = "information" | "warning" | "blocking_error";
```

Blocking errors prevent confirmation.

---

## 16. Required acknowledgment

The final acknowledgment may read conceptually:

```text
I understand that confirming will create this manager and apply the selected
starting role to the career.
```

Rules:

- It applies only to manager activation.
- It is not marketing consent.
- It is invalidated if the selected role or any material warning changes.
- It should not be required repeatedly after an operational retry with unchanged inputs.

---

## 17. Pre-confirmation validation

Before enabling the final action, validate:

- Draft ownership.
- Manager capacity.
- Complete required stages.
- Unique draft and slot relationship.
- Name policy.
- Birth-date policy.
- Nationality and language policy.
- Background allocation and point total.
- Role selection or explicit unemployment.
- Role eligibility.
- Role availability.
- Reservation validity.
- AI incumbent policy.
- Multiplayer exclusivity.
- Contract-generation viability.
- Career checkpoint writability.

The renderer's earlier validation indicators are advisory. Confirmation uses a trusted authoritative validator.

---

## 18. Activation transaction overview

Manager activation should be one atomic application transaction.

```text
Validate inputs
  -> Acquire activation lock
  -> Revalidate role and ownership
  -> Create canonical manager entity
  -> Bind controller ownership
  -> Create employment or unemployed status
  -> Replace AI incumbent if required
  -> Initialize manager knowledge
  -> Initialize relationships and reputation
  -> Create subscriptions and inbox
  -> Update organization control
  -> Record manager history
  -> Release draft reservation
  -> Mark draft completed
  -> Create activation checkpoint
  -> Commit
```

If any canonical step fails, roll back all activation changes.

---

## 19. Activation lock

The transaction must acquire locks or equivalent concurrency controls for:

- Manager draft.
- Manager slot.
- Selected exclusive role.
- Organization control state.
- Incumbent employment record.
- Career checkpoint transaction.

Lock acquisition must be bounded and cancellable before the commit phase.

---

## 20. Active manager creation

```typescript
interface ActiveCareerManager {
  readonly managerId: string;
  readonly careerId: string;
  readonly slotId: string;
  readonly displayName: string;
  readonly nameProfile: CanonicalManagerName;
  readonly birthDate: PartialBirthDate;
  readonly placeOfBirthId?: string;
  readonly nationalityProfile: CanonicalManagerNationalityProfile;
  readonly communicationProfile: CanonicalManagerCommunicationProfile;
  readonly backgroundProfile: CanonicalManagerBackgroundProfile;
  readonly portraitAssetId?: string;
  readonly ownership: ManagerOwnership;
  readonly employment: ManagerEmploymentState;
  readonly createdAt: string;
  readonly activatedAt: string;
}
```

The manager ID must be new, stable, career-local, and independent from the draft ID.

---

## 21. Manager attribute derivation

The trusted domain layer derives canonical starting manager capabilities from:

- Background profiles.
- Archetype allocation.
- Qualification profile.
- Language profile where relevant.
- Policy version.
- Career rules.

```typescript
interface ManagerCapabilityDerivationInput {
  readonly backgroundSnapshotId: string;
  readonly nationalityLanguagesSnapshotId: string;
  readonly derivationPolicyVersion: string;
  readonly careerSeedStreamId: string;
}
```

The renderer must not submit final low-level capability values.

---

## 22. Reputation initialization

Initialize separate reputation dimensions if modeled:

- Overall football reputation.
- Nation or region familiarity.
- Club reputation relationship.
- Player recognition.
- Media recognition.
- Qualification credibility.

Avoid collapsing all perception into one unexplained number.

---

## 23. Knowledge initialization

Manager knowledge may derive from:

- Nationalities.
- Languages.
- Place of birth.
- Playing background.
- Club appointment.
- Staff relationships.
- Career database visibility rules.

Knowledge initialization must not reveal every hidden player attribute.

---

## 24. Relationship initialization

Potential initial relationships:

- Board members.
- Assistant manager.
- Existing staff.
- Club captain.
- AI incumbent, when replaced.
- Media organizations.
- National association.

Relationships should begin from explicit policy, not arbitrary stereotypes.

---

## 25. Employment creation

For an employed start, create:

- Manager employment record.
- Contract.
- Organization role assignment.
- Start date.
- Board objectives.
- Wage and currency when modeled.
- Control permissions.
- Relevant history entry.

For an unemployed start, create:

- Explicit unemployed state.
- Job-search eligibility.
- Initial reputation and knowledge.
- No contract or organization control.

---

## 26. AI incumbent transition

Within the same transaction:

1. Revalidate that the incumbent is still AI controlled.
2. Close or replace their employment record according to policy.
3. Preserve history.
4. Create any departure event required by the scenario.
5. Assign the human manager.
6. Prevent an intermediate organization-without-manager state from becoming observable.

If the incumbent changed since Club Selection, fail before mutation and return for review.

---

## 27. Ownership binding

Bind the manager to exactly one controller.

For network careers:

- Revalidate participant session.
- Revalidate invitation or ownership claim.
- Bind through the authoritative server.
- Broadcast only after commit.

For local hot-seat careers:

- Bind the local controller profile.
- Preserve local privacy verifier references.
- Initialize secure manager switching state.

---

## 28. Manager permissions

After activation, derive permissions from:

- Employment role.
- Career mode.
- Delegation policy.
- Multiplayer ownership.
- Organization scope.

Examples:

- View private inbox.
- Submit team selection.
- Change tactics.
- Negotiate transfers.
- Manage staff.
- Advance time when turn policy permits.

Permissions must not come from the renderer.

---

## 29. Inbox initialization

Create manager-specific inbox state only after the manager exists.

Potential opening messages:

- Welcome or appointment summary.
- Board expectations.
- Squad overview.
- Staff introductions.
- Upcoming fixtures.
- Registration deadlines.
- Contract and transfer reminders.
- Unemployed job-market overview.

Messages should be generated from templates and career state, not copied from the source game.

---

## 30. Subscription initialization

Initialize:

- Club news subscriptions.
- Competition subscriptions.
- National-team subscriptions.
- Transfer and contract alerts.
- Job-vacancy alerts for unemployed managers.
- Staff-assignment notifications.

Default subscriptions must be policy-driven and editable later.

---

## 31. History initialization

Create an initial career-history entry:

```typescript
interface ManagerCareerHistoryEntry {
  readonly entryId: string;
  readonly managerId: string;
  readonly date: string;
  readonly type: "appointed" | "activated_unemployed";
  readonly organizationId?: string;
  readonly roleId?: string;
  readonly source: "initial_manager_creation";
}
```

Do not backdate fictional managerial employment before the career start unless selected through a supported scenario.

---

## 32. Draft completion

After canonical manager creation:

- Mark the draft completed.
- Store the resulting manager ID.
- Revoke any remaining draft edit lease.
- Release appointment reservation.
- Remove temporary portrait assets not referenced by the manager.
- Preserve a minimal activation audit record.
- Prevent the draft from being resumed as incomplete.

---

## 33. Activation checkpoint

A durable activation checkpoint must contain:

- New manager entity.
- Ownership binding.
- Employment or unemployed state.
- Incumbent transition.
- Organization control state.
- Manager inbox and subscriptions.
- Manager history.
- Draft completion reference.
- Activation transaction ID.
- Schema and policy versions.

The application must not enter the career UI until this checkpoint is durable.

---

## 34. Confirmation command

```typescript
interface ConfirmManagerActivationCommand {
  readonly careerId: string;
  readonly careerCheckpointId: string;
  readonly managerDraftId: string;
  readonly expectedDraftRevision: number;
  readonly expectedRoleStateRevision?: number;
  readonly appointmentReservationId?: string;
  readonly controllerContextId: string;
  readonly acknowledgedWarningCodes: readonly string[];
  readonly activationAcknowledgmentFingerprint: string;
  readonly requestId: string;
}
```

The command contains references and acknowledgments, not trusted derived attributes or contract values.

---

## 35. Idempotency

Activation must be idempotent.

If the same `requestId` is submitted again:

- Return the original success result when activation already succeeded.
- Return the current in-progress status when still running.
- Do not create a second manager.
- Do not create a second employment record.
- Do not repeat incumbent removal.

---

## 36. Activation result

```typescript
interface ManagerActivationResult {
  readonly activationTransactionId: string;
  readonly managerId: string;
  readonly careerId: string;
  readonly newCheckpointId: string;
  readonly employmentState: ManagerEmploymentState;
  readonly inboxId: string;
  readonly historyEntryId: string;
  readonly warnings: readonly ManagerActivationWarning[];
  readonly activatedAt: string;
}
```

The UI receives identifiers and summaries, not the complete mutable career world.

---

## 37. Confirm button behavior

When activated:

1. Commit the acknowledgment control.
2. Disable all mutating actions.
3. Display `Confirming manager...`.
4. Submit exactly one idempotent command.
5. Show transaction progress when activation exceeds a short threshold.
6. Do not allow navigation away during the commit boundary.
7. On success, transition to the career.
8. On failure, restore safe controls and explain the next action.

---

## 38. Activation progress

For a longer operation, show stages:

```text
[x] Validating manager profile
[x] Checking starting role
[>] Creating manager and appointment
[ ] Preparing inbox
[ ] Saving career checkpoint
```

Progress must not reach completion before the checkpoint is durable.

---

## 39. Back behavior

Before activation starts, Back returns to Club Selection.

Rules:

- Keep all completed stages.
- Preserve the current reservation according to policy.
- Invalidate the final acknowledgment when material data changes.
- Do not create or remove a manager.

During a noncommitting validation phase, cancellation may be supported.

During the final commit phase, Back is disabled with an explanation.

---

## 40. Save Draft and Exit

This action:

1. Verifies the current draft is durably saved.
2. Releases or preserves the appointment reservation according to policy.
3. Returns to Add Manager or Main Menu.
4. Leaves the manager inactive.
5. Allows later resume when the draft remains valid.

If the reservation is released, the selected role remains provisional and must be rechecked later.

---

## 41. Validation issue model

```typescript
interface ManagerConfirmationIssue {
  readonly code: string;
  readonly severity: ManagerConfirmationIssueSeverity;
  readonly sectionId?: string;
  readonly fieldId?: string;
  readonly entityId?: string;
  readonly messageKey: string;
  readonly parameters?: Readonly<Record<string, string | number>>;
  readonly correctiveRoute?: ManagerCreationRoute;
}
```

Each blocking issue should link to the stage where it can be corrected.

---

## 42. State model

```typescript
interface ManagerConfirmationScreenState {
  readonly careerId: string;
  readonly careerCheckpointId: string;
  readonly managerDraftId: string;
  readonly draftRevision: number;
  readonly stageRevisions: ManagerDraftStageRevisions;
  readonly review: ManagerDraftReviewModel;
  readonly contractPreview?: InitialManagerContractPreview;
  readonly incumbentTransition?: IncumbentTransitionPreview;
  readonly ownershipSummary: ManagerOwnershipSummary;
  readonly issues: readonly ManagerConfirmationIssue[];
  readonly acknowledgedWarningCodes: readonly string[];
  readonly acknowledgmentFingerprint?: string;
  readonly acknowledgmentChecked: boolean;
  readonly reservationState?: "not_required" | "valid" | "expiring" | "expired" | "invalid";
  readonly activationState:
    | "idle"
    | "validating"
    | "acquiring_lock"
    | "activating"
    | "saving_checkpoint"
    | "completed"
    | "failed";
}
```

Renderer-facing values must be serialized and schema-validated.

---

## 43. State transitions

```text
LOADING_REVIEW
  |
  v
VALIDATING_DRAFT
  |
  +-- invalid -> READY_WITH_ERRORS
  |
  v
READY
  |
  +-- Edit section --------> TARGET_MANAGER_STAGE
  |
  +-- Save Draft and Exit -> SAVING_EXIT_STATE -> ADD_MANAGER or MAIN_MENU
  |
  +-- Confirm -------------> VALIDATING_ACTIVATION
                                  |
                                  +-- errors -> READY_WITH_ERRORS
                                  +-- conflict -> READY_WITH_CONFLICT
                                  +-- warnings changed -> READY_REQUIRING_ACK
                                  +-- valid -> ACQUIRING_LOCKS
                                                   |
                                                   v
                                              ACTIVATING
                                                   |
                                                   v
                                          SAVING_CHECKPOINT
                                                   |
                             +---------------------+------------------+
                             |                                        |
                             v                                        v
                         COMPLETED                                 FAILED
                             |                                        |
                             v                                        v
                      CAREER_INBOX                    ROLLBACK or RECOVERY
```

No state may transition from failed partial activation directly into the career UI.

---

## 44. Commands and events

### 44.1 Commands

```text
LOAD_MANAGER_CONFIRMATION
OPEN_MANAGER_CREATION_SECTION
ACKNOWLEDGE_MANAGER_CONFIRMATION_WARNING
SET_ACTIVATION_ACKNOWLEDGMENT
REFRESH_CONFIRMATION_VALIDATION
RENEW_APPOINTMENT_RESERVATION
SAVE_MANAGER_DRAFT_AND_EXIT
REQUEST_BACK
CONFIRM_MANAGER_ACTIVATION
RETRY_MANAGER_ACTIVATION
COPY_SAFE_ACTIVATION_DIAGNOSTIC
```

### 44.2 Events

```text
MANAGER_CONFIRMATION_LOADED
MANAGER_CONFIRMATION_VALIDATED
MANAGER_CONFIRMATION_ISSUES_CHANGED
APPOINTMENT_RESERVATION_RENEWED
MANAGER_ACTIVATION_STARTED
MANAGER_ACTIVATION_LOCKED
ACTIVE_MANAGER_CREATED
INITIAL_APPOINTMENT_CREATED
AI_INCUMBENT_REPLACED
MANAGER_OWNERSHIP_BOUND
MANAGER_INBOX_INITIALIZED
MANAGER_DRAFT_COMPLETED
MANAGER_ACTIVATION_CHECKPOINT_CREATED
MANAGER_ACTIVATION_COMPLETED
MANAGER_ACTIVATION_FAILED
MANAGER_ACTIVATION_ROLLED_BACK
```

Every mutating command requires expected revisions and an idempotency request ID.

---

## 45. Concurrency and conflict handling

Potential conflicts:

- Another human manager claims the selected role.
- The AI incumbent changes.
- The appointment reservation expires.
- The manager draft is edited elsewhere.
- Ownership changes.
- Manager capacity is reached.
- The career checkpoint changes due to another activation.
- Two confirmation requests are submitted.

Use authoritative locks and expected revisions.

Conflict example:

```text
North United is no longer available because the role changed in another
session.

Your manager profile remains saved. Return to Club Selection to choose another
role or start unemployed.

[Return to Club Selection]
```

---

## 46. Rollback behavior

If activation fails before checkpoint commit:

- Remove the incomplete active-manager entity.
- Restore the AI incumbent when modified.
- Restore organization control state.
- Remove incomplete employment records.
- Remove incomplete inbox and subscriptions.
- Restore the manager draft to confirmable state.
- Preserve or renew the reservation when safe.
- Record the failure and rollback result.

Rollback itself must be validated.

If rollback cannot complete, quarantine the career transaction and require recovery before normal play.

---

## 47. Failure states

### Role no longer available

```text
The selected starting role is no longer available.

Your manager details are preserved.

[Return to Club Selection]
```

### Qualification or eligibility changed

```text
The selected role no longer accepts this manager profile under the current
career rules.

[Review Requirement] [Edit Manager Background] [Choose Another Role]
```

### Ownership changed

```text
You no longer have permission to activate this manager draft.

[Return to Add Manager]
```

### Checkpoint unavailable

```text
The career could not save the manager activation checkpoint.

No manager activation was committed.

[Retry] [Save Draft and Exit]
```

### Partial transaction recovery

```text
Manager activation was interrupted and the career requires recovery before it
can continue.

Diagnostic reference: MANAGER-ACT-2048

[Recover Career] [Copy Safe Diagnostic]
```

### Network host unavailable

```text
The host could not confirm manager activation.

Your draft remains saved.

[Retry Connection] [Save Draft and Exit]
```

### Warning set changed

```text
The appointment details changed and require review before confirmation.

[Review Updated Details]
```

---

## 48. Successful completion

After the activation checkpoint is durable:

```text
Manager created successfully

João Monteiro has been appointed manager of North United.

[Enter Career]
```

For unemployed start:

```text
Manager created successfully

João Monteiro has entered the career as an unemployed manager.

[View Job Vacancies] [Enter Inbox]
```

The application may transition automatically according to accessibility and product policy, but it should not add an artificial delay.

---

## 49. Initial destination

Possible destinations:

- Manager Inbox.
- Club Overview.
- Welcome summary.
- Job Vacancies for an unemployed manager.
- Multiplayer waiting state if another participant must finish setup.

```typescript
interface InitialManagerDestinationPolicy {
  readonly employedDestination: "inbox" | "club_overview" | "welcome_summary";
  readonly unemployedDestination: "inbox" | "job_vacancies" | "welcome_summary";
  readonly multiplayerWaitingDestination?: "waiting_room" | "inbox";
}
```

The destination is policy-driven and must not affect transaction correctness.

---

## 50. Accessibility requirements

### 50.1 Review structure

Use headings for each review section. Each Edit action must name its destination:

```text
Edit Personal Details
Edit Nationality and Languages
Edit Manager Background
Edit Starting Role
```

### 50.2 Summary semantics

Use definition-list or grouped-field semantics for label-value pairs.

### 50.3 Warnings

Warnings require:

- Severity text.
- Description.
- Corrective action.
- Programmatic association with acknowledgment where needed.

### 50.4 Activation state announcements

Announce meaningful stages:

```text
Validating manager profile.
Creating manager and appointment.
Preparing manager inbox.
Saving career checkpoint.
Manager created successfully.
```

### 50.5 Focus management

- On load, focus the page heading or first blocking issue.
- Editing a section returns focus to that section on return.
- Changed warnings focus the warning summary.
- During activation, focus moves to the progress heading.
- On failure, focus moves to the error summary.
- On success, focus moves to the success heading or Enter Career action.

### 50.6 Non-color communication

Warnings, completion, reservation state, and errors must use text or icon-plus-text.

---

## 51. Keyboard interaction

- `Tab` and `Shift+Tab`: move between controls.
- Arrow keys: navigate warning lists or segmented review navigation where used.
- `Enter` or `Space`: activate Edit, acknowledgment, and confirmation controls.
- `Ctrl+S`: save the draft and exit only if the product maps this shortcut explicitly and explains it.
- `Ctrl+Enter`: activate confirmation when valid and acknowledged, if supported.
- `Escape`: close dialogs or return to Club Selection before activation begins.
- `Home` and `End`: move to the first or last review section when section navigation is focused.

No shortcut may bypass acknowledgment or final authoritative validation.

---

## 52. Localization requirements

- Localize every label, warning, summary, and consequence.
- Use locale-aware names, dates, ages, currencies, and durations.
- Preserve stable IDs independently from display labels.
- Support right-to-left layouts.
- Allow long club, qualification, and competition names to wrap.
- Use complete message templates.
- Do not concatenate translated fragments for appointment summaries.
- Preserve manager-selected name order.
- Do not expose untranslated internal policy codes.

---

## 53. Responsive behavior

### Wide desktop

Use stacked review cards or two-column summary sections with a persistent warning and action area.

### Standard desktop

Use a single review column with Edit actions aligned consistently.

### Narrow desktop

Stack:

```text
Header
Personal Details
Nationality and Languages
Background
Starting Role
Warnings
Acknowledgment
Actions
```

### High text scaling

- Place Edit actions below section summaries when needed.
- Let attribute allocation wrap into multiple lines.
- Keep acknowledgment text visible in full.
- Prevent footer actions from overlapping review content.

### Ultrawide display

Use a bounded readable width. Do not spread short summaries across the full screen.

---

## 54. Security and integrity requirements

Treat all manager names, club labels, portrait assets, draft IDs, reservation tokens, ownership data, and network messages as untrusted.

Protect against:

- Script and markup injection.
- Forged draft or stage revisions.
- Forged role state.
- Reservation theft or replay.
- Duplicate activation.
- Partial manager creation.
- Partial incumbent replacement.
- Unauthorized ownership binding.
- Checkpoint tampering.
- Stale warning acknowledgments.
- Money currency confusion.
- Diagnostic data leakage.
- Unsafe deserialization.

Rules:

1. Render all user and database text safely.
2. Validate every snapshot and ID in a trusted process or server.
3. Recalculate attributes, eligibility, contract, and permissions authoritatively.
4. Use scoped expiring reservations.
5. Use expected revisions and idempotency keys.
6. Acquire transactional locks for draft, slot, role, and checkpoint state.
7. Commit active manager, employment, ownership, inbox, and draft completion atomically.
8. Do not trust renderer-supplied contract or attribute values.
9. Invalidate acknowledgments after material changes.
10. Store money with explicit currency and minor units.
11. Sanitize copied diagnostics.
12. Enter the career only after durable checkpoint promotion.

---

## 55. Persistence rules

Persist on successful activation:

- Canonical active manager.
- Canonical name and biography data.
- Nationality and language profile.
- Background and derived capabilities.
- Portrait asset reference.
- Ownership binding.
- Employment or unemployed state.
- Contract and board objectives.
- Incumbent transition.
- Inbox and subscriptions.
- Manager history.
- Draft completion mapping.
- Activation checkpoint.
- Transaction audit metadata.

Do not persist as successful:

- Half-created manager entities.
- Employment without manager ownership.
- Manager ownership without permissions.
- Inbox without active manager.
- Uncommitted incumbent replacement.
- Expired reservation.
- Renderer-derived capabilities.

---

## 56. Observability

Useful operational events:

- Confirmation screen opened.
- Draft validation outcome.
- Role revalidation outcome.
- Activation started.
- Lock acquisition duration.
- Manager created.
- Incumbent transition applied.
- Inbox initialized.
- Checkpoint created.
- Activation completed or failed.
- Rollback completed or failed.

Avoid recording in general telemetry:

- Full manager name.
- Date of birth.
- Nationalities and languages.
- Portrait content.
- Local access secrets.
- Exact club choice.
- Reservation tokens.
- Private account identifiers.

---

## 57. Edge cases

### Draft changes after confirmation loads

Invalidate the summary and reload before allowing activation.

### Appointment reservation expires

Renew or return to Club Selection. Do not confirm against an expired reservation.

### AI incumbent changes

Stop activation before mutation and require role review.

### Another human manager claims the role

Preserve the draft and route to Club Selection.

### Manager capacity is reached concurrently

Reject activation and refresh Add Manager state.

### Same confirmation request is retried after success

Return the original ManagerActivationResult.

### Connection drops during activation

The authoritative host or server completes or rolls back the transaction. Reconnection queries by request ID.

### Application closes during commit

On restart, inspect the activation transaction and checkpoint manifest. Resolve to fully committed or rolled back state before allowing play.

### Portrait asset missing

If portrait is optional, offer a safe initials fallback before activation. Do not block on an external generated-avatar service.

### Contract preview changes

Invalidate acknowledgment and require review.

### Career checkpoint changes because another manager activates

Refresh role state and rebase only when safe. Never apply against an unknown checkpoint revision.

### Inbox generation partially fails

Rollback or use a policy-approved deterministic minimal inbox before checkpoint commit. Do not activate with an invalid inbox reference.

### Unemployed manager has no suitable vacancies

This is not an activation error. Preserve the explicit unemployed choice and disclose it as a warning.

### Local privacy verifier missing

If local privacy was selected, block activation until the verifier is safely stored or the user explicitly disables the feature.

---

## 58. Acceptance criteria

The screen is complete when:

1. It opens only for an authorized draft with all required stages complete.
2. Every review section displays authoritative saved draft values.
3. Each section has a direct Edit route.
4. Editing a section preserves unrelated completed stages.
5. Material edits invalidate affected warnings and acknowledgment.
6. Personal summaries never expose plaintext access codes or original portrait paths.
7. Background point totals are recalculated from policy.
8. Starting-role summaries reflect current eligibility, availability, incumbent, and reservation state.
9. Contract previews come from an authoritative appointment service.
10. AI incumbent replacement is disclosed before confirmation.
11. Provisional selection does not mutate career employment.
12. Confirmation performs fresh validation in a trusted process.
13. Activation locks the manager draft, slot, selected role, organization state, and checkpoint transaction as required.
14. Active manager creation, ownership, employment, incumbent transition, inbox, history, and draft completion are atomic.
15. Failed activation leaves either the complete prior state or a recoverable quarantined transaction.
16. Duplicate requests cannot create duplicate managers or appointments.
17. The same request ID returns the original result after success.
18. Renderer-supplied attributes, eligibility, contracts, and permissions are never trusted.
19. The active manager receives one stable manager ID distinct from the draft ID.
20. Manager knowledge, reputation, relationships, and capabilities are derived by versioned policies.
21. Unemployed activation creates no contract or organization control.
22. Appointment activation creates a valid contract and history entry.
23. Draft completion prevents future incomplete-draft resume.
24. The career UI opens only after a durable activation checkpoint.
25. Back and Save Draft and Exit never activate the manager.
26. Keyboard users can review, edit, acknowledge, and confirm.
27. Screen-reader users receive structured summaries, warnings, activation progress, and results.
28. High text scaling and right-to-left layouts remain usable.
29. Successful activation transitions to the policy-defined initial career destination.
30. No proprietary artwork, exact wording, source code, logos, or original database content is required.

---

## 59. Recommended tests

### Unit tests

- Required-stage validation.
- Stage-revision validation.
- Review-model construction.
- Material-change fingerprinting.
- Warning-acknowledgment invalidation.
- Contract-preview mapping.
- Incumbent-transition preview.
- Activation command schema.
- Manager ID versus draft ID separation.
- Idempotency-result lookup.
- Initial-destination policy.
- Permission derivation input validation.

### Integration tests

- Confirm a vacant club appointment.
- Confirm an AI-incumbent replacement.
- Confirm an unemployed manager.
- Confirm a national-team appointment when supported.
- Edit each review section and return.
- Save Draft and Exit.
- Retry after a transient checkpoint failure.
- Create manager inbox and subscriptions.
- Create manager history entry.
- Transition to Manager Inbox.
- Load the career after activation and verify ownership.
- Ensure the completed draft cannot resume as incomplete.

### Transaction tests

- Fail before manager creation.
- Fail after manager creation but before employment.
- Fail after incumbent transition.
- Fail during inbox initialization.
- Fail during checkpoint creation.
- Verify complete rollback at every failure boundary.
- Verify quarantine when rollback itself fails.
- Retry the same request after client timeout.
- Submit two request IDs for the same draft concurrently.

### Concurrency tests

- Two managers confirm the same role.
- Reservation expires during confirmation.
- AI incumbent changes during lock acquisition.
- Draft changes during confirmation.
- Ownership changes during confirmation.
- Manager capacity is reached concurrently.
- Career checkpoint changes concurrently.
- Client disconnects during activation.
- Duplicate Confirm activation from rapid input.

### Security tests

- Forged manager draft ID.
- Forged stage revisions.
- Forged role-state revision.
- Stolen or replayed reservation token.
- Cross-career reservation token.
- Forged contract preview.
- Forged derived attributes.
- Forged ownership context.
- Stale acknowledgment fingerprint.
- Markup-like names and club labels.
- Unsafe portrait reference.
- Money currency mismatch.
- Malicious serialized activation command.
- Diagnostic secret leakage.

### Accessibility tests

- Keyboard-only review and confirmation.
- Edit-route labels.
- Review heading navigation.
- Warning acknowledgment.
- Changed-warning focus.
- Activation-stage announcements.
- Failure-summary focus.
- Success-summary focus.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long localized names, qualifications, clubs, and objectives.

### Visual regression tests

Capture at least:

- Complete employed-manager review.
- Unemployed-manager review.
- National-team review.
- AI incumbent replacement warning.
- Financial warning.
- Expiring reservation.
- Blocking validation error.
- Changed-warning acknowledgment reset.
- Activation progress.
- Activation failure.
- Rollback-required error.
- Success state.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 60. Condensed LLM implementation brief

```text
Implement a desktop Manager Confirmation screen for an original football-
management simulation. It is the final boundary between an incomplete
ManagerDraft and an active career manager.

Load authoritative saved values for Personal Details, Nationality and
Languages, Manager Background, and Club Selection. Display structured review
sections with direct Edit actions. Editing one stage preserves unrelated stages
but invalidates dependent eligibility, warnings, contract previews, and final
acknowledgment when material data changes.

Show the selected club, national team, or explicit unemployed start. For an
employed manager, show authoritative role availability, eligibility, reservation
state, contract preview, board expectations, and any AI-incumbent replacement.
Do not expose plaintext local access codes, original portrait paths,
authentication secrets, or internal account identifiers.

Before enabling confirmation, authoritatively validate draft ownership, manager
capacity, every stage revision, name and age policy, nationality and language
policy, background allocations and configured point total, role eligibility,
role availability, reservation, incumbent policy, multiplayer exclusivity,
contract viability, and checkpoint writability. Renderer validation is advisory
only.

Confirmation sends references, expected revisions, warning acknowledgments, an
activation-acknowledgment fingerprint, and an idempotency request ID. Never trust
renderer-supplied low-level attributes, contracts, eligibility, permissions, or
role state.

Activate through one atomic transaction: acquire locks, create a stable active
manager ID distinct from the draft ID, derive capabilities, reputation,
knowledge and relationships through versioned policies, bind controller
ownership, create employment or explicit unemployment, replace an AI incumbent
when policy permits, initialize permissions, inbox, subscriptions and manager
history, complete the draft, release reservations, create a durable activation
checkpoint, and commit.

If any canonical step fails, restore the complete prior state. If rollback fails,
quarantine the transaction and require career recovery before play. Duplicate
requests must never create duplicate managers, appointments, inboxes, or
incumbent transitions. Repeating a successful request ID returns the original
ManagerActivationResult.

During activation, disable mutating controls and announce meaningful progress.
Do not enter the career UI until the activation checkpoint is durable. On
success, navigate to the policy-defined destination, such as Manager Inbox,
Club Overview, Welcome Summary, Job Vacancies, or a multiplayer waiting state.

Support full keyboard operation, structured accessible summaries, explicit Edit
labels, visible focus, linked warnings, activation announcements, high text
scaling, localization, and right-to-left layouts. Treat all draft data,
identifiers, reservations, portrait assets, money, ownership details, and
network messages as untrusted. Do not copy proprietary artwork, exact wording,
source code, logos, or databases.
```

---

## 61. Next planned item

**Screen 13: Load Saved Game** should define save discovery, metadata cards, sorting and filtering, autosaves and manual saves, compatibility and integrity status, cloud and local locations, multiplayer ownership, migrations, corrupt-save handling, preview details, loading progress, cancellation, recovery, and transition into the career.

---

## Suggested Git commit

```text
feat(docs): specify manager confirmation screen
```
