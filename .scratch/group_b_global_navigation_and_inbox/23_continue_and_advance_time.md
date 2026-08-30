# Screen 23: Continue and Advance Time

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. Use original interface text, visual design, and fictional or properly licensed data.

---

## 1. Purpose

The Continue and Advance Time control moves the career simulation from its current safe boundary to the next required decision, scheduled stop, fixture, or user-selected date.

## 2. Primary user goals

- Advance time without skipping mandatory decisions.
- Understand why processing stopped.
- Choose a valid future stop date when direct advancement is supported.
- Cancel long processing at a safe boundary.
- Coordinate advancement across multiplayer participants.
- Open blocking inbox items or incomplete submissions.

## 3. Position in the navigation model

```text
Global Application Shell
  -> Continue and Advance Time
  -> Related entity or workflow
  -> Return to prior safe screen
```

The screen must preserve the active manager, career revision, navigation history, and permission context.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| ADVANCE TIME                                                                 |
|------------------------------------------------------------------------------|
| Current date: 12 February 2005                                               |
| Next mandatory event: League match, 15 February                              |
| Stop at: [Next required decision v]                                          |
|                                                                              |
| Blocking items                                                               |
| [!] Submit team registration by 13 February                                  |
| [!] Respond to contract offer                                                |
|                                                                              |
| [Cancel] [Resolve Blocking Items]                             [Advance Time] |
+------------------------------------------------------------------------------+
```

The diagram defines information hierarchy and behavior rather than exact pixel placement.

## 5. Information architecture

The interface should use persistent headings, clearly labeled controls, a predictable content region, and an explicit status area. Data-heavy lists must support stable sorting, keyboard traversal, and virtualized rendering where necessary.

## 6. Core data model

```typescript
interface AdvanceTimeRequest {
  readonly careerId: string;
  readonly managerId: string;
  readonly expectedCareerRevision: number;
  readonly stopPolicy: AdvanceStopPolicy;
  readonly targetDate?: string;
  readonly submittedDecisionRevisions: readonly number[];
  readonly requestId: string;
  readonly signal: AbortSignal;
}
```

Renderer-facing models must be serializable, immutable per revision, and validated at the process or network boundary.

## 7. Principal interactions

- Click Continue for the next policy-defined stop.
- Open blocking decisions.
- Choose a future date when permitted.
- Observe processing stages and date progression.
- Request cancellation before the next canonical boundary.
- Mark ready or withdraw readiness in multiplayer.

## 8. Screen and operation states

- `ready`
- `blocked`
- `waiting_for_participants`
- `queued`
- `processing`
- `cancellation_requested`
- `stopped_for_event`
- `failed`

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

- Advance only from an authoritative canonical revision.
- Validate target dates and stop policies.
- Do not trust client readiness or submitted-decision claims.
- Use isolated deterministic simulation streams.
- Prevent duplicate advancement through idempotency keys and processing locks.

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

1. Mandatory decisions cannot be skipped.
2. Every stop has an explainable reason.
3. Target dates are valid and in the future.
4. Cancellation occurs only at safe boundaries.
5. Multiplayer advancement respects ready and host policies.
6. Duplicate requests cannot advance twice.
7. Processing progress remains accessible.
8. No proprietary wording is required.

## 21. Recommended tests

- Blocked decision.
- Advance to next fixture.
- Advance to explicit date.
- Safe cancellation.
- Duplicate request.
- Multiplayer readiness.
- Host disconnect.
- Deterministic replay.

## 22. Condensed LLM implementation brief

```text
Implement Continue and Advance Time as part of the global navigation and inbox
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

**Screen 24: News Inbox**

## Suggested Git commit

```text
docs(game-ui): specify continue and advance time workflow
```
