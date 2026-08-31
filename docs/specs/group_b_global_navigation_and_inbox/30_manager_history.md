# Screen 30: Manager History

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. Use original interface text, visual design, and fictional or properly licensed data.

---

## 1. Purpose

The Manager History screen presents a chronological, read-only record of appointments, resignations, dismissals, retirements, competitions, honours, awards, and major career milestones.

## 2. Primary user goals

- Review a manager’s career timeline.
- Inspect employment periods and records.
- Review honours and awards.
- Open linked clubs, competitions, and seasons.
- Filter event types and date ranges.
- Compare season summaries without altering history.

## 3. Position in the navigation model

```text
Global Application Shell
  -> Manager History
  -> Related entity or workflow
  -> Return to prior safe screen
```

The screen must preserve the active manager, career revision, navigation history, and permission context.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| MANAGER HISTORY: JOAO MONTEIRO                                               |
|------------------------------------------------------------------------------|
| [Timeline] [Appointments] [Honours] [Awards] [Season Summary]                |
|------------------------------------------------------------------------------|
| 2005                                                                         |
| 12 Feb  Appointed manager of North United                                    |
| 29 May  Finished 4th in First Division                                       |
|                                                                              |
| 2004                                                                         |
| 15 Jul  Entered career as unemployed                                         |
|------------------------------------------------------------------------------|
| Career matches 58 | Wins 29 | Draws 14 | Losses 15 | Honours 1               |
| [Filter] [Open Linked Club]                                          [Back]  |
+------------------------------------------------------------------------------+
```

The diagram defines information hierarchy and behavior rather than exact pixel placement.

## 5. Information architecture

The interface should use persistent headings, clearly labeled controls, a predictable content region, and an explicit status area. Data-heavy lists must support stable sorting, keyboard traversal, and virtualized rendering where necessary.

## 6. Core data model

```typescript
interface ManagerHistoryEvent {
  readonly historyEventId: string;
  readonly managerId: string;
  readonly occurredOn: string;
  readonly eventTypeId: string;
  readonly summary: string;
  readonly organizationId?: string;
  readonly competitionId?: string;
  readonly seasonId?: string;
  readonly publicVisibility: boolean;
  readonly sourceTransactionId: string;
}
```

Renderer-facing models must be serializable, immutable per revision, and validated at the process or network boundary.

## 7. Principal interactions

- Switch between timeline, appointments, honours, awards, and seasons.
- Filter by date and event type.
- Open linked entities.
- Expand a season summary.
- Copy or export a safe public summary.
- Navigate to Manager Profile.

## 8. Screen and operation states

- `loading`
- `ready`
- `empty`
- `filtered_empty`
- `refreshing`
- `unavailable`

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

- Treat history as append-only canonical data.
- Validate linked entity visibility.
- Do not expose private inbox or disciplinary notes as public history.
- Render summaries as safe text.
- Prevent client-side editing or deletion of canonical events.

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

1. History events are chronological and immutable.
2. Employment dates and outcomes are internally consistent.
3. Honours link to valid competitions and seasons.
4. Retirement remains visible without private data.
5. Filters do not alter history.
6. Exports obey visibility policy.
7. Keyboard timeline navigation is complete.
8. No proprietary historical text is required.

## 21. Recommended tests

- Appointment timeline.
- Multiple clubs.
- Unemployed period.
- Honours.
- Retired manager.
- Deleted historical club fallback.
- Export privacy.
- Large history list.

## 22. Condensed LLM implementation brief

```text
Implement Manager History as part of the global navigation and inbox
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

**Screen 31: Manager Profile**

## Suggested Git commit

```text
docs(game-ui): specify manager history screen
```
