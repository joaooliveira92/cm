# Screen 7: Add Manager

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, source code, databases, logos, exact interface wording, or other protected assets. Use an original visual system and fictional or properly licensed football data.

---

## 1. Purpose

The **Add Manager** screen is the entry point for attaching one or more human-controlled manager profiles to a generated career world.

It appears after the world has been generated and its initial checkpoint has been validated. It may also be opened later from an existing career when the game supports adding another local or network manager.

The screen must allow the user to:

- Review managers already attached to the career.
- Add a local human-controlled manager.
- Add or invite a network-controlled manager when multiplayer is enabled.
- Understand the maximum number of supported human managers.
- Distinguish active, incomplete, retired, disconnected, and pending manager records.
- Resume an interrupted manager-creation draft.
- Remove an incomplete manager draft safely.
- Continue into Manager Personal Details.
- Return to a safe prior destination without corrupting the generated world.
- Start an unemployed career if that path is supported.
- Prevent duplicate ownership, duplicate submissions, and invalid manager slots.

This screen manages **human manager slots and ownership**. It does not collect the complete personal profile and does not select a club.

---

## 2. Position in the career flow

### New career

```text
World Generation
    |
    | Initial checkpoint is durable
    v
Add Manager
    |
    v
Manager Personal Details
    |
    v
Manager Nationality and Languages
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

### Existing career

```text
Career Menu
    |
    v
Manager Status
    |
    v
Add Manager
    |
    v
Manager Personal Details
```

The same Add Manager workflow may be reused in single-player, hot-seat multiplayer, and network multiplayer, but available actions depend on the career mode and caller permissions.

---

## 3. Core concepts

### 3.1 Career manager

A career manager is a human-controlled managerial identity attached to one career world.

The manager has a career-local stable identifier and eventually contains:

- Personal identity.
- Nationality and language data.
- Playing or coaching background.
- User-control ownership.
- Current employment status.
- Club or national-team role.
- Preferences and subscriptions.
- Manager history.

### 3.2 Manager slot

A manager slot is a reserved place for one human-controlled manager.

A slot may be:

```typescript
type ManagerSlotState =
  "empty" | "draft" | "pending_network_claim" | "active" | "disconnected" | "retired" | "invalid";
