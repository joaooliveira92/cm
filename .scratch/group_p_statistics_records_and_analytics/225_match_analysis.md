# Screen 225: Match Analysis

> **Clean-room notice:** Use original content, fictional entities, and properly licensed data only.

---

## 1. Purpose

Match Analysis provides an event-backed review of a fixture, including phases, shots, chances, possession, territory, passing, pressing, set pieces, substitutions, incidents, and tactical turning points.

## 2. Primary user goals

- Navigate match periods and event categories
- Open supporting events and player actions
- Compare both teams by phase
- Create private annotations and follow-up actions

## 3. Navigation context

```text
Global Application Shell
  -> Analytics, Statistics, Records, or Report
  -> Match Analysis
  -> Supporting entity, match, event, definition, or workflow
```

The screen preserves the active viewer, entity scope, period, competition, data-coverage revision, and navigation history.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Match Analysis                                                               |
|------------------------------------------------------------------------------|
| Scope controls, metrics, definitions, coverage, insights, and actions         |
|                                                                              |
| [Filters] [Compare] [Save Report] [Export] [Back]                             |
+------------------------------------------------------------------------------+
```

The presentation is original and provides textual equivalents for every visualization.

## 5. Core data model

```typescript
interface AnalyticsWorkspaceModel {
  readonly workspaceId: string;
  readonly viewerId: string;
  readonly entityScope: AnalyticsEntityScope;
  readonly period: AnalyticsPeriod;
  readonly metricDefinitionVersion: string;
  readonly coverage: AnalyticsCoverage;
  readonly dataRevision: number;
  readonly issues: readonly AnalyticsIssue[];
  readonly permittedActions: readonly AnalyticsAction[];
}
```

Read models are immutable per revision, serializable, permission-filtered, and validated at process or network boundaries.

## 6. Principal interactions

- Navigate match periods and event categories
- Open supporting events and player actions
- Compare both teams by phase
- Create private annotations and follow-up actions

## 7. View states

- `loading`
- `ready`
- `querying`
- `partial_coverage`
- `empty`
- `filtered_empty`
- `stale`
- `permission_limited`
- `exporting`
- `failed`

Queries and exports are cancellable and revision-aware. Late results from prior scopes, filters, reports, or viewers are discarded.

## 8. Metric definitions and coverage

- Every metric has a stable ID, version, label, unit, numerator, denominator, eligibility rule, and coverage description.
- Unsupported metrics remain unavailable.
- Missing values are distinct from zero.
- Rounding must not create contradictory totals.
- Changes to a metric definition prevent silent comparison with incompatible history.

## 9. Statistical interpretation

- Analytical results are descriptive or model-based estimates, not guarantees.
- Correlation is not presented as causation.
- Sample size, uncertainty, model version, and material exclusions are shown where relevant.
- Rankings and recommendations identify assumptions and tie-breakers.
- Synthetic data is prohibited unless explicitly requested and clearly labeled.

## 10. Knowledge, privacy, and permissions

- Player attributes, potential, health, happiness, contracts, finances, tactics, and scouting estimates obey viewer permissions.
- Hidden values cannot leak through rank, color, chart scale, tooltip, export, accessibility label, or response timing.
- Manager-private annotations and reports remain private unless explicitly shared.
- Execution-time permissions are rechecked for scheduled reports.

## 11. Query, comparison, and report definitions

- Queries use approved dimensions, measures, operators, and named premise profiles.
- Comparisons require compatible units, periods, definitions, and coverage.
- Saved reports are versioned, schema-validated, and owner-scoped.
- No arbitrary SQL, scripts, formulas, or executable content are accepted.
- Large queries use bounded pagination and resource limits.

## 12. Authoritative calculations

- Aggregation, normalization, ranking, model inference, record detection, and export generation run outside the renderer.
- The renderer submits typed definitions and displays trusted results.
- Commands include stable IDs, expected revisions, authority, and idempotency keys.
- Repeated requests with the same key return the original result.
- Official records and competition outcomes remain owned by their canonical services.

## 13. Accessibility

- Support complete keyboard operation and visible focus.
- Expose every visualization through an accessible data table or structured summary.
- Associate metric definitions, uncertainty, and coverage with the displayed value.
- Never communicate trend, rank, risk, or variance by color alone.
- Offer reduced animation and controlled live-update verbosity.
- Support high contrast, 200 percent text scaling, and right-to-left layouts.

## 14. Localization

- Localize metric labels, dates, periods, numbers, percentages, money, units, ranks, and plural forms.
- Preserve stable entity, metric, model, query, report, schedule, and export IDs.
- Apply locale-aware sorting while preserving canonical order fields.
- Use complete message templates rather than concatenated fragments.
- Chart and table direction must preserve semantic axes in RTL layouts.

## 15. Responsive behavior

- Wide layouts may combine filters, visualizations, table, definitions, and insights.
- Narrow layouts stack scope, summary, visualization alternative, table, and actions.
- Large tables support horizontal disclosure without trapping keyboard focus.
- Primary Query, Compare, Save, Export, Schedule, and Back actions remain reachable.
- Ultrawide displays use bounded analytical widths.

## 16. Performance

- Execute heavy aggregation and modeling in worker, host, or service layers.
- Virtualize large tables and histories.
- Stream bounded result pages and compact chart series.
- Cancel stale queries and export requests.
- Cache only permission-safe results keyed by definition, scope, viewer, and data revisions.
- Enforce time, row, memory, and export-size limits.

## 17. Security and integrity

- Treat report names, annotations, filter values, labels, and imported definitions as untrusted.
- Validate every entity, metric, query, report, schedule, and destination ID.
- Sanitize spreadsheet cells and delimited exports against formula injection.
- Enforce permission and retention policy in trusted services.
- Never trust renderer-calculated metrics, records, rankings, projections, or access decisions.
- Exclude secrets and sensitive diagnostics from exports and telemetry.

## 18. Screen-specific rules

- All analysis derives from the committed match-event stream
- Turning points are interpretations, not alternate outcomes
- Coordinate precision matches the simulation model
- Every visual has a textual equivalent

## 19. Persistence

Persist versioned saved reports, approved schedules, private annotations, export audit references, and manager-scoped view preferences. Canonical statistics and records remain derived from authoritative events. Do not persist stale query results as canonical state.

## 20. Observability

Record query duration, metric IDs, result-size bands, coverage categories, cancellation, cache status, and safe failure codes. Avoid recording complete player lists, private finances, health details, hidden values, annotations, or exported content.

## 21. Edge cases

- A source match, transfer, contract, or correction changes during analysis.
- Metric definitions change between periods.
- Permissions change before a scheduled report runs.
- A large query exceeds resource limits.
- An entity is renamed, merged, retired, or removed by audited correction.
- An export destination becomes unavailable.
- The same request is submitted twice.
- The host disconnects or migrates.

## 22. Acceptance criteria

1. All analysis derives from the committed match-event stream
2. Turning points are interpretations, not alternate outcomes
3. Coordinate precision matches the simulation model
4. Every visual has a textual equivalent
5. The view is bound to explicit metric-definition, coverage, viewer, scope, and data revisions.
6. Missing, zero, partial-coverage, stale, permission-limited, and failed states remain distinct.
7. All aggregation, modeling, ranking, record detection, and exports run in trusted layers.
8. Keyboard and assistive-technology users can access every metric, definition, visualization, and action.
9. No proprietary source-game assets, wording, likenesses, or database records are required.

## 23. Recommended tests

- Normal full-coverage query.
- Partial and results-only coverage.
- Missing value versus zero.
- Metric definition changes between periods.
- Permission loss during query or export.
- Large query resource limit.
- Duplicate request.
- Source correction during analysis.
- Keyboard and screen-reader flow.
- High scaling and right-to-left layout.

## 24. Condensed LLM implementation brief

```text
Implement Match Analysis for an original football-management simulation. Use stable
workspace, entity, metric, model, query, report, schedule, export, match, player,
team, competition, and period IDs; immutable revisioned read models; versioned
metric definitions; explicit units, denominators, uncertainty, and coverage;
authoritative aggregation and modeling outside the renderer; bounded cancellable
queries; accessible visualization alternatives; permission-safe exports; and
idempotent revision-bound commands. Do not fabricate missing values, confuse
correlation with causation, or trust renderer-calculated metrics, rankings,
records, projections, or permissions. Treat names, filters, annotations, report
definitions, destinations, IDs, and network payloads as untrusted. Do not copy
proprietary artwork, exact wording, source code, logos, likenesses, or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify match analysis screen
```
