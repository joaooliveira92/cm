# Screen 25: Individual News Message

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. Use original interface text, visual design, and fictional or properly licensed data.

---

## 1. Purpose

The Individual News Message screen displays one manager-scoped message with structured content, safe entity links, metadata, attachments, and any required or optional action.

## 2. Primary user goals

- Read the complete message.
- Understand sender, time, category, priority, and deadline.
- Open referenced entities safely.
- Complete, defer, reject, or acknowledge supported actions.
- Navigate to adjacent messages within the active inbox result set.
- Review action history and resulting state.

## 3. Position in the navigation model

```text
Global Application Shell
  -> Individual News Message
  -> Related entity or workflow
  -> Return to prior safe screen
```

The screen must preserve the active manager, career revision, navigation history, and permission context.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| NEWS > CONTRACTS                                                     4 of 18 |
|------------------------------------------------------------------------------|
| Player contract response                                                     |
| From: Director of Football                  12 February 2005, 09:15          |
|------------------------------------------------------------------------------|
| Structured message body with safe links and formatted facts.                 |
|                                                                              |
| Linked entities: Player Name | Contract | Club Finances                      |
|                                                                              |
| Deadline: 13 February 2005                                                   |
|------------------------------------------------------------------------------|
| [Reject Terms] [Review Contract] [Accept Terms]                              |
| [Previous] [Next] [Back to Inbox]                                            |
+------------------------------------------------------------------------------+
```

The diagram defines information hierarchy and behavior rather than exact pixel placement.

## 5. Information architecture

The interface should use persistent headings, clearly labeled controls, a predictable content region, and an explicit status area. Data-heavy lists must support stable sorting, keyboard traversal, and virtualized rendering where necessary.

## 6. Core data model

```typescript
interface NewsMessageViewModel {
  readonly messageId: string;
  readonly managerId: string;
  readonly revision: number;
  readonly header: MessageHeaderModel;
  readonly contentBlocks: readonly SafeMessageContentBlock[];
  readonly entityLinks: readonly SafeEntityLink[];
  readonly attachments: readonly SafeMessageAttachment[];
  readonly actions: readonly MessageActionModel[];
  readonly actionHistory: readonly MessageActionHistoryItem[];
  readonly navigationContext: MessageNavigationContext;
}
```

Renderer-facing models must be serializable, immutable per revision, and validated at the process or network boundary.

## 7. Principal interactions

- Open a safe entity link.
- Execute an enabled action through confirmation when required.
- Move to previous or next visible message.
- Mark read automatically according to policy.
- Flag, archive, or return to the inbox.
- Refresh when the action state changes remotely.

## 8. Screen and operation states

- `loading`
- `ready`
- `action_required`
- `action_in_progress`
- `action_completed`
- `action_expired`
- `unavailable`
- `permission_denied`

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

- Render message content through a constrained block schema, not arbitrary HTML.
- Validate every action against current career revision.
- Use idempotency keys for consequential actions.
- Restrict attachments to approved view-only types.
- Do not expose private message content in telemetry or desktop previews.

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

1. The message body uses safe structured blocks.
2. Entity links resolve by stable ID and permission.
3. Actions show current eligibility and deadlines.
4. Duplicate actions cannot execute twice.
5. Previous and Next respect the active filter result set.
6. Expired actions remain readable but disabled.
7. Focus returns correctly to the inbox.
8. No proprietary news templates are required.

## 21. Recommended tests

- Structured body rendering.
- Safe entity links.
- Required action.
- Expired action.
- Duplicate submission.
- Previous and Next context.
- Permission loss.
- Attachment validation.

## 22. Condensed LLM implementation brief

```text
Implement Individual News Message as part of the global navigation and inbox
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

**Screen 26: News Filters**

## Suggested Git commit

```text
docs(game-ui): specify individual news message screen
```