```

### 3.3 Local manager

A local manager is controlled from the current application installation or local gameplay session.

Multiple local managers may participate in a hot-seat career if supported.

### 3.4 Network manager

A network manager is owned by an authenticated multiplayer participant.

The manager record and participant account are related but not identical. A participant may reconnect from another device without changing the manager's career identity.

### 3.5 Manager draft

A manager draft is an incomplete manager-creation transaction.

It may contain partial values from later screens, but it must not become an active career manager until final confirmation succeeds.

### 3.6 Ownership

Ownership identifies which local profile or authenticated participant can submit commands for a manager.

Ownership must be enforced by the trusted application or server layer, not by hidden renderer controls.

### 3.7 Unemployed manager

An unemployed manager is active in the career without controlling a club or national team.

The manager may apply for vacancies or receive offers after the career begins.

---

## 4. Entry conditions

The Add Manager screen may open only when:

- A valid career world exists.
- The career checkpoint is readable.
- World validation succeeded.
- The current user has permission to add a manager.
- The career is not locked by an incompatible operation.
- The maximum manager limit has not been exceeded, unless the screen is opened only to inspect existing slots.

For a new career, the initial world must remain recoverable even though it has no active human manager yet.

---

## 5. Conceptual desktop layout

```text
+--------------------------------------------------------------------------------+
| ADD MANAGER                                              Career: CW-7K4M-2P9Q  |
|--------------------------------------------------------------------------------|
| Human managers in this career                                             0/4. |
|                                                                                |
| +----------------------------------------------------------------------------+ |
| | No manager has been added yet.                                             | |
| |                                                                            | |
| | Create a manager to begin controlling a club, national team, or to start   | |
| | the career unemployed.                                                     | |
| |                                                                            | |
| | [Add Local Manager]              [Invite Network Manager]                  | |
| +----------------------------------------------------------------------------+ |
|                                                                                |
| Manager slots                                                                  |
| +----------------------------------------------------------------------------+ |
| | Slot 1     Empty                                      [Create Manager]     | |
| | Slot 2     Empty                                      [Create Manager]     | |
| | Slot 3     Empty                                      [Create Manager]     | |
| | Slot 4     Empty                                      [Create Manager]     | |
| +----------------------------------------------------------------------------+ |
|                                                                                |
| [Career Setup Summary] [Multiplayer Settings]                           [Back] |
+--------------------------------------------------------------------------------+
```

Existing-career example:

```text
+--------------------------------------------------------------------------------+
| HUMAN MANAGERS                                                       2/4       |
|--------------------------------------------------------------------------------|
| Alex Morgan     Local       Example City FC       Active        [Open]         |
| Jamie Silva     Network     Unemployed            Disconnected  [Manage]       |
| Slot 3          Draft       Personal details      Incomplete    [Resume]       |
| Slot 4          Empty                                           [Create]       |
|--------------------------------------------------------------------------------|
| [Add Local Manager] [Invite Network Manager]                             [Back]|
+--------------------------------------------------------------------------------+
```

These diagrams define information hierarchy, not a pixel-perfect reconstruction.

---

## 6. Screen regions

### 6.1 Header

Display:

- `Add Manager` or `Human Managers`.
- Career name or safe career identifier.
- Current human-manager count and limit.
- Career mode, when useful.
- Back navigation.

### 6.2 Introductory empty state

When no active manager exists, explain that a human manager must be created to enter ordinary career play.

The empty state should provide a direct primary action rather than showing only an empty list.

### 6.3 Manager-slot list

The list displays all active, draft, pending, disconnected, retired, and empty manager slots that the current participant is permitted to see.

### 6.4 Primary actions

Possible actions:

- `Add Local Manager`
- `Invite Network Manager`
- `Resume Draft`
- `Open Manager`
- `Manage Ownership`
- `Remove Draft`
- `Career Setup Summary`
- `Multiplayer Settings`
- `Back`

### 6.5 Contextual help

Optional help explains:

- Local versus network control.
- Hot-seat play.
- Maximum manager count.
- Starting unemployed.
- Ownership and reconnection.

---

## 7. Manager-slot row specification

Each row should present only information appropriate to its state.

```typescript
interface ManagerSlotRowModel {
  readonly slotId: string;
  readonly ordinal: number;
  readonly state: ManagerSlotState;
  readonly managerId?: string;
  readonly displayName?: string;
  readonly ownershipType?: "local" | "network";
  readonly ownerDisplayName?: string;
  readonly employmentSummary?: string;
  readonly draftStage?: ManagerDraftStage;
  readonly connectionState?: "connected" | "disconnected" | "unknown";
  readonly permittedActions: readonly ManagerSlotAction[];
  readonly statusMessageKey?: string;
}
```

### 7.1 Empty slot

```text
Slot 3     Empty                                      [Create Manager]
```

### 7.2 Draft slot

```text
Slot 3     Manager draft     Club selection incomplete     [Resume] [Remove]
```

### 7.3 Active local manager

```text
Alex Morgan     Local     Example City FC     Active     [Open]
```

### 7.4 Active network manager

```text
Jamie Silva     Network: Participant 2     North United     Connected
```

### 7.5 Disconnected network manager

```text
Jamie Silva     Network: Participant 2     North United     Disconnected
```

A disconnected manager remains an active identity unless an authorized host changes ownership or retirement state.

### 7.6 Pending network claim

```text
Slot 4     Invitation pending     Code expires in 18 minutes     [Revoke]
```

### 7.7 Retired manager

A retired manager is normally shown in manager history rather than occupying an available active slot. If displayed here, clearly mark it read-only.

---

## 8. Add Local Manager behavior

Selecting `Add Local Manager` must:

1. Verify that a slot remains available.
2. Verify current participant permission.
3. Acquire a short-lived slot reservation.
4. Create an empty manager draft transaction.
5. Associate it with the local controller profile or session.
6. Persist the draft safely.
7. Navigate to Manager Personal Details.

```typescript
interface CreateLocalManagerDraftCommand {
  readonly careerId: string;
  readonly requestedSlotId?: string;
  readonly localControllerId: string;
  readonly requestId: string;
}
```

The request must be idempotent. Repeating it with the same request ID must not create multiple drafts.

---

## 9. Hot-seat local multiplayer

If multiple local human managers are supported:

- Each manager has a distinct career identity.
- Local controller ownership may be shared by the same application profile or separated into local profiles.
- Turn transitions must not expose private manager information accidentally.
- Password or access-code protection may be supported per manager.
- Private inbox and scouting data should be hidden before control passes to the next person.
- The manager switch workflow should obscure the prior manager's confidential screen state.

The Add Manager screen should indicate:

```text
Local hot-seat managers share this device and take turns controlling their
own manager identities.
```

---

## 10. Invite Network Manager behavior

The network invitation action is available only when:

- Multiplayer is enabled.
- The current participant has host or delegated permission.
- A manager slot remains available.
- The network service is available.
- The career is not in a state that forbids ownership changes.

The invitation workflow may support:

- Direct account invitation.
- One-time invitation code.
- Approved lobby participant.
- Local-network discovery.

```typescript
interface CreateManagerInvitationCommand {
  readonly careerId: string;
  readonly requestedSlotId?: string;
  readonly invitationMethod: "account" | "one_time_code" | "lobby_participant";
  readonly targetParticipantId?: string;
  readonly expiresAtPolicyId: string;
  readonly requestId: string;
}
```

Do not display reusable authentication secrets. Invitation codes must be short-lived, scoped to the career and slot, revocable, and rate-limited.

---

## 11. Network claim flow

A network participant claiming a slot must pass:

- Authentication.
- Invitation validation.
- Career compatibility checks.
- Slot availability check.
- Ownership conflict check.
- Version compatibility check.
- Host policy validation.

The claim transaction must atomically:

1. Mark the invitation claimed.
2. Associate the participant with the reserved slot.
3. Create or transfer the manager draft.
4. Prevent reuse of the invitation.
5. Broadcast the updated manager-slot state.

If two participants claim simultaneously, only one transaction may succeed.

---

## 12. Manager draft lifecycle

```typescript
type ManagerDraftStage =
  | "created"
  | "personal_details"
  | "nationality_and_languages"
  | "background"
  | "club_selection"
  | "confirmation";
