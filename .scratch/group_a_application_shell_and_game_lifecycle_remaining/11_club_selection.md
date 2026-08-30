# Screen 11: Club Selection

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, databases, source code, logos, exact interface wording, or other protected assets. Use an original visual identity and fictional or properly licensed football data.

---

## 1. Purpose

The **Club Selection** screen lets the user choose the manager draft's initial employer or begin the career unemployed.

It appears after **Manager Background** and before **Manager Confirmation**.

The screen must allow the user to:

- Browse clubs in playable competitions.
- Search and filter eligible clubs.
- Distinguish eligible, unavailable, occupied, restricted, and unsuitable appointments.
- Review current club information before making a choice.
- Understand board expectations, club stature, finances, facilities, squad condition, and competition participation.
- Understand how the manager's reputation, qualifications, nationality, languages, and background affect appointment eligibility.
- Choose a club according to the career's vacancy and incumbent-manager policy.
- Select a national team when supported by the career mode.
- Start unemployed when permitted.
- Resolve multiplayer conflicts when another human manager targets the same role.
- Save a provisional choice as part of the manager draft.
- Continue to Manager Confirmation only after authoritative validation.

This screen does not activate the appointment. The club or national-team role remains provisional until Manager Confirmation commits the complete manager transaction.

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
    | Background stage complete
    v
Club Selection
    |
    | Provisional employer or unemployed choice saved
    v
Manager Confirmation
    |
    | Manager activation transaction committed
    v
Career Inbox
```

When the user returns from Manager Confirmation, the current provisional selection must be restored and revalidated against the latest career state.

---

## 3. Core concepts

### 3.1 Manageable organization

A manageable organization is a club or national association that the career permits a human manager to control.

### 3.2 Role

A role identifies the managerial position being selected.

```typescript
type ManageableRoleType =
  | "club_first_team_manager"
  | "club_reserve_manager"
  | "club_youth_manager"
  | "national_team_manager"
  | "national_youth_team_manager";
```

Most early-career workflows expose only first-team club manager roles unless the simulation explicitly supports the other role types.

### 3.3 Eligibility

Eligibility means the manager draft is permitted to select a role under current career rules.

Eligibility may depend on:

- Competition playability.
- Existing incumbent policy.
- Vacancy state.
- Manager reputation.
- Coaching qualification.
- Nationality or work authorization.
- Language policy.
- Scenario restrictions.
- Multiplayer ownership.
- Organization-specific restrictions.

### 3.4 Availability

Availability means a role can be reserved at the current moment. A role may be eligible in principle but temporarily unavailable because another manager or transaction holds it.

### 3.5 Suitability

Suitability is a nonbinding estimate of how well the manager's profile aligns with an organization.

It must not be treated as eligibility or a guarantee of success.

### 3.6 Provisional selection

A provisional selection is stored in the manager draft but does not yet replace an incumbent, create a contract, or grant control.

### 3.7 Appointment reservation

A short-lived reservation prevents two manager-confirmation transactions from claiming the same exclusive role simultaneously.

### 3.8 Unemployed start

An unemployed start activates the manager without an employer. The manager enters the career and may apply for jobs or receive offers according to simulation rules.

---

## 4. Entry contract

```typescript
interface OpenClubSelectionRequest {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly expectedDraftRevision: number;
  readonly managerBackgroundStageRevision: number;
  readonly careerCheckpointId: string;
  readonly controllerContextId: string;
}
```

Before enabling selection, verify:

- The career exists and is readable.
- The manager draft exists and remains incomplete.
- The current controller may edit the draft.
- All previous manager stages are complete.
- The career checkpoint is compatible with the draft.
- Playable competition data is available.
- Manageable-role policies are available.
- The expected draft revision is current.
- No conflicting confirmation transaction is active for this draft.

---

## 5. Conceptual desktop layout

```text
+--------------------------------------------------------------------------------+
| CREATE MANAGER                              Step 4 of 5: Select Starting Role   |
|--------------------------------------------------------------------------------|
| [Clubs] [National Teams] [Start Unemployed]                                    |
|                                                                                |
| Search clubs... [Nation: All v] [Division: All v] [Status: Eligible v]         |
| [Reputation: All v] [Sort: Suitability v]                                      |
|--------------------------------------------------------------------------------|
| CLUBS                                           | CLUB OVERVIEW                 |
|                                                 |                               |
| [ ] Example City FC                            | Example City FC               |
|     Exampleland Premier Division               | Premier Division             |
|     Eligible, strong fit                       |                               |
|                                                 | Status: Manager vacancy       |
| [o] North United                               | Reputation: National          |
|     Exampleland First Division                 | Professional status: Full     |
|     Eligible, moderate fit                     |                               |
|                                                 | Board expectation:           |
| [ ] Coastal Athletic                           | Finish in the top half        |
|     North Republic Premier Division            |                               |
|     Qualification required                     | Transfer budget: Moderate     |
|                                                 | Wage budget: Constrained      |
| [ ] Capital Rangers                            | Facilities: Good              |
|     Occupied by another human manager          | Squad size: 27                |
|                                                 | Squad concerns: 2             |
|                                                 |                               |
|                                                 | [View Full Club Profile]      |
|                                                 | [View Squad Summary]          |
|--------------------------------------------------------------------------------|
| Selected: North United                                                          |
| [Back] [Clear Selection] [Save Draft]                                 [Continue]|
+--------------------------------------------------------------------------------+
```

Unemployed mode:

```text
+--------------------------------------------------------------------------------+
| START UNEMPLOYED                                                               |
|--------------------------------------------------------------------------------|
| Begin the career without managing a club or national team.                     |
|                                                                                |
| You will be able to:                                                           |
| - Review available vacancies                                                   |
| - Apply for suitable jobs                                                      |
| - Receive approaches according to your reputation                              |
|                                                                                |
| No club will be reserved or assigned during manager creation.                  |
|                                                                                |
| [Select Unemployed Start]                                                       |
+--------------------------------------------------------------------------------+
```

These diagrams define information hierarchy and behavior, not exact styling.

---

## 6. Screen regions

### 6.1 Header

Display:

- `Create Manager`.
- Current stage.
- Step indicator.
- Draft save state.
- Back navigation.

### 6.2 Mode selector

Possible modes:

- Clubs.
- National Teams, when supported.
- Start Unemployed, when supported.

The selector changes the primary browser but does not commit a selection by itself.

### 6.3 Search and filter toolbar

Recommended controls:

- Search.
- Nation.
- Region.
- Competition or division.
- Professional status.
- Availability status.
- Eligibility status.
- Reputation band.
- Financial condition.
- Suitability band.
- Sort order.

### 6.4 Organization browser

Displays clubs or national teams from validated career queries.

### 6.5 Organization overview

Shows the selected organization's current state and appointment implications.

### 6.6 Selection summary

Shows the current provisional choice, reservation state, and any warnings.

### 6.7 Footer actions

Recommended actions:

- `Back`
- `Clear Selection`
- `Save Draft`
- `Continue`

---

## 7. Club browser row

```typescript
interface ClubSelectionRowModel {
  readonly clubId: string;
  readonly displayName: string;
  readonly shortName?: string;
  readonly nationDisplayName: string;
  readonly competitionDisplayName?: string;
  readonly professionalStatusLabel: string;
  readonly reputationBandLabel: string;
  readonly roleAvailability: RoleAvailabilityState;
  readonly eligibility: RoleEligibilitySummary;
  readonly suitability?: RoleSuitabilitySummary;
  readonly selected: boolean;
  readonly warningCodes: readonly string[];
}
```

Conceptual row states:

```text
Example City FC     Eligible, vacancy available
North United        Eligible, incumbent replacement permitted
Coastal Athletic    Ineligible, qualification requirement
Capital Rangers     Unavailable, controlled by another human manager
Harbour Town        Background competition, not manageable
```

---

## 8. Availability states

```typescript
type RoleAvailabilityState =
  | "vacant"
  | "occupied_ai_replacement_allowed"
  | "occupied_ai_replacement_forbidden"
  | "occupied_human"
  | "reserved_by_current_draft"
  | "reserved_by_other_draft"
  | "temporarily_locked"
  | "unavailable";
