# Screen 19: Manager Status

> **Clean-room notice:** Use original interface text, visual design, and fictional or licensed data.

## 1. Purpose

The **Manager Status** screen summarizes every human manager attached to the active career and provides authorized lifecycle actions such as switching control, reconnecting, opening a manager profile, managing ownership, adding another manager, or beginning retirement.

## 2. Main layout

```text
+----------------------------------------------------------------------------+
| MANAGER STATUS                                                  2/4 active |
|----------------------------------------------------------------------------|
| MANAGER              CONTROL       EMPLOYMENT          STATE               |
| João Monteiro        Local         North United        Active              |
| Jamie Silva          Network       Unemployed          Disconnected        |
| Slot 3               Local         Draft               Incomplete          |
| Slot 4               -             -                   Available           |
|----------------------------------------------------------------------------|
| Selected: João Monteiro                                                    |
| Career record: 58 matches | Reputation: National | Contract to June 2007   |
|----------------------------------------------------------------------------|
| [Open Profile] [Switch Control] [Manage Ownership] [Retire Manager]        |
| [Add Manager]                                                       [Back] |
+----------------------------------------------------------------------------+
```

## 3. Manager states

```typescript
type CareerManagerLifecycleState =
  | "draft"
  | "active_employed"
  | "active_unemployed"
  | "disconnected"
  | "suspended_control"
  | "retirement_pending"
  | "retired"
  | "invalid";
```

## 4. Row content

Each row may show:

- Manager display name.
- Portrait or initials.
- Local or network control.
- Owner display name according to privacy policy.
- Current employer or unemployed state.
- Connection state.
- Current turn readiness.
- Lifecycle status.
- Available actions.

```typescript
interface ManagerStatusRow {
  readonly managerId?: string;
  readonly slotId: string;
  readonly displayName: string;
  readonly lifecycleState: CareerManagerLifecycleState;
  readonly ownershipSummary?: ManagerOwnershipSummary;
  readonly employmentSummary?: ManagerEmploymentSummary;
  readonly connectionState?: "connected" | "disconnected" | "unknown";
  readonly permittedActions: readonly ManagerStatusAction[];
}
```

## 5. Open Profile

Navigates to the manager's full profile without changing control ownership.

## 6. Switch Control

For local hot-seat careers, switching control must:

1. Verify local permission.
2. Save or close unsafe transient state.
3. Move to a neutral handoff screen.
4. Hide private inbox and scouting details.
5. Require the target manager's local access code when configured.
6. Bind the current interface context to the selected manager.
7. Navigate to a safe manager destination.

Switching control does not transfer ownership.

## 7. Network reconnect

A disconnected network manager remains active. Reconnect must validate:

- Participant authentication.
- Career and client version.
- Ownership binding.
- Current server revision.
- Session policy.

The host must not impersonate the disconnected manager merely because the participant is offline unless an explicit administrative takeover workflow exists.

## 8. Manage Ownership

Authorized ownership actions may include:

- Transfer to another authenticated participant.
- Reassign to a local controller.
- Release a disconnected manager for host reassignment.
- Revoke local access.

Ownership changes require a dedicated transaction and must not be performed through renderer-only state.

## 9. Add Manager

Available only when capacity and permissions allow. It opens Screen 7 with the active career context.

## 10. Retire Manager

Opens Screen 20. It must not retire immediately.

## 11. Manager summary panel

May display:

- Career matches.
- Wins, draws, losses.
- Current reputation.
- Qualifications.
- Contract or unemployed duration.
- Honours.
- Current board confidence.
- Private-data visibility according to viewer permissions.

## 12. Permissions

```typescript
type ManagerStatusPermission =
  | "view_manager"
  | "switch_local_control"
  | "reconnect_owned_manager"
  | "manage_ownership"
  | "add_manager"
  | "retire_owned_manager"
  | "retire_any_manager";
```

Permissions are calculated by the authoritative career or host service.

## 13. Refresh and concurrency

Manager state can change remotely. The screen must:

- Subscribe to safe lifecycle events.
- Use a manager-list revision.
- Preserve focus during updates.
- Reject mutations against stale revisions.
- Refresh after conflicts.

Example conflict:

```text
This manager changed in another session. The manager list has been refreshed.
```

## 14. State model

```typescript
interface ManagerStatusScreenState {
  readonly careerId: string;
  readonly selectedManagerId?: string;
  readonly rows: readonly ManagerStatusRow[];
  readonly capacity: number;
  readonly activeCount: number;
  readonly permissions: readonly ManagerStatusPermission[];
  readonly listRevision: number;
  readonly pendingOperation:
    "none" | "switching" | "reconnecting" | "transferring_ownership" | "refreshing";
}
```

## 15. Accessibility

- Expose the list as a grid or list with manager, owner, employer, connection, and status.
- Announce remote connection changes politely.
- Keep row actions accessible through keyboard and an explicit action menu.
- Use a neutral handoff screen during local manager switching.
- Restore focus to the same manager after returning from Profile or Retirement.

## 16. Security and privacy

- Enforce permissions outside the renderer.
- Do not expose private inbox, scouting, or access-code data.
- Treat names and network messages as untrusted text.
- Use expected revisions and idempotency keys for mutations.
- Never log local access codes or authentication tokens.

## 17. Edge cases

- Selected manager retires remotely: focus the nearest valid row.
- Host migration occurs: suspend ownership actions until authority is established.
- Capacity decreases below active count: retain managers but block additions.
- Draft becomes active: update the row without duplication.
- Current manager disconnects: preserve UI cautiously and show reconnect state.

## 18. Acceptance criteria

1. Every human manager, draft, and available slot is represented accurately.
2. Lifecycle, employment, ownership, and connection states remain distinct.
3. Control switching does not transfer ownership.
4. Private data is hidden during hot-seat handoff.
5. Network reconnect validates ownership authoritatively.
6. All mutating actions use permissions and expected revisions.
7. Retire Manager opens a dedicated confirmation workflow.
8. Dynamic updates preserve logical focus.
9. Keyboard and screen-reader users can inspect and act on each row.
10. No proprietary source-game assets or wording are required.

## 19. Recommended tests

- Active employed and unemployed rows.
- Draft and retired states.
- Hot-seat switch with and without access code.
- Network reconnect.
- Ownership transfer conflict.
- Capacity reached.
- Remote state update.
- Permission filtering.
- Privacy-safe summary.
- Focus restoration.

## Suggested Git commit

```text
docs(game-ui): specify manager status screen
```