```

```typescript
interface ManagerDraft {
  readonly id: string;
  readonly careerId: string;
  readonly slotId: string;
  readonly owner: ManagerOwnership;
  readonly stage: ManagerDraftStage;
  readonly revision: number;
  readonly personalDetails?: ManagerPersonalDetailsDraft;
  readonly nationalityDetails?: ManagerNationalityDraft;
  readonly backgroundDetails?: ManagerBackgroundDraft;
  readonly clubSelection?: ManagerClubSelectionDraft;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt?: string;
}
```

A draft must not:

- Appear in active manager standings.
- Receive an inbox.
- Control a team.
- Affect AI vacancies permanently.
- Participate in simulation decisions.

---

## 13. Resume Draft

Selecting `Resume` must:

1. Verify draft ownership.
2. Verify career and draft compatibility.
3. Verify the slot reservation.
4. Load the latest draft revision.
5. Navigate to the first incomplete or explicitly saved stage.

If the draft is stale after world or policy changes:

```text
This manager draft needs to be reviewed because the career configuration
changed.

Valid details were preserved. Club selection must be completed again.

[Review Draft] [Remove Draft]
```

---

## 14. Remove Draft

Draft removal is destructive but does not affect the world or active managers.

```text
Remove this manager draft?

Saved personal details for this incomplete manager will be deleted and the
slot will become available.