```

### 8.1 Vacant

The role has no current manager and may be provisionally selected if the draft is eligible.

### 8.2 AI incumbent replacement allowed

The career policy permits the new human manager to replace an AI-controlled incumbent during initial setup.

The interface must disclose the consequence.

### 8.3 AI incumbent replacement forbidden

The user cannot select the role while an AI manager holds it.

### 8.4 Occupied by human manager

The role is exclusive and cannot be selected by another human manager.

### 8.5 Reserved by another draft

Another incomplete manager draft or confirmation transaction currently holds the role.

### 8.6 Temporarily locked

The role is involved in a career transaction, network synchronization, or administrative operation.

---

## 9. Incumbent manager policy

```typescript
interface InitialAppointmentPolicy {
  readonly allowVacantClubSelection: boolean;
  readonly allowReplacingAiIncumbents: boolean;
  readonly allowReplacingHumanIncumbents: boolean;
  readonly allowNationalTeamSelection: boolean;
  readonly allowUnemployedStart: boolean;
  readonly requirePlayableCompetition: boolean;
  readonly reservationPolicyId: string;
  readonly managerCapacityPolicyId: string;
}
```

Replacing a human incumbent should normally be forbidden.

If AI replacement is permitted, the confirmation screen must state:

- Which incumbent will leave.
- Whether their history remains.
- Whether the departure is treated as a setup replacement rather than an in-world dismissal.

---

## 10. Eligibility model

```typescript
interface RoleEligibilitySummary {
  readonly eligible: boolean;
  readonly status: "eligible" | "eligible_with_warning" | "ineligible" | "unknown";
  readonly reasonCodes: readonly string[];
  readonly missingRequirementCodes: readonly string[];
}
```

Eligibility must be calculated by a trusted career service.

The renderer must not infer eligibility by comparing display values.

---

## 11. Eligibility factors

### 11.1 Competition playability

A club normally must participate in a playable competition or belong to a role explicitly supported by career policy.

### 11.2 Manager reputation

A club may require a minimum reputation band.

The threshold belongs to named career policy or club appointment rules.

### 11.3 Coaching qualification

Some roles may require a qualification profile.

### 11.4 Nationality and work authorization

The game may model whether the manager can legally or practically accept a role.

The interface should label this as a simulation rule and avoid presenting it as current legal advice.

### 11.5 Language

Language may affect suitability or adaptation. It should not automatically make a role impossible unless explicit competition rules require it.

### 11.6 Scenario restrictions

A challenge or historical scenario may restrict eligible organizations.

### 11.7 Multiplayer exclusivity

One exclusive role may have at most one active or confirming human manager.

---

## 12. Eligibility explanations

Eligible example:

```text
Eligible

