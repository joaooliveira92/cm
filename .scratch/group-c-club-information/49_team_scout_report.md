# Screen 49: Team Scout Report

> **Clean-room notice:** This specification describes an original football-management simulation inspired by early-2000s management games. Use original text, visuals, and fictional or properly licensed data.

---

## 1. Purpose

Team Scout Report summarizes an opposition or target club using only knowledge available from assigned scouts and observed data, including squad strengths, weaknesses, likely shape, key players, form, set pieces, and confidence.

## 2. Primary user goals

- Open target squad and visible player profiles
- Review tactical and set-piece findings
- Compare current and previous reports
- Assign or renew a scouting assignment
- Open the upcoming fixture against the target

## 3. Navigation context

```text
Global Application Shell
  -> Club
  -> Team Scout Report
  -> Linked club, person, competition, fixture, or workflow
```

The screen preserves the viewed club independently from the manager's controlled club. Actions available for the controlled club may be read-only or absent when viewing another club.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| TEAM SCOUT REPORT: EXAMPLE CITY                                              |
| Scout: Jamie Observer | Updated: 11 February | Knowledge: Good                |
|------------------------------------------------------------------------------|
| Likely formation: 4-4-2        Recent form: W D L W W                         |
| Strengths: Wide attacks, aerial forwards                                      |
| Weaknesses: Space behind full-backs                                           |
| Key players: Alex Forward, Morgan Creator                                     |
| Set pieces: Strong attacking corners                                          |
|------------------------------------------------------------------------------|
| [Squad] [Tactical View] [Previous Reports] [Assign Scout]               [Back]|
+------------------------------------------------------------------------------+
```

The layout is conceptual and must use an original presentation system.

## 5. Core data model

```typescript
interface TeamScoutReportModel {
  readonly reportId: string;
  readonly targetClubId: string;
  readonly scoutId: string;
  readonly observedAt: string;
  readonly knowledgeConfidence: KnowledgeConfidence;
  readonly predictedFormation?: FormationPrediction;
  readonly strengths: readonly ScoutingFinding[];
  readonly weaknesses: readonly ScoutingFinding[];
  readonly keyPlayers: readonly ScoutedPlayerSummary[];
  readonly setPieceFindings: readonly ScoutingFinding[];
  readonly freshness: ReportFreshness;
}
```

Renderer-facing data must be immutable per revision, serializable, and validated at process or network boundaries.

## 6. Principal interactions

- Open target squad and visible player profiles
- Review tactical and set-piece findings
- Compare current and previous reports
- Assign or renew a scouting assignment
- Open the upcoming fixture against the target

## 7. View states

- `loading`
- `ready`
- `refreshing`
- `empty`
- `filtered_empty`
- `permission_limited`
- `unavailable`
- `error`

Asynchronous requests use request revisions and cancellation. Late responses from a prior club, filter, tab, or manager context must be discarded.

## 8. Permissions and knowledge

- Public club data is broadly visible.
- Private budgets, contracts, scouting, relationships, board confidence, and tactical information require explicit permission.
- The active manager and current career revision determine visibility.
- Client rendering state never grants access.
- Unknown information remains Unknown rather than being estimated from hidden values.

## 9. Sorting, filtering, and search

- Use stable entity IDs and deterministic tie-breakers.
- Filters change visibility only.
- Hidden selection remains selected with a notice.
- Search is locale-aware, debounced, bounded, and cancellable.
- Large lists are virtualized and preserve stable row identity.

## 10. Empty and error states

Distinguish no data, no filter matches, unavailable entity, permission denied, offline authority, stale revision, and operational failure. Preserve the last valid view during recoverable refresh failures.

## 11. Accessibility

- Use persistent headings and labels.
- Expose data lists as accessible grids or lists.
- Announce meaningful updates without reading every changed cell.
- Never communicate status by color alone.
- Restore focus after linked views and dialogs.
- Support keyboard-only use, reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.

## 12. Localization

- Localize labels, dates, times, numbers, currencies, units, statuses, and plural forms.
- Preserve stable IDs independently from display names.
- Apply locale-aware sorting and search.
- Preserve native scripts and person-name order.
- Use complete message templates rather than concatenated translated fragments.

## 13. Responsive behavior

- Wide layouts may use summary and detail columns.
- Narrow layouts stack filters, content, details, and actions.
- High scaling moves secondary metadata onto additional lines.
- Primary navigation and Back remain reachable.
- Ultrawide displays use readable maximum widths.

## 14. Performance

- Query compact read models instead of complete world graphs.
- Virtualize long player, staff, fixture, transfer, and history lists.
- Cancel stale requests and rate-limit live updates.
- Cache only permission-safe derived data using full revision fingerprints.
- Keep heavy sorting and aggregation outside the renderer.

## 15. Security and integrity

- Treat club, person, competition, user, and provider text as untrusted.
- Render labels as text or constrained structured content.
- Validate route parameters, stable IDs, filters, revisions, and actions in a trusted layer.
- Enforce permissions on the host or application service.
- Use expected revisions and idempotency keys for mutations.
- Store money with explicit currency and minor units.
- Sanitize exported and copied diagnostics.
- Reject events for inactive career, club, or manager contexts.

## 16. Screen-specific rules

- Reports must reflect scout knowledge, confidence, and freshness
- Predictions are uncertain and may be wrong
- Hidden exact attributes must not leak through prose or sorting
- A report becomes stale as squads, tactics, and injuries change

## 17. Persistence

Persist only safe view preferences, manager-scoped filters, column selections, and authorized drafts. Do not persist stale private read models, hover state, unvalidated actions, or plaintext secrets.

## 18. Observability

Record query duration, result category, revision conflicts, and safe error codes. Avoid recording private finances, scouting findings, notebook content, complete names, or hidden attributes in general telemetry.

## 19. Edge cases

- The club changes competition during a season transition.
- A selected player, staff member, fixture, or transfer becomes unavailable.
- The active manager changes while the screen is open.
- Viewer permissions change remotely.
- The career revision advances during refresh.
- A filter hides the selected row.
- The same mutation is submitted twice.
- The host disconnects or migrates.

## 20. Acceptance criteria

1. Reports must reflect scout knowledge, confidence, and freshness
2. Predictions are uncertain and may be wrong
3. Hidden exact attributes must not leak through prose or sorting
4. A report becomes stale as squads, tactics, and injuries change
5. The screen distinguishes loading, empty, permission-limited, unavailable, and failed states.
6. Navigation and actions use stable IDs and current revisions.
7. Keyboard and assistive-technology users can access all visible information and actions.
8. No proprietary source-game assets or copied wording are required.

## 21. Recommended tests

- Normal authorized view.
- Read-only view of another club.
- Permission-limited data.
- Stale asynchronous response.
- Deleted linked entity.
- Large virtualized result set.
- Keyboard navigation.
- Screen-reader semantics.
- High text scaling.
- Right-to-left layout.

## 22. Condensed LLM implementation brief

```text
Implement Team Scout Report for an original football-management simulation. Use stable
entity IDs, compact immutable revisioned read models, authoritative permission
and knowledge checks, cancellable asynchronous queries, deterministic sorting,
virtualized lists, safe navigation, and idempotent revision-bound mutations.
Preserve the active manager's privacy and never infer hidden information. Support
keyboard use, accessible list and grid semantics, visible focus, high text
scaling, localization, and right-to-left layouts. Treat all labels, IDs, money,
user content, links, and renderer commands as untrusted. Do not copy proprietary
artwork, exact wording, source code, logos, or databases.
```

## 23. Suggested Git commit

```text
docs(game-ui): specify team scout report screen
```