[Keep Draft] [Remove Draft]
```

The default focus is `Keep Draft`.

Removal must:

- Verify ownership or host permission.
- Delete the draft transactionally.
- Release the slot reservation.
- Revoke related unclaimed invitations.
- Preserve audit information without retaining unnecessary personal data.

---

## 15. Maximum manager count

The maximum manager count should come from a named policy.

```typescript
interface ManagerCapacityPolicy {
  readonly maximumActiveManagers: number;
  readonly maximumDraftManagers: number;
  readonly maximumPendingInvitations: number;
  readonly maximumManagersPerParticipant: number;
  readonly retiredManagersOccupyCapacity: boolean;
}
```

Do not hardcode the capacity in interface behavior.

When full:

```text
This career already has the maximum number of active human managers.

[View Managers] [Back]
```

The Add actions are unavailable, but existing rows remain inspectable.

---

## 16. Ownership model

```typescript
type ManagerOwnership =
  | {
      readonly type: "local";
      readonly localControllerId: string;
    }
  | {
      readonly type: "network";
      readonly participantId: string;
      readonly authorityServerId: string;
    };
```

Ownership rules:

- One slot has at most one current owner.
- One manager has exactly one effective controller at a given time.
- Ownership changes require explicit authorization.
- Renderer state does not determine authority.
- Disconnection does not remove ownership.
- Host privileges do not automatically reveal private manager data.

---

## 17. Permission model

Possible permissions:

```typescript
type ManagerAdministrationPermission =
  | "view_manager_slots"
  | "create_local_manager"
  | "invite_network_manager"
  | "revoke_manager_invitation"
  | "remove_own_draft"
  | "remove_any_draft"
  | "transfer_manager_ownership"
  | "retire_manager"
  | "open_manager_profile";
```

Permissions come from trusted career and multiplayer policies.

The interface should hide irrelevant actions and disable visible but temporarily unavailable actions with an explanation.

---

## 18. Existing active manager actions

Depending on caller and permission, an active manager row may offer:

- Open Manager Profile.
- Switch Control.
- Reconnect.
- Manage Ownership.
- View Employment.
- Retire Manager.
- Remove Local Access.

Add Manager is not responsible for executing retirement or ownership transfer directly. It should navigate to dedicated confirmation workflows.

---

## 19. Start-unemployed path

Starting unemployed is selected later, usually during Club Selection or Manager Confirmation.

This screen may show that the option exists:

```text
You can select a club later or begin the career unemployed.
```

It must not create an unemployed active manager before personal details and final confirmation are complete.

---

## 20. Career-without-manager state

A newly generated world may exist temporarily without an active human manager.

Allowed operations:

- Add a manager.
- Review setup summary.
- Save or close the managerless checkpoint if product policy permits.
- Return to the main menu.
- Delete the unstarted career through a separate confirmation workflow.

Disallowed operations normally include:

- Advancing simulation time.
- Processing fixtures.
- Running transfer AI beyond initialization.
- Entering ordinary career navigation.

```typescript
interface ManagerlessCareerPolicy {
  readonly mayPersist: boolean;
  readonly mayAdvanceTime: boolean;
  readonly expirationPolicyId?: string;
  readonly appearsInLoadGameList: boolean;
}
```

---

## 21. Back behavior

### New career

`Back` may return to:

- World-generation success summary.
- Career Setup Summary.
- Main Menu, while retaining the managerless initial checkpoint.

It should not silently discard a generated world.

If the product does not retain managerless careers:

```text
Leave manager creation?

The newly generated career will be discarded because no manager has been
added yet.

