# Screen 26: News Filters

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. Use original interface text, visual design, and fictional or properly licensed data.

---

## 1. Purpose

The News Filters screen or drawer builds reusable manager-scoped inbox queries without mutating messages or losing hidden selections.

## 2. Primary user goals

- Filter by unread, flagged, archived, and action state.
- Filter by category, sender type, club, nation, competition, and date range.
- Save named filter presets.
- Preview result counts.
- Reset to inbox defaults.
- Apply filters while preserving a clear indication that results are restricted.

## 3. Position in the navigation model

```text
Global Application Shell
  -> News Filters
  -> Related entity or workflow
  -> Return to prior safe screen
```

The screen must preserve the active manager, career revision, navigation history, and permission context.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| FILTER NEWS                                                                  |
|------------------------------------------------------------------------------|
| State        [x] Unread [ ] Read [ ] Archived                                |
| Action       [x] Required [x] Optional [ ] Completed [ ] Expired             |
| Categories   [Transfers] [Contracts] [Matches] [Board]                       |
| Date range   [Last 30 days v]                                                |
| Club         [Current club v]                                                |
| Priority     [All v]                                                         |
|                                                                              |
| Matching messages: 23                                                        |
|                                                                              |
| [Reset] [Save Preset] [Cancel]                                [Apply Filter] |
+------------------------------------------------------------------------------+
```

The diagram defines information hierarchy and behavior rather than exact pixel placement.

## 5. Information architecture

The interface should use persistent headings, clearly labeled controls, a predictable content region, and an explicit status area. Data-heavy lists must support stable sorting, keyboard traversal, and virtualized rendering where necessary.

## 6. Core data model

```typescript
interface NewsFilterDefinition {
  readonly filterId?: string;
  readonly managerId: string;
  readonly displayName?: string;
  readonly states: readonly string[];
  readonly actionStates: readonly string[];
  readonly categoryIds: readonly string[];
  readonly senderTypeIds: readonly string[];
  readonly entityCriteria: readonly EntityFilterCriterion[];
  readonly dateRange: DateRangeCriterion;
  readonly priorityIds: readonly string[];
  readonly revision: number;
}
```

Renderer-facing models must be serializable, immutable per revision, and validated at the process or network boundary.

## 7. Principal interactions

- Edit filter criteria.
- Request a debounced matching-count preview.
- Apply without modifying messages.
- Save, rename, duplicate, or delete a personal preset.
- Reset to policy defaults.
- Clear active filters from the inbox.

## 8. Screen and operation states

- `ready`
- `modified`
- `counting`
- `invalid`
- `saving_preset`
- `conflicted`
- `applying`

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

- Validate preset names and criteria in a trusted layer.
- Scope presets to the manager or account according to policy.
- Never expose hidden entity names through result-count side channels.
- Bound criterion counts and date ranges.
- Render saved names as untrusted text.

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

1. Filters affect visibility only.
2. Hidden selected messages are not modified.
3. Matching counts are revision-aware.
4. Saved presets retain stable criteria IDs.
5. Invalid entities are reported and removable.
6. Reset restores named defaults.
7. Manager privacy is preserved.
8. Keyboard and screen-reader operation is complete.

## 21. Recommended tests

- State filters.
- Date range.
- Entity criteria.
- Preset save and rename.
- Stale count result.
- Deleted competition criterion.
- Reset.
- Right-to-left layout.

## 22. Condensed LLM implementation brief

```text
Implement News Filters as part of the global navigation and inbox
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

**Screen 27: Background Processing and Updating Game**

## Suggested Git commit

```text
docs(game-ui): specify news filters screen
```
