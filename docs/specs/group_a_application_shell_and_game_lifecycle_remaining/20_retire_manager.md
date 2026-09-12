# Screen 20: Retire Manager

> **Clean-room notice:** Use original interface text and visuals. Retirement is a consequential career action and must be explicit and recoverable where policy permits.

## 1. Purpose

The **Retire Manager** workflow permanently ends an active human manager's controllable career identity while preserving valid history, honours, employment records, and world integrity.

It must allow the user to:

- Review the selected manager.
- Understand the difference between retiring, resigning, disconnecting, and removing a draft.
- Review consequences for employment, ownership, inbox, private data, and career continuation.
- Confirm retirement through an appropriately strong action.
- Save a recovery checkpoint before mutation.
- Continue with another manager, add a manager, or return to the Main Menu afterward.

## 2. Retirement is not resignation

```text
Resign from club
  -> Manager remains active and becomes unemployed

Retire manager
  -> Manager becomes historical and cannot submit career commands
```

The screen must link to `Resign` instead when that better matches the user's intent.

## 3. Conceptual layout

```text
+--------------------------------------------------------------------------+
| RETIRE MANAGER                                                           |
|--------------------------------------------------------------------------|
| João Monteiro                                                            |
| Manager of North United                                                  |
| Career record: 58 matches, 1 honour                                      |
|                                                                          |
| Retirement will:                                                         |
| - End control of this manager                                            |
| - End the current employment relationship                                |
| - Preserve career history and honours                                    |
| - Archive the manager's inbox according to privacy policy                |
| - Release the human-manager slot according to career policy              |
|                                                                          |
| Other active human managers: 1                                           |
|                                                                          |
| [ ] I understand that this manager cannot be resumed after retirement.   |
|                                                                          |
| [Cancel] [Resign Instead]                               [Retire Manager] |
+--------------------------------------------------------------------------+
```

## 4. Preconditions

Verify:

- Manager exists and is active.
- Current controller owns the manager or has administrative permission.
- Manager is not already retiring or retired.
- No incompatible transaction is active.
- Match or simulation state is at a safe boundary.
- A valid save target or recovery policy exists.
- Multiplayer host authority is available when required.

## 5. Consequences

Retirement may:

- Close the active employment record.
- Remove organization control permissions.
- Preserve history and statistics.
- Archive or redact private inbox content.
- Cancel manager-specific pending commands.
- Preserve public news and competition records.
- Release or retire ownership binding.
- Update manager capacity.
- Select another active manager or managerless state.

It must not:

- Delete the football world.
- Erase public career history.
- Delete unrelated saves.
- Retire other managers.
- Remove the managed club.

## 6. Organization continuity

For an employed manager, the club or national team must receive a valid post-retirement state:

- Interim AI manager.
- Existing assistant promoted temporarily.
- Vacancy created.
- Scenario-defined replacement.

The organization must never remain in an invalid half-controlled state.

## 7. Pending operations

Before retirement, handle:

- Transfer offers.
- Contract negotiations.
- Tactical submissions.
- Team selections.
- Staff offers.
- Scheduled media responses.
- Network commands.

Each command is completed, cancelled, reassigned, or invalidated by explicit policy.

## 8. Private data

Manager-private information may be:

- Archived and visible only to authorized administrators.
- Retained for historical audit.
- Redacted after a retention period.
- Deleted when no longer required.

Public history must remain separate from private inbox and scouting data.

## 9. Confirmation policy

```typescript
interface ManagerRetirementPolicy {
  readonly requireAcknowledgment: boolean;
  readonly requireTypedManagerName: boolean;
  readonly createRecoveryCheckpoint: boolean;
  readonly retiredManagersOccupyCapacity: boolean;
  readonly inboxRetentionPolicyId: string;
  readonly organizationTransitionPolicyId: string;
}
```

Typed confirmation is optional and should be used only when product risk justifies it.

## 10. Retirement transaction

```text
Validate authority and manager state
  -> Reach safe simulation boundary
  -> Create recovery checkpoint
  -> Acquire manager and organization locks
  -> Cancel or resolve pending manager commands
  -> Close employment
  -> Assign organization interim control
  -> Mark manager retired
  -> Revoke active permissions
  -> Archive private data
  -> Update manager slot and ownership
  -> Create retirement history event
  -> Save new checkpoint
  -> Commit
```