[Stay Here] [Discard Career]
```

### Existing career

Back returns to Manager Status or the invoking career screen.

---

## 22. Career Setup Summary

This read-only panel may show:

- Database and season.
- Career creation date.
- Selected playable nations.
- Competition detail summary.
- Player and staff counts.
- Career seed visibility policy.
- Multiplayer mode.
- Manager capacity.
- World validation status.

It must not permit edits after world generation. If the user wants a different setup, the action should create a new career rather than mutating the generated world's foundations.

---

## 23. Multiplayer settings entry

A permitted host may review:

- Connection mode.
- Join policy.
- Invitation policy.
- Manager capacity.
- Turn or processing policy.
- Password or access policy.
- Connection status.

Security-sensitive values must not be shown in full.

---

## 24. State model

```typescript
interface AddManagerScreenState {
  readonly careerId: string;
  readonly careerDisplayName: string;
  readonly careerMode: "single_player" | "local_hot_seat" | "network";
  readonly worldCheckpointId: string;
  readonly slots: readonly ManagerSlotRowModel[];
  readonly activeManagerCount: number;
  readonly managerCapacity: number;
  readonly permissions: readonly ManagerAdministrationPermission[];
  readonly networkStatus?: "offline" | "connecting" | "online" | "degraded";
  readonly pendingOperation:
    "none" | "creating_draft" | "creating_invitation" | "removing_draft" | "refreshing";
  readonly issues: readonly AddManagerIssue[];
  readonly revision: number;
}
```

State crossing process or network boundaries must be serializable and schema-validated.

---

## 25. State transitions

```text
LOADING_MANAGER_SLOTS
  |
  v
READY_EMPTY or READY_WITH_MANAGERS
  |
  +-- Add Local Manager ---> RESERVING_SLOT
  |                              |
  |                              v
  |                         CREATING_DRAFT
  |                              |
  |                              v
  |                    MANAGER_PERSONAL_DETAILS
  |
  +-- Invite Network -----> CREATING_INVITATION
  |                              |
  |                              v
  |                    PENDING_NETWORK_CLAIM
  |
  +-- Resume Draft -------> VALIDATING_DRAFT
  |                              |
  |                              v
  |                    DRAFT_TARGET_SCREEN
  |
  +-- Remove Draft -------> AWAITING_CONFIRMATION
                                 |
                                 +-- cancel -> READY
                                 |
                                 +-- confirm -> REMOVING_DRAFT -> READY
```

Concurrent slot changes require a refresh or optimistic concurrency retry.

---

## 26. Commands and events

### 26.1 Commands

```text
LOAD_MANAGER_SLOTS
CREATE_LOCAL_MANAGER_DRAFT
CREATE_MANAGER_INVITATION
REVOKE_MANAGER_INVITATION
RESUME_MANAGER_DRAFT
REQUEST_REMOVE_MANAGER_DRAFT
CONFIRM_REMOVE_MANAGER_DRAFT
OPEN_MANAGER_PROFILE
OPEN_MANAGER_OWNERSHIP
OPEN_CAREER_SETUP_SUMMARY
OPEN_MULTIPLAYER_SETTINGS
REQUEST_BACK
REFRESH_MANAGER_SLOTS
```

### 26.2 Events

```text
MANAGER_SLOT_RESERVED
MANAGER_DRAFT_CREATED
MANAGER_DRAFT_RESUMED
MANAGER_DRAFT_REMOVED
MANAGER_INVITATION_CREATED
MANAGER_INVITATION_REVOKED
MANAGER_INVITATION_CLAIMED
MANAGER_OWNER_CONNECTED
MANAGER_OWNER_DISCONNECTED
MANAGER_SLOT_RELEASED
MANAGER_SLOT_CONFLICT_DETECTED
```

Every mutating command should contain an idempotency request ID and expected state revision.

---

## 27. Concurrency and conflict handling

Potential conflicts include:

- Two local actions reserve the final slot.
- Two network participants claim one invitation.
- A host revokes an invitation while it is being claimed.
- A draft is removed while another device resumes it.
- Manager capacity changes while the screen is open.

Use optimistic concurrency or transactional locking.

Conflict message:

```text
This manager slot changed on another session.

The manager list has been refreshed. Review the latest state and try again.
```

Do not overwrite newer server state silently.

---

## 28. Error states

### 28.1 World checkpoint unavailable

```text
The career's initial checkpoint could not be opened.

No manager changes were made.

[Retry] [Return to Main Menu]
```

### 28.2 Capacity reached

```text
No manager slot is currently available.
```

### 28.3 Permission denied

```text
You do not have permission to add a manager to this career.

Contact the career host if you believe access should be granted.
```

### 28.4 Network unavailable

```text
Network invitations are temporarily unavailable.

You can still add a local manager if the career policy allows it.