- Competition is playable
- Manager reputation meets the club's starting-role policy
- Coaching qualification meets the minimum
```

Ineligible example:

```text
Not eligible

- Advanced coaching qualification required
- Your selected qualification is Intermediate
```

Warnings should be separate from blockers:

```text
Eligible with warning

You do not speak the club's primary working language. Initial communication
and adaptation may be more difficult.
```

---

## 13. Suitability model

Suitability is advisory.

```typescript
interface RoleSuitabilitySummary {
  readonly band: "very_strong" | "strong" | "moderate" | "weak" | "very_weak";
  readonly positiveReasonCodes: readonly string[];
  readonly concernReasonCodes: readonly string[];
  readonly confidence: "low" | "medium" | "high";
}
```

Potential inputs:

- Reputation alignment.
- Qualification alignment.
- Language compatibility.
- National and regional familiarity.
- Manager archetype relative to club context.
- Club stature.
- Squad development needs.
- Financial-management needs.

Suitability must not predict results or reveal hidden player attributes.

---

## 14. Search behavior

Search should match:

- Full club name.
- Short club name.
- Localized alias.
- City or locality.
- Nation.
- Competition.

Search must:

- Be debounced.
- Be cancellable.
- Use query revisions.
- Preserve selection when filters change.
- Avoid loading the full world into renderer memory.

```typescript
interface ClubSearchRequest {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly queryRevision: number;
  readonly query: string;
  readonly filters: ClubSelectionFilters;
  readonly sort: ClubSelectionSort;
  readonly page: CursorPageRequest;
  readonly signal: AbortSignal;
}
```

---

## 15. Filter behavior

```typescript
interface ClubSelectionFilters {
  readonly nationIds: readonly string[];
  readonly regionIds: readonly string[];
  readonly competitionIds: readonly string[];
  readonly professionalStatusIds: readonly string[];
  readonly availabilityStates: readonly RoleAvailabilityState[];
  readonly eligibilityStates: readonly string[];
  readonly reputationBandIds: readonly string[];
  readonly financialConditionIds: readonly string[];
  readonly suitabilityBands: readonly string[];
}
```

Filters affect visibility only. They must not clear a hidden provisional selection.

When the selected club is hidden:

```text
Your selected club is hidden by the current filters. [Show Selected Club]
```

---

## 16. Sorting

Recommended sort options:

- Club name.
- Nation.
- Competition.
- Reputation.
- Suitability.
- Financial condition.
- Vacancy status.

Sorting must be deterministic and use stable tie-breakers.

Suitability sorting should disclose when some records have low-confidence estimates.

---

## 17. Pagination and virtualization

The club list may contain many entries.

Requirements:

- Use cursor-based pagination or virtualized queries.
- Keep stable row identity.
- Preserve scroll position during detail updates.
- Do not send full squad data for every row.
- Load the selected club overview separately.
- Cancel obsolete page requests.

---

## 18. Club overview

The overview should provide a decision-useful summary without duplicating the full in-career Club Profile.

Recommended sections:

- Club identity.
- Nation and competition.
- Professional status.
- Current manager or vacancy.
- Club reputation.
- Board expectations.
- Financial summary.
- Transfer and wage budget bands.
- Facilities.
- Stadium.
- Squad summary.
- Key squad concerns.
- Staff summary.
- Recent performance.
- Appointment eligibility.
- Suitability explanation.

---

## 19. Club identity section

May display:

- Original or licensed club badge.
- Club name.
- Short name.
- City.
- Nation.
- Founded year.
- Professional status.
- Nickname only when original or licensed.
- Current competition.

Do not use copied real-world badges or protected club branding without appropriate rights.

---

## 20. Board expectations

The overview should summarize initial objectives.

Examples:

```text
League objective: Finish in the top half
Cup objective: Reach the quarter-final
Financial objective: Remain within wage budget
Development objective: Give opportunities to young players
```

Expectations must come from career state and should be revalidated at confirmation.

---

## 21. Financial summary

Use ranges or bands when exact figures should not be exposed before appointment.

Possible fields:

- Overall financial condition.
- Transfer budget.
- Wage budget.
- Current wage commitment.
- Debt summary.
- Expected seasonal balance.

```typescript
interface ClubFinancialPreview {
  readonly conditionBand: string;
  readonly transferBudget?: Money;
  readonly wageBudget?: Money;
  readonly committedWages?: Money;
  readonly debtBand?: string;
  readonly visibility: "exact" | "rounded" | "band_only";
}
```

All money values require explicit currency and minor-unit handling.

---

## 22. Facilities summary

Possible fields:

- Stadium name and capacity.
- Training facilities.
- Youth facilities.
- Academy or recruitment reach.
- Medical facilities.
- Planned facility changes.

Use qualitative bands backed by stable profile IDs.

---

## 23. Squad summary

Recommended preview:

```text
First-team players: 27
Average age: 25.6
Goalkeepers: 3
Defenders: 9
Midfielders: 8
Attackers: 7

