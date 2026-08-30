# Screen 28: Calendar and Schedule

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. Use original interface text, visual design, and fictional or properly licensed data.

---

## 1. Purpose

The Calendar and Schedule screen presents fixtures, deadlines, meetings, transfer windows, registration dates, draws, reminders, and manager-created notes across day, week, month, and agenda views.

## 2. Primary user goals

- Review upcoming fixtures and deadlines.
- Navigate to a specific date.
- Filter event categories.
- Open linked competition, club, match, or inbox entities.
- Create manager-private reminders where supported.
- Identify conflicts and mandatory deadlines.

## 3. Position in the navigation model

```text
Global Application Shell
  -> Calendar and Schedule
  -> Related entity or workflow
  -> Return to prior safe screen
```

The screen must preserve the active manager, career revision, navigation history, and permission context.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| CALENDAR                           February 2005          [Today] [Agenda]   |
|------------------------------------------------------------------------------|
|   Mon  Tue  Wed  Thu  Fri  Sat  Sun                                          |
|        1    2    3    4    5    6                                            |
|   7    8    9    10   11   12   13                                           |
|   14  [15]  16   17   18   19   20                                           |
|                                                                              |
| 15 February                                                                  |
| 19:45 League: North United v Example City                                    |
| Deadline: Submit team by 18:45                                               |
| Reminder: Review opposition report                                           |
|                                                                              |
| [Filter Events] [Add Reminder] [Open Day]                            [Back]  |
+------------------------------------------------------------------------------+
```

The diagram defines information hierarchy and behavior rather than exact pixel placement.

## 5. Information architecture

The interface should use persistent headings, clearly labeled controls, a predictable content region, and an explicit status area. Data-heavy lists must support stable sorting, keyboard traversal, and virtualized rendering where necessary.

## 6. Core data model

```typescript
interface CalendarEventSummary {
  readonly eventId: string;
  readonly eventTypeId: string;
  readonly start: string;
  readonly end?: string;
  readonly allDay: boolean;
  readonly title: string;
  readonly mandatory: boolean;
  readonly managerVisibility: "private" | "organization" | "career_public";
  readonly linkedEntities: readonly SafeEntityLink[];
  readonly status: "scheduled" | "completed" | "cancelled" | "postponed";
  readonly revision: number;
}
```

Renderer-facing models must be serializable, immutable per revision, and validated at the process or network boundary.

## 7. Principal interactions

- Change month, week, day, or agenda view.
- Jump to today or another valid date.
- Filter event categories.
- Open an event and its linked entity.
- Create, edit, and remove a private reminder.
- Advance time to a selected date through Screen 23 validation.

## 8. Screen and operation states

- `loading`
- `ready`
- `empty_day`
- `filtering`
- `editing_reminder`
- `refreshing`
- `conflicted`

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

- Scope private reminders to the active manager.
- Validate date ranges and linked entity IDs.
- Prevent calendar text from injecting markup.
- Do not let a reminder override mandatory career events.
- Use revision checks for rescheduling and multiplayer updates.

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

1. Fixture and deadline dates are authoritative.
2. Views represent the same event set consistently.
3. Manager reminders remain private.
4. Filters do not delete hidden events.
5. Postponed and cancelled events are explicit.
6. Advance-to-date routes through authoritative validation.
7. Keyboard calendar navigation is complete.
8. No proprietary calendar styling is required.

## 21. Recommended tests

- Month and agenda views.
- Fixture postponement.
- Mandatory deadline.
- Private reminder.
- Manager switch privacy.
- Date boundary.
- Deleted linked entity.
- Keyboard navigation.

## 22. Condensed LLM implementation brief

```text
Implement Calendar and Schedule as part of the global navigation and inbox
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

**Screen 29: Manager Notebook**

## Suggested Git commit

```text
docs(game-ui): specify calendar and schedule screen
```
