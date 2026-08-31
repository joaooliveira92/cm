# Screen 31: Manager Profile

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. Use original interface text, visual design, and fictional or properly licensed data.

---

## 1. Purpose

The Manager Profile screen is the canonical read view of an active or retired manager’s identity, employment, reputation, background, capabilities, career record, languages, relationships, and public history.

## 2. Primary user goals

- Review identity and current employment.
- Review background, qualifications, archetype, and derived capability summaries.
- Review reputation and familiarity.
- Review career record, honours, and history.
- Open current club, contract, and related entities.
- Access authorized actions such as notebook, ownership, resignation, or retirement.

## 3. Position in the navigation model

```text
Global Application Shell
  -> Manager Profile
  -> Related entity or workflow
  -> Return to prior safe screen
```

The screen must preserve the active manager, career revision, navigation history, and permission context.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| JOAO MONTEIRO                                                             JM |
| Manager of North United                              Reputation: National    |
|------------------------------------------------------------------------------|
| [Overview] [Career Record] [History] [Relationships] [Contract]              |
|------------------------------------------------------------------------------|
| Nationality: Example Federation                                              |
| Languages: Example Portuguese, International English                         |
| Qualification: Intermediate                                                  |
| Archetype: Balanced                                                          |
|                                                                              |
| Career record                                                                |
| Matches 58 | Wins 29 | Draws 14 | Losses 15                                  |
|                                                                              |
| Current employment                                                           |
| North United | Contract to June 2007 | Board confidence: Stable              |
|------------------------------------------------------------------------------|
| [Open Club] [Notebook] [Manager Status] [Actions]                     [Back] |
+------------------------------------------------------------------------------+
```

The diagram defines information hierarchy and behavior rather than exact pixel placement.

## 5. Information architecture

The interface should use persistent headings, clearly labeled controls, a predictable content region, and an explicit status area. Data-heavy lists must support stable sorting, keyboard traversal, and virtualized rendering where necessary.

## 6. Core data model

```typescript
interface ManagerProfileViewModel {
  readonly managerId: string;
  readonly revision: number;
  readonly identity: PublicManagerIdentity;
  readonly employment: ManagerEmploymentSummary;
  readonly background: ManagerBackgroundSummary;
  readonly communication: ManagerCommunicationSummary;
  readonly reputation: ManagerReputationSummary;
  readonly careerRecord: ManagerCareerRecord;
  readonly honours: readonly ManagerHonourSummary[];
  readonly relationships?: readonly VisibleRelationshipSummary[];
  readonly permittedActions: readonly ManagerProfileAction[];
}
```

Renderer-facing models must be serializable, immutable per revision, and validated at the process or network boundary.

## 7. Principal interactions

- Select profile tabs.
- Open club, competition, contract, or history.
- Open the manager notebook when owned.
- Open Manager Status.
- Open permitted lifecycle actions.
- Compare public and private views according to viewer permission.

## 8. Screen and operation states

- `loading`
- `ready`
- `retired`
- `unemployed`
- `permission_limited`
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

- Calculate private and public profile views in the trusted layer.
- Do not expose hidden low-level attributes beyond policy.
- Protect relationships, notes, inbox, and ownership details.
- Render portraits and names safely.
- Validate all lifecycle action permissions authoritatively.

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

1. Identity and employment are current and unambiguous.
2. Retired and unemployed states are explicit.
3. Background allocation matches canonical policy data.
4. Career statistics are consistent with history.
5. Private tabs and actions obey viewer permission.
6. Entity links use stable IDs.
7. Keyboard and screen-reader navigation is complete.
8. No proprietary profile artwork is required.

## 21. Recommended tests

- Active manager.
- Unemployed manager.
- Retired manager.
- Permission-limited viewer.
- Relationship privacy.
- Contract link.
- Live employment update.
- Portrait fallback.

## 22. Condensed LLM implementation brief

```text
Implement Manager Profile as part of the global navigation and inbox
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

**Screen 32: Manager Chat and Multiplayer Communication**

## Suggested Git commit

```text
docs(game-ui): specify manager profile screen
```