Availability:
- Injured: 2
- Suspended: 1
- Contracts expiring this season: 5
```

If positional taxonomy differs by game design, use database-driven role groups.

### 23.1 Squad concerns

Examples:

- Insufficient goalkeeper depth.
- Aging central defense.
- Several expiring contracts.
- Wage budget nearly committed.
- Strong youth prospects.

Concerns should be explainable and should not expose hidden exact attributes beyond the manager's permitted knowledge.

---

## 24. Staff summary

May show:

- Current staff count.
- Vacant roles.
- Coaching coverage.
- Scouting coverage.
- Medical coverage.
- Existing assistant manager.

Staff contracts are not mutated until the appointment is confirmed.

---

## 25. Recent performance

Possible values:

- Previous season finish.
- Current position for midseason starts.
- Recent form summary.
- Promotion or relegation history.
- Current competition stage.

Historical information must be accurate to the generated world state.

---

## 26. Full Club Profile

`View Full Club Profile` opens a read-only pre-appointment club browser.

The user may inspect:

- Squad.
- Staff.
- Fixtures.
- Finances, subject to preview visibility.
- Facilities.
- History.
- Records.

The back action returns to Club Selection with search, filters, scroll, and provisional selection preserved.

---

## 27. Club selection behavior

Selecting an eligible club must:

1. Validate the current row identity.
2. Query authoritative availability.
3. Display replacement consequences if an AI incumbent exists.
4. Create or update a provisional selection in the draft.
5. Optionally acquire a short-lived reservation according to policy.
6. Recalculate warnings.
7. Mark the draft dirty.
8. Preserve search and filter state.

The UI must not create the final employment relationship.

---

## 28. Replacement of an AI incumbent

If allowed:

```text
North United currently has an AI-controlled manager.

Selecting this club will replace that manager when your manager profile is
confirmed. The outgoing manager's career history will be preserved.

[Cancel] [Select North United]
```

Do not remove the AI manager during provisional selection.

---

## 29. Reservation behavior

```typescript
interface AppointmentReservation {
  readonly reservationId: string;
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly roleId: string;
  readonly ownerContextId: string;
  readonly expiresAt: string;
  readonly revision: number;
}
```

Reservation policies may be:

- No reservation until confirmation.
- Short reservation after selection.
- Reservation only in multiplayer.
- Reservation while Confirmation is open.

Reservations must be:

- Exclusive for exclusive roles.
- Expiring.
- Renewable under policy.
- Released when the choice changes.
- Released when the draft is removed.
- Revalidated before final activation.

---

## 30. Reservation expiration

If a reservation expires:

```text
The reservation for North United expired.

The club remains selected in your draft, but availability must be checked
again before continuing.

[Check Availability]
```

Do not silently switch the manager to unemployed or another club.

---

## 31. Clear Selection

`Clear Selection` removes the provisional club or national-team choice and releases its reservation.

It does not automatically select unemployed mode.

If unemployed mode is a distinct choice, the state after clearing is `no selection`.

---

## 32. National-team selection

If supported, National Teams mode displays eligible national-team roles.

The row and overview may include:

- Nation.
- Team level.
- Current manager or vacancy.
- Competition commitments.
- Qualification campaign status.
- Association expectations.
- Relevant eligibility rules.

```typescript
type NationalTeamLevel =
  "senior" | "under_23" | "under_21" | "under_20" | "under_19" | "other_youth";
```

The game must not assume nationality automatically grants appointment eligibility unless the active rules say so.

---

## 33. Dual-role policy

Some simulations may allow a manager to hold club and national-team jobs simultaneously later in the career.

Initial manager creation should define clearly whether the user may:

- Select one club role only.
- Select one national-team role only.
- Select one of either.
- Select both through a dedicated dual-role workflow.

```typescript
interface InitialRoleCombinationPolicy {
  readonly mode: "one_role_only" | "club_only" | "national_team_only" | "club_and_national_team";
}
```

Do not infer dual-role permission from the runtime employment engine.

---

## 34. Start Unemployed behavior

Selecting unemployed start must:

1. Verify the career permits it.
2. Clear any provisional role selection.
3. Release any appointment reservation.
4. Store an explicit unemployed selection.
5. Show opportunity and gameplay implications.
6. Mark the draft dirty.

```typescript
type ManagerInitialRoleSelection =
  | {
      readonly type: "organization_role";
      readonly roleId: string;
      readonly organizationId: string;
      readonly organizationType: "club" | "national_association";
      readonly reservationId?: string;
    }
  | {
      readonly type: "unemployed";
    }
  | {
      readonly type: "none";
    };
```

### 34.1 Unemployed disclosure

Explain:

- No club or national team will be controlled initially.
- The manager can apply for vacancies.
- Offers depend on reputation and career state.
- Simulation time can advance after activation.
- There is no guarantee of an immediate suitable vacancy.

---

## 35. Multiplayer conflict handling

Potential conflicts:

- Two drafts select the same vacant club.
- One user confirms while another is viewing the club.
- A host changes role policy.
- A human manager joins the target club through another workflow.
- A reservation expires during confirmation.

The authoritative service must resolve conflicts transactionally.

Conflict message:

```text
North United is no longer available because another human manager has claimed
the role.

Your manager details are preserved. Select another role or start unemployed.

