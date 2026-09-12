# Screen 267: Recent Items and Navigation History

> **Clean-room notice:** Use original content, fictional identities, and properly licensed data only.

---

## 1. Purpose

Recent Items and Navigation History provides manager-scoped access to recently visited entities, screens, searches, reports, and workflows.

## 2. Primary user goals

- Reopen a recent item
- Filter history by type and period
- Remove individual local entries or clear eligible history
- Pin an item before it expires

## 3. Navigation context

```text
Global Application Shell
  -> Search, Utilities, Help, or Reference
  -> Recent Items and Navigation History
  -> Related entity, view, definition, or workflow
```

The screen preserves the active manager, viewer permissions, source context, utility revision, and navigation history.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Recent Items and Navigation History                                            |
|------------------------------------------------------------------------------|
| Query or reference context, content, validation, status, and actions           |
|                                                                              |
| [Search or Filter] [Open] [Save or Export] [Back]                              |
+------------------------------------------------------------------------------+
```

The presentation must be original, keyboard-first, responsive, and permission-aware.

## 5. Core data model

```typescript
interface UtilityReferenceModel {
  readonly viewerId: string;
  readonly managerId?: string;
  readonly sourceContextId?: string;
  readonly utilityRevision: number;
  readonly permissionsRevision: number;
  readonly issues: readonly UtilityIssue[];
  readonly permittedActions: readonly UtilityAction[];
}
```

Renderer-facing models are immutable, serializable, permission-filtered, and schema-validated.

## 6. Principal interactions

- Reopen a recent item
- Filter history by type and period
- Remove individual local entries or clear eligible history
- Pin an item before it expires

## 7. View and operation states

- `idle`
- `querying`
- `ready`
- `modified`
- `validating`
- `saving`
- `importing`
- `exporting`
- `completed`
- `empty`
- `permission_limited`
- `cancelled`
- `failed`

Late results from prior queries, viewers, contexts, or revisions are discarded.

## 8. Search and reference integrity

- Search, help, glossary, and reference content use stable typed IDs.
- Missing, unknown, inaccessible, and empty values remain distinct.
- Results and references never grant domain authority.
- Hidden information does not leak through counts, ranking, previews, timing, or exports.
- Definitions identify their version, owner, and effective scope.

## 9. Saved preferences and manager privacy

- Recents, favorites, saved views, reminders, onboarding state, and private notes are manager-scoped.
- Hot-seat participants cannot inspect another manager's utility history.
- Presentation settings do not mutate canonical career state.
- Stale references degrade to safe unavailable entries.
- Clearing local history does not delete authoritative records.

## 10. Import, export, and sharing boundaries

- Imports accept only registered formats and strict versioned schemas.
- Parsing, validation, migration, and export generation run outside the renderer.
- Arbitrary code, markup execution, SQL, formulas, macros, and filesystem paths are rejected.
- Sharing transfers a definition or reference, not access rights.
- Exports are sanitized for the selected format and current permissions.

## 11. Commands and quick actions

- Commands are registered, typed, context-bound, and authority-filtered.
- Destructive or consequential actions retain their owning workflow and confirmation strength.
- Disabled commands expose accessible reasons.
- Commands include stable IDs, expected revisions, and idempotency keys where consequential.
- Shortcut invocation and pointer invocation produce equivalent outcomes.

## 12. Validation and recovery

Distinguish invalid query, unsupported field, stale saved view, missing target, permission loss, incompatible import, unsafe content, export failure, unavailable destination, and operational error. Preserve valid definitions and offer Review, Repair, Retry, Cancel, Reset, or Return.

## 13. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Expose search results, criteria, shortcuts, help steps, definitions, reminders, and operations through accessible forms, lists, grids, headings, and status regions.
- Provide non-drag alternatives for ordering and grouping.
- Announce result counts and progress without excessive repetition.
- Never communicate status, priority, compatibility, or permission by color alone.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.

## 14. Localization requirements

- Localize labels, operators, definitions, shortcuts, statuses, dates, times, units, and plural forms.
- Preserve stable entity, query, view, command, term, reminder, operation, and manifest IDs.
- Preserve structured names and native scripts.
- Use complete message templates rather than concatenated fragments.
- Search remains locale-aware while navigation uses stable identity.

## 15. Responsive behavior

- Wide layouts may combine query, results, preview, and reference panels.
- Narrow layouts stack controls, content, status, and actions.
- Tables may transform into accessible cards.
- Long definitions and validation messages wrap safely.
- Primary Search, Apply, Save, Import, Export, Open, and Back actions remain reachable.

## 16. Performance requirements

- Debounce and cancel search, preview, help, and validation requests.
- Virtualize long result, recent, favorite, notification, and definition lists.
- Use bounded queries, pagination, and result-size limits.
- Cache only permission-safe content keyed by viewer, locale, schema, and revision.
- Execute import and export work in trusted workers or services.
- Avoid loading complete world datasets into the renderer.

## 17. Security and privacy requirements

- Treat queries, names, notes, labels, filenames, imported content, and network payloads as untrusted.
- Validate every entity, query, view, command, term, reminder, operation, and content-pack ID.
- Enforce permissions in trusted services.
- Prevent path traversal, archive bombs, formula injection, prototype pollution, and executable markup.
- Never log secrets, private notes, raw imported payloads, or personal identifiers.
- Sanitize exports and diagnostics.

## 18. Screen-specific rules

- Navigation history is not canonical career history
- Private hot-seat histories remain separated
- Clearing history does not delete game records
- Stale links fail safely

## 19. Persistence rules

Persist manager-scoped recents, favorites, saved views, reminders, onboarding state, and approved utility preferences according to retention policy. Persist import and export audit references, not secrets or unsafe payloads. Canonical domain data remains owned by its authoritative service.

## 20. Observability

Record operation category, duration, result-size band, cancellation, validation codes, and safe outcome. Avoid recording query text, private notes, entity identities, reminder content, filenames, imported data, or exported content in general telemetry.

## 21. Edge cases

- Permissions change while results or previews are visible.
- An entity is renamed, merged, deleted, or becomes inaccessible.
- A saved definition references a removed field.
- Locale or rules version changes while help is open.
- An import is interrupted or contains excessive expansion.
- An export destination becomes unavailable.
- The same operation is submitted twice.
- A hot-seat manager switch occurs while a utility panel is open.

## 22. Acceptance criteria

1. Navigation history is not canonical career history
2. Private hot-seat histories remain separated
3. Clearing history does not delete game records
4. Stale links fail safely
5. The view is bound to explicit viewer, permission, source-context, schema, and utility revisions.
6. Unknown, empty, inaccessible, stale, cancelled, completed, and failed states remain distinct.
7. Search, imports, exports, compatibility, and permissions are processed in trusted layers.
8. Keyboard and assistive-technology users can complete every supported task.
9. No proprietary source-game assets, wording, likenesses, secrets, or database records are required.

## 23. Recommended tests

- Normal search, preview, and navigation flow.
- Permission loss during query or preview.
- Stale saved view after schema migration.
- Missing favorite or recent target.
- Keyboard-only command palette and shortcut conflict.
- Malicious or incompatible import.
- Spreadsheet formula-injection export value.
- Duplicate operation.
- Hot-seat manager switch.
- High scaling and right-to-left layout.

## 24. Condensed LLM implementation brief

```text
Implement Recent Items and Navigation History for an original football-management simulation. Use stable
viewer, manager, entity, query, criterion, saved-view, command, shortcut, term,
reminder, operation, and manifest IDs; immutable permission-filtered read models;
bounded cancellable search; typed registered commands; manager-private recents,
favorites, views, and reminders; versioned help and definitions; trusted isolated
import and export processing; safe format sanitization; and idempotent revision-
bound operations. Never expose hidden information through results, counts,
previews, timing, accessibility labels, or exports. Do not accept arbitrary code,
SQL, formulas, macros, executable markup, or paths. Support keyboard operation,
accessible results and definitions, visible focus, high text scaling,
localization, and right-to-left layouts. Do not copy proprietary assets, exact
wording, source code, logos, likenesses, or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify recent items and navigation history screen
```