All canonical changes must be atomic.

## 11. Command model

```typescript
interface RetireManagerCommand {
  readonly careerId: string;
  readonly managerId: string;
  readonly expectedManagerRevision: number;
  readonly expectedCareerRevision: number;
  readonly acknowledgmentFingerprint: string;
  readonly controllerContextId: string;
  readonly requestId: string;
}
```

The command must be idempotent.

## 12. Retirement result

```typescript
interface RetireManagerResult {
  readonly transactionId: string;
  readonly managerId: string;
  readonly retirementHistoryEntryId: string;
  readonly newCheckpointId: string;
  readonly organizationTransition?: OrganizationControlTransition;
  readonly nextDestination: CareerNavigationDestination;
  readonly completedAt: string;
}
```

## 13. Last active manager

If this is the last active human manager:

```text
This is the last active human manager in the career.

After retirement, the career will return to Add Manager and simulation time will
not advance until another manager is activated, unless managerless play is
explicitly supported.
```

## 14. Multiplayer behavior

- A participant may retire only managers they own unless granted administrative permission.
- The host cannot bypass privacy and ownership policy casually.
- Retirement is broadcast only after commit.
- Disconnection is not retirement.
- Host migration must complete before authoritative retirement.

## 15. Cancellation

Before canonical mutation begins, Cancel returns to Manager Status.

During checkpoint or commit stages, cancellation may be deferred. The interface must explain this state.

## 16. Failure and rollback

If any mutation fails:

- Restore employment.
- Restore organization control.
- Restore permissions.
- Restore ownership and slot state.
- Remove incomplete history entries.
- Preserve the manager as active.

If rollback cannot complete, quarantine the career transaction and require recovery.

## 17. Error states

```text
This manager changed in another session. Review the latest status before retiring.
```

```text
A recovery checkpoint could not be created. Retirement was not started.
```

```text
The career could not complete retirement safely. No retirement was committed.
```

## 18. Success state

```text
Manager retired

João Monteiro's career history has been preserved.
North United is now controlled by an interim manager.

[Switch to Jamie Silva] [Add Manager] [Return to Main Menu]
```

Show only valid actions.

## 19. Accessibility

- Focus the consequence heading on open.
- Use a structured consequence list.
- Make the safe Cancel action the default.
- Associate acknowledgment with the final action.
- Announce checkpoint, retirement, rollback, and success states.
- Use text, not color alone, for destructive status.
- Support keyboard-only completion and high text scaling.

## 20. Security and integrity

- Enforce permission outside the renderer.
- Use expected manager and career revisions.
- Acquire manager, organization, and checkpoint locks.
- Recalculate consequences authoritatively.
- Never trust renderer-supplied organization transition data.
- Use idempotency keys.
- Sanitize names and diagnostic output.
- Preserve audit data without retaining unnecessary private content.

## 21. Edge cases

- Manager loses employment before confirmation: rebuild consequences.
- Another session retires the manager: return the original result or current retired state.
- Last manager retires during multiplayer host transition: defer until authority stabilizes.
- Save target becomes unavailable: block before mutation.
- Club has no valid interim candidate: create a policy-approved vacancy or generated interim role.
- Same request retries after client timeout: return the original result.

## 22. Acceptance criteria

1. Retirement and resignation are clearly distinguished.
2. The selected manager and consequences are explicit.
3. Authority, revisions, and safe simulation boundary are revalidated.
4. A recovery checkpoint is created when policy requires it.
5. Employment, control, permission, history, inbox, and slot changes are atomic.
6. Organization continuity remains valid.
7. Private and public historical data are handled separately.
8. Failed retirement leaves the manager fully active or enters controlled recovery.
9. Duplicate requests cannot retire twice.
10. The final destination correctly handles another manager or managerless career.
11. Keyboard and assistive-technology users can review and confirm safely.
12. No proprietary source-game assets or wording are required.

## 23. Recommended tests

- Retire employed manager.
- Retire unemployed manager.
- Retire last active manager.
- Retire one manager in hot-seat mode.
- Permission denied.
- Manager revision conflict.
- Checkpoint failure.
- Failure after employment closure with rollback.
- Duplicate request.
- Organization interim assignment.
- Private inbox archival.
- Keyboard and screen-reader flow.

## Suggested Git commit

```text
docs(game-ui): specify retire manager workflow
```