[Show Available Clubs]
```

---

## 36. Save Draft behavior

Selecting `Save Draft` must:

1. Commit the current mode and provisional selection.
2. Validate stable role and organization IDs.
3. Validate reservation ownership if present.
4. Preserve no stale availability claim as authoritative.
5. Save with the expected manager-draft revision.
6. Return the new revision.
7. Update save status.

```typescript
interface SaveManagerClubSelectionCommand {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly expectedDraftRevision: number;
  readonly requestId: string;
  readonly selection: ManagerInitialRoleSelection;
}
```

Saving a provisional selection does not guarantee final availability.

---

## 37. Continue behavior

Selecting `Continue` must:

1. Commit active controls.
2. Verify draft ownership.
3. Verify previous-stage revision.
4. Require a club, national-team role, or explicit unemployed selection.
5. Revalidate organization and role IDs.
6. Recalculate current eligibility.
7. Recheck role availability.
8. Acquire or renew a confirmation reservation when required.
9. Recalculate board, incumbent, eligibility, and suitability warnings.
10. Require acknowledgment of current nonblocking warnings.
11. Save the completed Club Selection stage atomically.
12. Advance the draft stage.
13. Navigate to Manager Confirmation.

```typescript
interface ManagerClubSelectionSnapshot {
  readonly managerDraftId: string;
  readonly draftRevision: number;
  readonly selection: ManagerInitialRoleSelection;
  readonly eligibilityFingerprint?: string;
  readonly roleStateRevision?: number;
  readonly reservationId?: string;
  readonly acknowledgedWarningCodes: readonly string[];
  readonly completedAt: string;
}
```

Disable Continue immediately after activation and prevent duplicate stage completion.

---

## 38. Back behavior

Back returns to Manager Background.

Rules:

- Preserve the saved provisional selection.
- Prompt about unsaved changes.
- Keep or release the reservation according to explicit reservation policy.
- Do not activate employment.
- Keep search and filter state for the setup session when feasible.

Unsaved-change dialog:

```text
Save starting-role changes?

[Discard Unsaved Changes] [Keep Editing] [Save and Go Back]
```

The safe default is `Keep Editing`.

---

## 39. State model

```typescript
interface ClubSelectionScreenState {
  readonly careerId: string;
  readonly careerCheckpointId: string;
  readonly managerDraftId: string;
  readonly draftRevision: number;
  readonly managerBackgroundStageRevision: number;
  readonly mode: "clubs" | "national_teams" | "unemployed";
  readonly filters: ClubSelectionFilters;
  readonly sort: ClubSelectionSort;
  readonly query: string;
  readonly queryRevision: number;
  readonly rows: readonly ClubSelectionRowModel[];
  readonly selectedOrganizationOverview?: OrganizationSelectionOverview;
  readonly selection: ManagerInitialRoleSelection;
  readonly reservation?: AppointmentReservation;
  readonly validationIssues: readonly ClubSelectionIssue[];
  readonly searchState: "idle" | "searching" | "ready" | "failed";
  readonly saveState: "unchanged" | "unsaved" | "saving" | "saved" | "save_failed" | "conflicted";
  readonly submitting: boolean;
}
```

Renderer-facing state must be serializable and schema-validated.

---

## 40. State transitions

```text
LOADING_ROLE_POLICY
  |
  v
LOADING_INITIAL_RESULTS
  |
  v
READY
  |
  +-- search or filter ----> SEARCHING -> READY
  |
  +-- select organization -> CHECKING_AVAILABILITY
  |                              |
  |                              +-- unavailable -> READY_WITH_NOTICE
  |                              +-- warning -> AWAITING_SELECTION_ACKNOWLEDGMENT
  |                              +-- valid -> RESERVING_IF_REQUIRED -> DIRTY
  |
  +-- choose unemployed --> RELEASING_RESERVATION -> DIRTY
  |
  +-- Save Draft --------> VALIDATING_PARTIAL -> SAVING -> READY
  |
  +-- Continue ----------> VALIDATING_COMPLETE
                                 |
                                 +-- errors -> READY_WITH_ERRORS
                                 +-- conflict -> READY_WITH_CONFLICT
                                 +-- warnings -> AWAITING_CONTINUE_ACKNOWLEDGMENT
                                 +-- valid -> SAVING_STAGE
                                               |
                                               v
                                      MANAGER_CONFIRMATION
