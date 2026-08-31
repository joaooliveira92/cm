# Screen 22: Global Application Shell

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. Use original interface text, visual design, and fictional or properly licensed data.

---

## 1. Purpose

The Global Application Shell is the persistent frame surrounding ordinary career screens. It provides manager context, primary navigation, browser history, global search, simulation controls, alerts, status indicators, and an accessible content viewport.

## 2. Primary user goals

- Identify the active career, manager, and organization.
- Navigate to squad, staff, tactics, training, fixtures, finances, transfers, scouting, competitions, news, and search.
- Move backward and forward through safe navigation history.
- Open recent entities without losing the current context.
- Monitor save, processing, network, and unread-message states.
- Switch managers safely when permitted.

## 3. Position in the navigation model

```text
Global Application Shell
  -> Global Application Shell
  -> Related entity or workflow
  -> Return to prior safe screen
```

The screen must preserve the active manager, career revision, navigation history, and permission context.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Career | Manager | Club                Date          [Continue] [Status icons] |
|------------------------------------------------------------------------------|
| Back Forward Home | Squad Tactics Training Transfers News Search More         |
|------------------------------------------------------------------------------|
| Breadcrumbs: Club > Squad > Player                                            |
|------------------------------------------------------------------------------|
|                                                                              |
|                               CONTENT VIEWPORT                               |
|                                                                              |
|------------------------------------------------------------------------------|
| Context status | Save status | Network status | Notifications                |
+------------------------------------------------------------------------------+
```

The diagram defines information hierarchy and behavior rather than exact pixel placement.

## 5. Information architecture

The interface should use persistent headings, clearly labeled controls, a predictable content region, and an explicit status area. Data-heavy lists must support stable sorting, keyboard traversal, and virtualized rendering where necessary.

## 6. Core data model

```typescript
interface GlobalShellState {
  readonly careerId: string;
  readonly managerId: string;
  readonly organizationId?: string;
  readonly careerDate: string;
  readonly primaryDestinations: readonly NavigationDestination[];
  readonly history: NavigationHistorySnapshot;
  readonly unreadCounts: Readonly<Record<string, number>>;
  readonly processingState: CareerProcessingState;
  readonly saveState: RuntimeSaveState;
  readonly networkState?: MultiplayerConnectionState;
  readonly revision: number;
}
```

Renderer-facing models must be serializable, immutable per revision, and validated at the process or network boundary.

## 7. Principal interactions

- Activate a primary destination.
- Use Back and Forward through manager-scoped safe routes.
- Open global search and recent entities.
- Activate Continue or inspect the processing queue.
- Open status, save, connection, and notification details.
- Switch manager through the protected handoff workflow.

## 8. Screen and operation states

- `loading_context`
- `ready`
- `navigating`
- `processing`
- `saving`
- `offline`
- `permission_changed`
- `recovery_required`

Every asynchronous operation must expose a visible state, support cancellation where safe, and discard stale responses by revision or request fingerprint.

## 9. Navigation behavior

- Back returns to the prior safe route and restores logical focus.
- Direct entity links use stable IDs rather than display names.
- Deleted or inaccessible entities produce a safe unavailable state.
- Unsafe transient dialogs and partially completed transactions are not restored after load.
- Navigation history is manager-scoped in hot-seat and multiplayer careers.

## 10. Permissions and multiplayer behavior

- The active manager determines what private data can be displayed.
- Shared career data comes from the authoritative host or server revision.
- Client rendering state never grants permissions.
- Manager switching clears private transient content before the next manager gains control.
- Remote changes refresh affected content without silently overwriting local drafts.

## 11. Validation and error handling

- Validate route parameters, entity IDs, revisions, filters, and actions in a trusted layer.
- Preserve the last valid view when refresh fails.
- Distinguish empty, unavailable, permission-denied, offline, conflicted, and failed states.
- Give corrective actions such as Retry, Clear Filters, Return, or Open Recovery.
- Never display raw stack traces, credentials, private paths, or provider secrets.

## 12. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Use headings, landmarks, list or grid semantics, and persistent form labels.
- Announce meaningful state changes without announcing every incremental update.
- Never communicate status by color alone.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.
- Restore focus after dialogs, drawers, and linked detail screens close.

## 13. Localization requirements

- Localize labels, statuses, dates, times, numbers, currencies, durations, and plural forms.
- Preserve stable IDs independently from translated display names.
- Apply locale-aware search and sorting.
- Preserve native scripts, accents, and manager-selected name order.
- Use complete message templates rather than concatenated translated fragments.

## 14. Responsive behavior

- Wide desktop may use list-and-detail or multi-column layouts.
- Standard desktop should prioritize primary data over decorative regions.
- Narrow windows should stack filters, content, details, and actions.
- High text scaling must preserve labels, controls, warnings, and primary actions.
- Ultrawide layouts should use readable maximum widths instead of stretching rows excessively.

## 15. Performance requirements

- Virtualize long lists.
- Debounce search and expensive filters.
- Cancel stale requests.
- Preserve stable row identity and scroll position.
- Keep heavy queries and transformations outside the renderer.
- Rate-limit live updates and progress events.
- Avoid transporting complete world graphs when a compact read model is sufficient.

## 16. Security and privacy requirements

- Validate every route and command in the trusted application layer.
- Hide private manager content during control switching.
- Do not place authentication tokens or private messages in browser history.
- Restrict global search results by active-manager knowledge and permission.
- Reject events for inactive career or manager IDs.

## 17. Persistence rules

Persist only durable user preferences, safe navigation bookmarks, manager-scoped drafts, and authoritative career state. Do not persist transient hover state, unsafe dialogs, unvalidated filters, plaintext secrets, or stale permission decisions.

## 18. Observability

Record operation duration, result category, revision conflicts, and safe diagnostic codes. Avoid recording private message content, full manager names, authentication data, arbitrary user notes, or complete local paths in general telemetry.

## 19. Edge cases

- The active manager changes while the screen is open.
- The selected entity is deleted or becomes inaccessible.
- The career revision advances during an asynchronous request.
- The host disconnects or migrates.
- Filters hide the currently selected item.
- The application resumes after sleep or network loss.
- The same action is submitted twice.
- A late response arrives after navigation away.

## 20. Acceptance criteria

1. The active manager and organization are always unambiguous.
2. Primary navigation is reachable by mouse and keyboard.
3. Navigation history restores only safe valid routes.
4. Continue, save, processing, and network states remain distinct.
5. Unread counts update without resetting focus.
6. Manager switching protects private state.
7. The shell survives entity deletion and permission changes safely.
8. No proprietary source-game assets are required.

## 21. Recommended tests

- Primary destination routing.
- Back and Forward history.
- Deleted-entity fallback.
- Manager switch privacy.
- Unread-count live update.
- Network disconnection.
- 200 percent scaling.
- Right-to-left layout.

## 22. Condensed LLM implementation brief

```text
Implement Global Application Shell as part of the global navigation and inbox
system of an original football-management simulation. Use compact immutable read
models, stable IDs, permission-aware queries, revision-bound asynchronous
operations, safe navigation history, virtualized data-heavy views, deterministic
state transitions, and authoritative server or application validation. Preserve
manager privacy in hot-seat and network careers. Support keyboard navigation,
screen-reader semantics, visible focus, high text scaling, localization, and
right-to-left layouts. Treat all database labels, user content, network payloads,
route parameters, and renderer commands as untrusted. Do not copy proprietary
artwork, exact wording, source code, logos, or databases.
```

## 23. Next planned item

**Screen 23: Continue and Advance Time**

## Suggested Git commit

```text
docs(game-ui): specify global application shell
```
