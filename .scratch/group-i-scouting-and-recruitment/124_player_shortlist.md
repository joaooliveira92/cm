# Screen 124: Player Shortlist

> **Clean-room notice:** This specification describes an original football-management simulation inspired by early-2000s management games. Use original text, visuals, fictional people, and properly licensed data only.

---

## 1. Purpose

Player Shortlist stores manager-private or club-shared transfer candidates with priority, notes, scouting status, interest, valuation, availability, and follow-up actions.

## 2. Primary user goals

- Add, remove, rank, tag, and group shortlisted players
- Open player, report, agent, comparison, or transfer workflow
- Request updated scouting
- Add manager-private notes and reminders
- Archive completed or rejected targets

## 3. Navigation context

```text
Global Application Shell
  -> Scouting or Recruitment
  -> Player Shortlist
  -> Related person, club, report, shortlist, planner, or negotiation workflow
```

The screen preserves the active club, manager, recruitment period, source query, and navigation history.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Shortlisted players, priority, notes, report freshness, interest, value, tra |
|------------------------------------------------------------------------------|
| Recruitment-specific content, filters, confidence, status, warnings, actions |
|                                                                              |
| [Primary Views] [Context Actions] [Apply or Back]                             |
+------------------------------------------------------------------------------+
```

The layout is conceptual and must use an original presentation system.

## 5. Core data model

```typescript
interface PlayerShortlistModel {
  readonly clubId: string;
  readonly managerId: string;
  readonly recruitmentRevision: number;
  readonly knowledgeRevision: number;
  readonly issues: readonly RecruitmentIssue[];
  readonly permittedActions: readonly RecruitmentAction[];
}
```

Renderer-facing models must be immutable per revision, serializable, permission-aware, and validated at process or network boundaries.

## 6. Principal interactions

- Add, remove, rank, tag, and group shortlisted players
- Open player, report, agent, comparison, or transfer workflow
- Request updated scouting
- Add manager-private notes and reminders
- Archive completed or rejected targets

## 7. View and operation states

- `loading`
- `ready`
- `searching`
- `modified`
- `validating`
- `submitting`
- `completed`
- `conflicted`
- `knowledge_limited`
- `permission_limited`
- `failed`

Every asynchronous search, report, recommendation, comparison, and validation request must support cancellation and request revisions. Late responses from prior criteria, target, manager, or club contexts are discarded.

## 8. Scouting knowledge and uncertainty

- Ability, potential, value, wages, interest, availability, adaptation, and risk may be unknown or estimated.
- Every estimate carries scope, author or source, confidence, observation date, and freshness where relevant.
- Unknown values remain Unknown or a range. They do not become zero, false, or worst.
- Hidden exact values must not leak through sorting, colors, result counts, tooltips, exports, accessibility labels, or response timing.
- Knowledge is viewer, club, region, competition, and career-revision dependent.

## 9. Search and filtering

- Criteria use stable policy and field IDs.
- Search is locale-aware, bounded, debounced, cancellable, and paginated.
- Result counts respect permission and knowledge boundaries.
- Large result sets use cursor pagination or virtualization.
- Saved searches and filters remain manager-private unless explicitly shared.
- Stable tie-breakers prevent unexpected row movement.

## 10. Drafts and authoritative actions

- Assignments, focuses, meetings, planner scenarios, trials, and shortlist edits use revisioned drafts.
- Consequential commands include stable IDs, expected revisions, manager authority, and idempotency request IDs.
- Transfer offers, contracts, and employment require separate dedicated workflows.
- Recommendations never execute transfers or hiring automatically.
- Shared multiplayer edits use leases or optimistic conflict handling.

## 11. Automatic recommendations

- Recommendations are deterministic for one evidence and policy revision.
- They identify assumptions, confidence, positive evidence, concerns, and missing information.
- Previewable recommendations never submit automatically.
- Changed knowledge or budgets invalidate affected recommendations.
- The UI must not present a recommendation as objective certainty.

## 12. Validation and errors

Distinguish stale revision, unavailable target, insufficient knowledge, scout workload conflict, missing permission, expired transfer window, changed budget, invalid criteria, offline host, and operational failure. Preserve the last valid view or draft and offer Review Changes, Refresh, Retry, or Return.

## 13. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Expose search criteria, results, shortlists, comparisons, meetings, and assignments through accessible forms, grids, lists, and headings.
- Provide text for all confidence, freshness, recommendation, priority, and risk indicators.
- Do not announce every result while a large search streams.
- Provide non-map alternatives for geographic knowledge.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.

## 14. Localization requirements

- Localize positions, roles, criteria, regions, competitions, dates, money, statuses, confidence, and plural forms.
- Preserve stable person, club, role, report, assignment, focus, shortlist, and search IDs.
- Preserve structured personal names and native scripts.
- Use complete message templates rather than concatenated fragments.
- Geographic search and sorting must use localized labels without changing canonical IDs.

## 15. Responsive behavior

- Wide layouts may combine filters, result grid, details, and summary panels.
- Narrow layouts stack criteria, results, details, and actions.
- High scaling moves secondary metadata onto additional lines.
- Primary Search, Save, Assign, Compare, and Back actions remain reachable.
- Ultrawide displays use bounded working widths.

## 16. Performance requirements

- Query compact knowledge-filtered read models.
- Execute filtering, ranking, and recommendation outside the renderer.
- Virtualize large result, shortlist, report, and planner collections.
- Cancel stale requests and rate-limit result updates.
- Cache only data keyed by viewer, knowledge, criteria, policy, and career revisions.
- Avoid transporting complete player or staff world graphs.

## 17. Security and privacy requirements

- Treat names, notes, report prose, search aliases, agent data, imported criteria, and network payloads as untrusted.
- Render text safely and parse saved definitions through strict schemas.
- Validate every person, club, scout, region, role, criteria, and action ID.
- Enforce club, manager, and host authority in a trusted process or server.
- Never trust renderer-calculated knowledge, ranking, value, wage, interest, suitability, or recommendation.
- Sanitize exports and diagnostics.

## 18. Screen-specific rules

- Shortlist presence does not imply player consent or availability
- Private notes remain manager-scoped
- Visible values obey current knowledge and freshness
- Removing from shortlist does not delete scouting reports

## 19. Persistence rules

Persist explicit assignments, focuses, priorities, shortlists, saved searches, meeting outcomes, planner scenarios, trial drafts, notes, and manager-scoped view preferences according to policy. Do not persist stale recommendations, invalid criteria, hidden exact values, transient hover state, or private data in public scopes.

## 20. Observability

Record query duration, result-count bands, validation issue codes, conflict categories, and safe workflow outcomes. Avoid recording exact search criteria, shortlists, private notes, hidden values, agent communications, report prose, or person identities in general telemetry.

## 21. Edge cases

- A person changes club, contract, representation, or availability.
- A scout leaves, becomes overloaded, or loses regional access.
- The transfer window, budget, or squad need changes.
- Knowledge decays or a report becomes stale.
- Another manager edits a shared priority or shortlist.
- A result disappears after permission changes.
- The same command is submitted twice.
- The host disconnects or migrates.

## 22. Acceptance criteria

1. Shortlist presence does not imply player consent or availability
2. Private notes remain manager-scoped
3. Visible values obey current knowledge and freshness
4. Removing from shortlist does not delete scouting reports
5. The view is bound to one club, manager, knowledge revision, and recruitment revision.
6. Loading, searching, knowledge-limited, permission-limited, conflicted, and completed states are distinct.
7. All consequential commands are revision-bound and idempotent.
8. Keyboard and assistive-technology users can complete every supported task.
9. No proprietary source-game assets, wording, likenesses, personal data, or database records are required.

## 23. Recommended tests

- Normal authorized workflow.
- Limited or stale scouting knowledge.
- Target changes club or contract.
- Scout workload conflict.
- Search cancellation and stale results.
- Deterministic recommendation.
- Duplicate command.
- Multiplayer concurrent edit.
- Keyboard and screen-reader flow.
- High text scaling and right-to-left layout.

## 24. Condensed LLM implementation brief

```text
Implement Player Shortlist for an original football-management simulation. Use stable
club, manager, person, scout, region, report, assignment, focus, shortlist,
search, planner, and trial IDs; immutable revisioned read models and drafts;
explicit scouting knowledge, confidence, source, and freshness; cancellable
paginated searches; authoritative permission and workload validation;
explainable deterministic recommendations; and idempotent revision-bound
commands. Never infer or leak hidden exact attributes, potential, values, wages,
interest, or suitability. Support keyboard operation, accessible criteria and
result grids, non-map alternatives, visible focus, high text scaling,
localization, and right-to-left layouts. Treat names, notes, reports, criteria,
agent data, IDs, and network payloads as untrusted. Do not copy proprietary
artwork, exact wording, source code, logos, likenesses, personal data, or
databases.
```

## Suggested Git commit

```text
docs(game-ui): specify player shortlist screen
```