```

A stale draft revision moves the screen to `CONFLICTED` until refreshed.

---

## 41. Commands and events

### 41.1 Commands

```text
LOAD_CLUB_SELECTION
SET_SELECTION_MODE
SEARCH_MANAGEABLE_ORGANIZATIONS
SET_CLUB_SELECTION_FILTERS
SET_CLUB_SELECTION_SORT
OPEN_ORGANIZATION_OVERVIEW
OPEN_FULL_CLUB_PROFILE
OPEN_SQUAD_SUMMARY
SELECT_ORGANIZATION_ROLE
SELECT_UNEMPLOYED_START
CLEAR_INITIAL_ROLE_SELECTION
CHECK_ROLE_AVAILABILITY
ACQUIRE_APPOINTMENT_RESERVATION
RENEW_APPOINTMENT_RESERVATION
RELEASE_APPOINTMENT_RESERVATION
SAVE_MANAGER_CLUB_SELECTION_DRAFT
ACKNOWLEDGE_CLUB_SELECTION_WARNING
REQUEST_BACK
REQUEST_CONTINUE
```

### 41.2 Events

```text
MANAGEABLE_ORGANIZATIONS_LOADED
ORGANIZATION_OVERVIEW_LOADED
INITIAL_ROLE_SELECTED
INITIAL_ROLE_CLEARED
UNEMPLOYED_START_SELECTED
ROLE_ELIGIBILITY_CHANGED
ROLE_AVAILABILITY_CHANGED
APPOINTMENT_RESERVED
APPOINTMENT_RESERVATION_RENEWED
APPOINTMENT_RESERVATION_EXPIRED
APPOINTMENT_RESERVATION_RELEASED
CLUB_SELECTION_SAVED
CLUB_SELECTION_CONFLICT_DETECTED
CLUB_SELECTION_COMPLETED
```

Mutating commands require the manager draft ID, current revision where appropriate, and an idempotency request ID.

---

## 42. Asynchronous query behavior

Search, filters, organization overview, suitability, and availability may update asynchronously.

Requirements:

- Use query revisions.
- Cancel obsolete requests.
- Discard stale results.
- Keep the last valid overview while a refresh is visibly pending.
- Do not enable Continue from stale eligibility data.
- Perform authoritative revalidation on Continue.

```typescript
interface OrganizationOverviewRequest {
  readonly careerId: string;
  readonly managerDraftId: string;
  readonly organizationId: string;
  readonly roleId: string;
  readonly requestRevision: number;
  readonly signal: AbortSignal;
}
```

---

## 43. Validation issue model

```typescript
interface ClubSelectionIssue {
  readonly code: string;
  readonly severity: "information" | "warning" | "blocking_error";
  readonly organizationId?: string;
  readonly roleId?: string;
  readonly fieldId?: string;
  readonly messageKey: string;
  readonly parameters?: Readonly<Record<string, string | number>>;
}
```

Blocking issues:

- No explicit selection.
- Unknown organization or role ID.
- Competition not manageable.
- Role occupied by another human manager.
- Role reservation owned by another draft.
- Manager does not meet required qualification.
- Manager is outside an enforced reputation range.
- Scenario restriction.
- National-team role unavailable.
- Unemployed start forbidden.
- Stale upstream manager stage.
- Unauthorized draft access.

Warnings:

- Language mismatch.
- Very high board expectations.
- Financial distress.
- AI incumbent replacement.
- Weak suitability.
- Limited squad depth.
- Few suitable vacancies if starting unemployed.

---

## 44. Error states

### No manageable clubs

```text
No clubs are currently manageable with this career configuration.

Return to career setup to select a playable competition, or start unemployed
if the career policy allows it.

[Return to Career Setup] [Start Unemployed]
```

### Search failure

```text
Clubs could not be loaded.

Your current selection is preserved.

[Retry Search]
```

### Overview failure

```text
Club details could not be loaded.

[Retry Details]
```

### Eligibility service unavailable

```text
Appointment eligibility could not be verified.

Continue is unavailable until verification succeeds.

[Retry]
```

### Reservation failure

```text
The role could not be reserved because its status changed.

[Refresh Club Status]
```

### Draft save failure

```text
The starting-role selection could not be saved.

Your current selection remains on this screen.

[Retry Save] [Keep Editing]
```

### Upstream stage changed

```text
Manager Background changed in another session.

Reload the draft before selecting a starting role.