[Retry Connection]
```

### 28.5 Draft creation failure

```text
The manager draft could not be created safely.

No slot was consumed.

[Retry] [Close]
```

### 28.6 Draft belongs to another owner

```text
This manager draft belongs to another participant and cannot be resumed by
the current account.
```

### 28.7 Invitation expired

```text
This manager invitation has expired.

The host can create a new invitation if the slot is still available.
```

### 28.8 Career version mismatch

```text
This participant cannot join because the career and client versions are
not compatible.
```

---

## 29. Empty states

### No active manager

```text
No human manager has been added.

Add a manager to begin the career.
```

### No local-manager permission

```text
No manager is available to control from this device.

Ask the host for an invitation or permission to add a local manager.
```

### No network service

Hide or disable network invitation actions while preserving local actions.

---

## 30. Accessibility requirements

### 30.1 Slot list semantics

Expose the slot list as an accessible list or grid.

Each row should announce:

- Slot number.
- Manager name when available.
- State.
- Ownership type.
- Employment summary.
- Connection state.
- Available actions.

Example:

```text
Slot 2, Jamie Silva, network manager, unemployed, disconnected, Manage action
available.
```

### 30.2 Empty state

The primary Add Manager action should receive predictable initial focus when no manager exists.

### 30.3 Live updates

Announce meaningful changes:

```text
Manager invitation created for Slot 3.
Slot 3 was claimed by Participant 2.
Manager draft removed. Slot 4 is available.
```

### 30.4 Focus management

- Confirmation dialogs move focus to the safe action.
- Closing dialogs restores focus to the invoking row.
- After a row disappears, focus moves to the nearest logical remaining row.
- After draft creation, the Personal Details heading receives focus.
- Network refreshes must not reset focus unnecessarily.

### 30.5 Non-color status

Active, draft, disconnected, and invalid states require textual labels or icon-plus-text treatments.

---

## 31. Keyboard interaction

- `Tab` and `Shift+Tab`: move between controls.
- `Up Arrow` and `Down Arrow`: move through manager rows.
- `Home` and `End`: move to first or last visible row.
- `Enter`: activate the primary action for the focused row.
- `Shift+F10` or the context-menu key: open permitted row actions.
- `Delete`: request removal only for a removable draft or revocable invitation.
- `F5`: refresh manager slots when supported.
- `Escape`: close an overlay or navigate Back.

Keyboard shortcuts must respect permissions and confirmations.

---

## 32. Localization requirements

- Localize all state labels, permission explanations, and invitation messages.
- Use complete message templates.
- Localize manager counts and expiration durations.
- Support right-to-left layouts.
- Support long participant and club names.
- Keep career, manager, slot, and participant IDs language-independent.
- Do not construct ownership sentences by concatenating translated fragments.

---

## 33. Responsive behavior

### Wide desktop

Use a full manager list with separate columns for manager, owner, employment, status, and actions.

### Standard desktop

Combine secondary fields into a two-line row.

### Narrow desktop

Render manager slots as stacked cards:

```text
Jamie Silva
Network manager, Participant 2
Unemployed
Disconnected
[Manage]
```

### High text scaling

- Allow row metadata to wrap.
- Keep actions associated with their manager.
- Avoid horizontal scrolling for ordinary actions.
- Keep the manager count and Add action visible.

---

## 34. Security and privacy requirements

Treat manager names, participant names, invitations, ownership data, and network messages as untrusted.

Protect against:

- Script and markup injection.
- Invitation-code disclosure.
- Invitation replay.
- Slot-claim races.
- Forged ownership commands.
- Unauthorized draft access.
- Manager-name spoofing through Unicode controls.
- Excessively long display names.
- Session fixation.
- Cross-career invitation use.
- Duplicate command submission.
- Enumeration of private participants.

Rules:

1. Render names as text.
2. Validate every command in a trusted process or server.
3. Scope invitations to one career and slot.
4. Use expiration and revocation.
5. Store invitation secrets securely.
6. Never log complete invitation codes.
7. Require authenticated ownership claims.
8. Use idempotency keys for mutations.
9. Enforce expected-revision checks.
10. Reveal only participant data allowed by career policy.
11. Normalize identifiers but preserve display names safely.
12. Audit ownership changes without retaining unnecessary personal data.

---

## 35. Persistence rules

Persist:

- Active manager records.
- Incomplete manager drafts when policy allows.
- Slot reservations.
- Network invitation state.
- Ownership state.
- Revision and audit information.

Do not persist as active:

- Half-created manager records.
- Unconfirmed club control.
- Expired invitation secrets.
- Renderer-only permission decisions.
- Partially applied ownership transfers.

Manager draft writes should be atomic.

---

## 36. Observability

Useful operational events:

- Add Manager screen opened.
- Slot capacity state.
- Local draft creation success or failure.
- Invitation creation, expiration, claim, and revocation.
- Slot conflict.
- Draft resume and removal.
- Ownership validation failure category.

Avoid recording:

- Full invitation codes.
- Sensitive account identifiers in ordinary logs.
- User-provided manager names in telemetry unless explicitly permitted.
- Private network addresses.
- Authentication tokens.

---

## 37. Edge cases

### Last slot claimed remotely while local creation starts

One transaction succeeds. The other receives a refreshed capacity message.

### Draft owner disconnects

Preserve the draft according to expiry policy. Disconnection alone must not delete it.

### Host leaves

Apply the multiplayer host-migration policy before permitting further manager administration.

### Invitation expires while displayed

Update the row to expired without requiring a full screen reload.

### Manager capacity policy decreases

Do not delete existing active managers. Prevent new additions and raise an administrative warning.

### Existing manager has the same display name

Allow it if the product permits duplicate human names, but show ownership and slot information to avoid ambiguity.

### Draft references a club no longer available

Preserve earlier personal details and invalidate only the club-selection stage.

### Career closes during draft creation

Complete or roll back the atomic transaction. Never leave a permanently consumed empty slot.

### Participant opens the same draft on two devices

Use draft revision checks and an edit-lease or conflict policy.

### Managerless career is loaded

Open Add Manager automatically or present a direct Add Manager action.

### Retired manager returns as a new identity

Create a new manager ID. Do not reactivate a retired record unless the game explicitly supports that workflow.

---

## 38. Acceptance criteria

The screen is complete when:

1. It opens only for a valid generated or loaded career world.
2. Existing manager slots and states are represented accurately.
3. Empty, draft, pending, active, disconnected, retired, and invalid states are distinct.
4. The maximum manager capacity comes from policy rather than hardcoded UI logic.
5. Add Local Manager reserves one slot and creates one draft transaction.
6. Repeated requests with the same idempotency key do not create duplicate drafts.
7. Manager drafts cannot control clubs or affect simulation before confirmation.
8. Resume Draft opens the correct incomplete stage.
9. Removing a draft releases its slot transactionally.
10. Network invitations are scoped, expiring, revocable, and single use.
11. Simultaneous claims cannot assign one slot to multiple participants.
12. Ownership and permission decisions are enforced outside the renderer.
13. Disconnection does not silently remove manager ownership.
14. Managerless worlds cannot advance time unless policy explicitly allows it.
15. Back navigation does not silently discard a generated world.
16. Concurrent changes use revision or transaction conflict handling.
17. Keyboard users can operate every permitted action.
18. Screen-reader users receive slot, owner, employment, connection, and action information.
19. Untrusted names and messages cannot inject executable markup.
20. Sensitive invitation and authentication values are not exposed in logs.
21. Successful local draft creation transitions to Manager Personal Details.
22. No proprietary artwork, exact wording, source code, logos, or original database content is required.

---

## 39. Recommended tests

### Unit tests

- Slot-state derivation.
- Capacity calculation.
- Permission-to-action mapping.
- Draft-stage routing.
- Invitation-expiration state.
- Managerless-career policy.
- Idempotency-key behavior.
- Expected-revision validation.
- Duplicate display-name handling.
- Back-destination resolution.

### Integration tests

- Open a new managerless career.
- Create the first local manager draft.
- Create multiple hot-seat drafts.
- Resume an incomplete draft.
- Remove a draft and release its slot.
- Reach manager capacity.
- Create and revoke a network invitation.
- Claim a network invitation.
- Reconnect a disconnected owner.
- Return from Personal Details and retain the draft.
- Load a managerless career and open Add Manager.
- Navigate to Career Setup Summary.

### Concurrency tests

- Two requests reserve the last slot.
- Two participants claim the same invitation.
- Revoke while claiming.
- Remove while resuming a draft.
- Refresh while focus remains on a changed row.
- Open one draft from two devices.
- Submit duplicate create commands.

### Security tests

- Forged career ID.
- Forged slot ID.
- Forged ownership type.
- Unauthorized draft access.
- Replayed invitation.
- Cross-career invitation claim.
- Expired invitation claim.
- Oversized manager and participant names.
- Markup-like names.
- Unicode bidirectional-control spoofing.
- Missing or reused idempotency key.
- Stale revision mutation.
- Invitation secret in log output.

### Accessibility tests

- Keyboard-only first-manager creation.
- Slot-list navigation.
- Draft removal confirmation focus.
- Invitation-created announcement.
- Remote-claim announcement.
- Dynamic row removal focus.
- High-contrast mode.
- Reduced-motion mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long manager, participant, and club names.

### Visual regression tests

Capture at least:

- New career empty state.
- One active local manager.
- Multiple local managers.
- Active network manager.
- Disconnected network manager.
- Pending invitation.
- Incomplete draft.
- Capacity reached.
- Permission denied.
- Network unavailable.
- Remove-draft confirmation.
- Managerless-career exit warning.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 40. Condensed LLM implementation brief

```text
Implement a desktop Add Manager screen for an original football-management
simulation. The screen opens after a generated world has a durable initial
checkpoint and may also be opened later from Manager Status.