[Reload Draft]
```

---

## 45. Accessibility requirements

### 45.1 Organization list

Expose the browser as an accessible list or grid.

Each row announces:

- Club or national-team name.
- Competition.
- Nation.
- Availability.
- Eligibility.
- Suitability when present.
- Selected state.

Example:

```text
North United, Exampleland First Division, eligible, manager vacancy,
moderate suitability, selected.
```

### 45.2 Filters

Every filter needs a persistent label and current-value announcement.

### 45.3 Overview

Use headings for club overview sections so assistive-technology users can navigate quickly.

### 45.4 Live updates

Announce meaningful changes:

```text
North United selected.
Appointment reservation acquired.
The selected club is no longer available.
Unemployed start selected.
```

Do not announce every row while search results stream.

### 45.5 Focus management

- Selecting a row does not move focus unexpectedly.
- Opening Full Club Profile moves focus to its heading.
- Returning restores focus to the invoking club row.
- Conflict messages focus the relevant summary.
- If the selected row disappears, focus moves to the nearest logical row.
- Continue errors focus a linked error summary.

### 45.6 Non-color indicators

Eligibility, vacancy, financial condition, suitability, selection, and warning state require text or icon-plus-text.

---

## 46. Keyboard interaction

- `Tab` and `Shift+Tab`: move between controls.
- `Up Arrow` and `Down Arrow`: move through visible organizations.
- `Home` and `End`: move to the first or last visible row.
- `Page Up` and `Page Down`: move by viewport or query page.
- `Enter`: select the focused eligible organization or open its primary action.
- `Space`: select a focused row where radio-selection semantics are used.
- `Ctrl+F`: focus club search.
- `Ctrl+S`: save the draft.
- `Ctrl+Enter`: continue when valid, if supported.
- `Escape`: close a panel or dialog, then request Back.
- `F5`: refresh availability without clearing filters.

Keyboard activation must use authoritative validation, not stale row state.

---

## 47. Localization requirements

- Localize club, competition, nation, facility, objective, role, and status labels.
- Preserve stable organization and role IDs.
- Apply locale-aware search and sorting.
- Support native scripts and diacritics.
- Support right-to-left layout.
- Localize money, dates, counts, capacities, and percentages.
- Use complete message templates.
- Allow long club and competition names to wrap.
- Do not form eligibility explanations from concatenated fragments.

---

## 48. Responsive behavior

### Wide desktop

Use a two-column layout with the organization browser on the left and a sticky overview on the right.

### Standard desktop

Reduce overview width before shrinking organization names.

### Narrow desktop

Stack:

```text
Mode selector
Search and filters
Organization list
Selected organization overview
Selection summary
Actions
```

### High text scaling

- Let toolbar controls wrap.
- Render organization rows on multiple lines.
- Put status labels beneath names where needed.
- Keep row actions associated with the correct organization.
- Avoid overlap with footer actions.

### Ultrawide display

Use bounded content widths and avoid excessively long overview lines.

---

## 49. Security and integrity requirements

Treat club names, competition names, badges, search text, identifiers, overview data, and network availability events as untrusted.

Protect against:

- Script and markup injection.
- Unknown club or role IDs.
- Forged eligibility data.
- Forged suitability data.
- Reservation replay.
- Reservation theft.
- Double appointment.
- Stale revision overwrite.
- Oversized search input.
- Invalid Unicode and bidirectional-control abuse.
- Unauthorized hidden-club data access.
- Money-unit confusion.
- Renderer command tampering.

Rules:

1. Render all names and descriptions as text.
2. Validate every ID in a trusted process or server.
3. Calculate eligibility outside the renderer.
4. Treat suitability as advisory and recalculate authoritatively.
5. Scope reservations to career, role, draft, and owner.
6. Use expiring reservation tokens.
7. Never trust renderer-supplied reservation status.
8. Use expected revisions and idempotency keys.
9. Enforce preview visibility rules for finances and squads.
10. Revalidate role state during final confirmation.
11. Store money with explicit currency and minor units.
12. Reject events for inactive career or draft IDs.

---

## 50. Persistence rules

Persist in the manager draft:

- Explicit initial-role selection.
- Organization and role stable IDs.
- Unemployed selection when chosen.
- Reservation reference when policy requires it.
- Draft revision.
- Completed stage state.
- Warning acknowledgments tied to role-state and selection fingerprints.

Persist separately as transactional career state:

- Active appointment reservation.
- Reservation expiry.
- Reservation owner.
- Role-state revision.

Do not persist as confirmed employment:

- A provisional club selection.
- An expired reservation.
- An unverified eligibility preview.
- A stale incumbent state.
- Partial appointment transactions.

---

## 51. Observability

Useful operational events:

- Screen opened.
- Search and overview failure categories.
- Eligibility-check outcome categories.
- Role selected.
- Unemployed start selected.
- Reservation acquired, renewed, expired, released, or conflicted.
- Draft save success or failure.
- Stage completion.

Avoid recording in general telemetry:

- Manager identity.
- Exact organization choice.
- Participant identity.
- Private financial details.
- Reservation tokens.
- Authentication data.

---

## 52. Edge cases

### Club changes division after an early career-start event

Use current authoritative role and competition state. Do not rely on stale setup metadata.

### Club disappears through a database change

Invalidate the selection. Do not substitute by a similar name.

### Competition is playable but the club is temporarily inactive

Show its specific unavailability reason.

### AI incumbent changes while the screen is open

Refresh role-state revision and revalidate before reservation or Continue.

### Another human manager confirms the target role

Invalidate the provisional selection and preserve all other draft stages.

### Reservation expires while Full Club Profile is open

Show the expired state on return and require recheck.

### Selected club is hidden by filters

Preserve it and provide `Show Selected Club`.

### Search result arrives after mode changes

Discard it using query revision and mode fingerprint.

### User chooses unemployed while a reservation release fails

Do not commit the unemployed selection until release succeeds or the server confirms the expired reservation is no longer exclusive.

### No suitable roles exist

Allow browsing eligible weak-fit roles or unemployed start according to policy. Suitability must not become a hidden blocker.

### Manager has insufficient qualification for every club

Offer Back to Manager Background and unemployed start when permitted.

### Same club name appears in multiple nations

Show nation and competition context in every search result.

### Currency conversion changes

Display club-native currency or a chosen display currency with explicit conversion context. Preserve canonical native values.

### Save and reservation operations race

Use a transaction or compensating release so a saved draft does not reference an unrelated reservation.

---

## 53. Acceptance criteria

The screen is complete when:

1. It opens only for an authorized incomplete manager draft with prior stages complete.
2. It lists manageable organizations from the authoritative career world.
3. Playability, eligibility, availability, and suitability are distinct concepts.
4. Club rows show nation, competition, role status, and eligibility clearly.
5. Search and filtering never clear a hidden provisional selection.
6. Large club lists use pagination or virtualization.
7. Organization overviews load separately from list rows.
8. Club financial data uses explicit money units and visibility rules.
9. Squad summaries do not reveal unauthorized hidden attributes.
10. Eligibility is calculated in a trusted career service.
11. Suitability is advisory and never a hidden eligibility blocker.
12. AI incumbent replacement follows explicit policy and is disclosed.
13. Human incumbent replacement is prohibited unless an explicit administrative workflow permits it.
14. Provisional selection does not create employment or remove an incumbent.
15. Appointment reservations are scoped, exclusive, expiring, and revalidated.
16. Multiplayer conflicts cannot assign one exclusive role to two human managers.
17. Unemployed start is explicit and releases any prior reservation.
18. National-team and dual-role choices follow named policies.
19. Save Draft is atomic, revision-checked, and idempotent.
20. Continue requires an organization role or explicit unemployed selection.
21. Continue revalidates ownership, upstream revision, eligibility, availability, and reservation state.
22. Continue creates exactly one completed ManagerClubSelectionSnapshot.
23. Duplicate Continue activation is prevented.
24. Back preserves saved values and handles unsaved edits explicitly.
25. Keyboard users can search, filter, inspect, and select a role.
26. Screen-reader users receive organization, competition, eligibility, availability, suitability, and reservation information.
27. High text scaling and right-to-left layouts remain usable.
28. Successful completion navigates to Manager Confirmation.
29. No proprietary artwork, exact wording, source code, logos, or original database content is required.

---

## 54. Recommended tests

### Unit tests

- Availability-state derivation.
- Eligibility reason mapping.
- Suitability-band derivation.
- Filter serialization.
- Stable sort order.
- Hidden-selection notice.
- Incumbent replacement policy.
- National-team policy.
- Dual-role policy.
- Unemployed selection state.
- Reservation expiry.
- Reservation ownership validation.
- Warning-acknowledgment invalidation.
- Draft dirty-state derivation.

### Integration tests

- Load eligible clubs from playable competitions.
- Search by club, city, nation, and competition.
- Filter by eligibility and vacancy.
- Select a vacant club.
- Select a club with an AI incumbent when permitted.
- Reject a role with a human incumbent.
- Reject an ineligible qualification.
- View club and squad summaries.
- Open and return from Full Club Profile.
- Select a national team when supported.
- Select unemployed start.
- Save and resume the provisional selection.
- Continue to Manager Confirmation.
- Return from Confirmation and restore selection.
- Navigate Back with unsaved changes.

### Concurrency tests

- Two manager drafts select the same role.
- Two confirmation flows attempt the same role.
- Reservation expires during selection.
- Reservation expires in Full Club Profile.
- AI incumbent changes during overview display.
- Save overlaps reservation renewal.
- Search results arrive after filters change.
- Continue is activated twice rapidly.
- Draft ownership changes during Save.

### Security tests

- Unknown club ID.
- Unknown role ID.
- Forged competition playability.
- Forged eligibility result.
- Forged suitability result.
- Stolen reservation token.
- Replayed reservation token.
- Cross-career reservation use.
- Oversized search query.
- Markup-like club and competition names.
- Invalid Unicode and bidirectional controls.
- Unauthorized financial preview access.
- Money currency mismatch.
- Stale draft revision.
- Reused idempotency request.

### Accessibility tests

- Keyboard-only club selection.
- Search and filter navigation.
- Organization-list announcement.
- Eligibility-reason navigation.
- Overview heading navigation.
- Selection and reservation announcements.
- Conflict focus management.
- Full Club Profile focus restoration.
- Error-summary links.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long club, nation, and competition names.

### Visual regression tests

Capture at least:

- Default eligible-club list.
- Club selected.
- AI incumbent warning.
- Human incumbent unavailable.
- Ineligible qualification.
- Selected club hidden by filters.
- Club overview.
- Squad summary.
- Financial distress warning.
- National-team mode.
- Unemployed mode.
- Reservation acquired.
- Reservation expired.
- Multiplayer conflict.
- Search failure.
- Draft save failure.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 55. Condensed LLM implementation brief

```text
Implement a desktop Club Selection screen for an original football-management
simulation. It edits an authorized incomplete ManagerDraft after Manager
Background and before Manager Confirmation.

Display clubs from authoritative playable-career queries, with optional
National Teams and Start Unemployed modes. Keep competition playability,
manager eligibility, current role availability, and advisory suitability as
separate concepts. The renderer must not derive any of them from labels or
preview values.

Provide searchable, filterable, sortable, paginated or virtualized organization
results. Each row shows organization, nation, competition, professional status,
availability, eligibility, and suitability. Filters never clear a hidden
provisional selection. Load the selected organization overview separately and
show board expectations, finances, budgets, facilities, stadium, squad summary,
staffing, recent performance, appointment requirements, and suitability reasons
according to career-visibility rules.

Use explicit InitialAppointmentPolicy, ManagerBackground constraints, and role
state from a trusted career service. AI-incumbent replacement may be allowed by
policy and must be disclosed. Human-incumbent replacement should normally be
forbidden. A provisional choice must not remove an incumbent, create a contract,
or grant control.

Support scoped, expiring, exclusive appointment reservations where required,
especially in multiplayer. Reservations belong to one career, role, manager
draft, owner context, and revision. Release them when the choice changes or the
draft is removed. Revalidate on Continue and again during Manager Confirmation.
Handle simultaneous claims transactionally.

Starting unemployed is an explicit selection, not an empty club value. It clears
and releases previous role reservations and explains that job offers are not
guaranteed. National-team and dual-role selection must follow named policies.

Use optimistic manager-draft revisions, authoritative role-state revisions, and
idempotency request IDs. Search, overview, eligibility, suitability, and
availability requests must be cancellable and revision-aware. Discard stale
responses.

On Continue, require a valid role or explicit unemployed selection, revalidate
draft ownership and upstream stages, recalculate eligibility and availability,
acquire or renew any required reservation, acknowledge current warnings, save
one immutable ManagerClubSelectionSnapshot, advance the draft, and navigate to
Manager Confirmation. Prevent duplicate submission.

Support full keyboard navigation, accessible organization-list semantics,
visible focus, linked eligibility explanations, reservation announcements,
high text scaling, localization, explicit money currencies, and right-to-left
layouts. Treat names, badges, identifiers, search input, overview data, money,
network events, and renderer commands as untrusted. Do not copy proprietary
artwork, exact wording, source code, logos, or databases.
```

---

## 56. Next planned item

**Screen 12: Manager Confirmation** should define a complete profile review, personal details, nationality and languages, background allocation, initial employer or unemployed state, appointment consequences, manager activation transaction, incumbent replacement, contract creation, ownership binding, inbox initialization, rollback behavior, and transition into the career.

---

## Suggested Git commit

```text
feat(docs): specify club selection screen
```