Display career-local manager slots with Empty, Draft, Pending Network Claim,
Active, Disconnected, Retired, and Invalid states. Each row shows only
permitted ownership, employment, connection, and action information. The
maximum manager count and invitation limits come from named policy values,
not hardcoded interface logic.

Support Add Local Manager, Invite Network Manager, Resume Draft, Remove Draft,
Open Manager, Career Setup Summary, Multiplayer Settings, and Back according
to trusted permissions. Adding a local manager must reserve exactly one slot,
create an atomic ManagerDraft, associate ownership, persist it, and navigate
to Manager Personal Details. Use idempotency request IDs and expected state
revisions.

A ManagerDraft is not an active manager. It must not receive an inbox,
control a club, occupy an AI vacancy permanently, or affect simulation before
final confirmation. Resume the latest valid draft revision at the first
incomplete stage. Draft removal must release the slot and revoke related
unclaimed invitations transactionally.

For network play, invitations must be authenticated, short-lived, revocable,
single use, and scoped to one career and slot. Claiming must atomically consume
the invitation and assign ownership. Handle simultaneous claims, revocation
races, disconnections, and host migration. Renderer state must never confer
permission or ownership.

A managerless newly generated world may be persisted only according to
explicit policy and normally cannot advance simulation time. Back navigation
must not silently discard the generated world. If managerless worlds are not
retained, require an explicit destructive confirmation.

Treat manager names, participant names, invitations, ownership commands, and
network events as untrusted. Render text safely, validate all commands in a
trusted process or server, use revision checks, prevent invitation replay,
and never log complete invitation codes or authentication secrets.

Support complete keyboard interaction, accessible list or grid semantics,
visible focus, dynamic state announcements, high text scaling, localization,
and right-to-left layouts. On successful draft creation, transition to
Manager Personal Details. Do not copy proprietary artwork, exact wording,
source code, logos, or databases.
```

---

## 41. Next planned item

**Screen 8: Manager Personal Details** should define names, date of birth, gender-neutral presentation options where supported, place of birth, appearance or portrait policy, password or local privacy settings, duplicate-name handling, validation, draft persistence, and transition to Manager Nationality and Languages.

---

## Suggested Git commit

```text
feat(docs): specify add manager screen
```
