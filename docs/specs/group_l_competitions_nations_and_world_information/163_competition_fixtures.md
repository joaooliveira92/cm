# Screen 163: Competition Fixtures

> **Clean-room notice:** This specification describes an original football-management simulation inspired by early-2000s management games. Use original text, visuals, fictional entities, and properly licensed data only.

---

## 1. Purpose

Competition Fixtures lists scheduled, provisional, postponed, cancelled, and completed matches for the selected competition edition and stage.

## 2. Primary user goals

- Filter by date, round, stage, club, venue, and status
- Open match preview, report, club, or venue
- Navigate calendar periods
- Export a safe fixture list

## 3. Navigation context

```text
Global Application Shell
  -> World, Nation, Competition, or National Team
  -> Competition Fixtures
  -> Related club, person, fixture, table, rule, ranking, or history view
```

The screen preserves the selected edition, season, stage, group, nation, team, and source navigation context.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Dates, rounds, clubs, venues, status, broadcast context and preparation link |
|------------------------------------------------------------------------------|
| Structured world information, scope controls, status, links, and actions      |
|                                                                              |
| [Primary Views] [Filters] [Related Entity] [Back]                             |
+------------------------------------------------------------------------------+
```

The layout is conceptual and must use an original presentation system.

## 5. Core data model

```typescript
interface CompetitionFixturesModel {
  readonly careerId: string;
  readonly editionId?: string;
  readonly seasonId?: string;
  readonly stageId?: string;
  readonly worldRevision: number;
  readonly rulesRevision?: number;
  readonly issues: readonly WorldInformationIssue[];
  readonly permittedActions: readonly WorldInformationAction[];
}
```

Renderer-facing models must be immutable per revision, serializable, scope-aware, and validated at process or network boundaries.

## 6. Principal interactions

- Filter by date, round, stage, club, venue, and status
- Open match preview, report, club, or venue
- Navigate calendar periods
- Export a safe fixture list

## 7. View states

- `loading`
- `ready`
- `refreshing`
- `empty`
- `filtered_empty`
- `partial_coverage`
- `historical`
- `permission_limited`
- `unavailable`
- `failed`

Asynchronous requests must support cancellation and request revisions. Late responses from another season, edition, stage, nation, competition, or team context are discarded.

## 8. Edition, season, stage, and scope

- Competition identity, edition, season, stage, group, and round are distinct identifiers.
- Historical views remain bound to their original rules and participants.
- Current and historical entity labels are preserved separately.
- Changing scope creates a new read request without mutating career state.
- Unsupported combinations are unavailable rather than silently substituted.

## 9. Rules and authoritative calculations

- Tables, qualification, draws, rankings, records, awards, and progression are calculated in trusted services.
- The renderer never decides official rank, tie-breaks, qualification, eligibility, draw outcomes, or record holders.
- Rules are versioned by edition and effective date.
- Corrected outcomes preserve audit history.
- Every derived metric exposes definition and coverage.

## 10. Simulation-detail coverage

- Full, standard, results-only, and essential competition detail may expose different data.
- Missing detail is not fabricated.
- Aggregate statistics identify included matches and exclusions.
- Historical database gaps remain explicit.
- Coverage must not be confused with manager permission or scouting knowledge.

## 11. Search, sorting, and filtering

- Use stable IDs and deterministic tie-breakers.
- Search is locale-aware, bounded, debounced, and cancellable.
- Filters change visibility only.
- Official ranking remains separate from user-sorted display order.
- Long tables and histories are virtualized or cursor-paginated.

## 12. Validation and errors

Distinguish unknown edition, stale world revision, unavailable stage, incomplete draw, unsupported statistic, historical coverage gap, permission loss, offline host, and operational failure. Preserve the last valid view during recoverable refresh errors.

## 13. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Expose tables, brackets, stage graphs, rankings, awards, and histories through accessible grids, lists, and headings.
- Provide textual equivalents for brackets, maps, charts, qualification zones, and movement indicators.
- Never communicate standings, qualification, form, or ranking movement by color alone.
- Announce meaningful scope changes and result counts politely.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.

## 14. Localization requirements

- Localize competition, round, stage, national-team, date, time, number, score, ranking, and status labels.
- Preserve stable nation, competition, edition, stage, club, team, fixture, person, and record IDs.
- Preserve structured names and native scripts.
- Use complete message templates rather than concatenated fragments.
- Home-away score order and bracket progression remain semantically correct in RTL layouts.

## 15. Responsive behavior

- Wide layouts may combine navigation, summaries, grids, brackets, and details.
- Narrow layouts stack scope controls, content, details, and actions.
- Tables may transform into accessible cards.
- Brackets and graphs require list-based alternatives on small screens.
- Ultrawide displays use bounded working widths.

## 16. Performance requirements

- Query compact edition-scoped read models rather than complete world graphs.
- Virtualize long tables, fixtures, histories, records, and rankings.
- Cancel stale queries and rate-limit live result updates.
- Keep table, statistic, ranking, draw, award, and qualification calculations outside the renderer.
- Cache only data keyed by edition, stage, rules, coverage, and world revisions.

## 17. Security and integrity requirements

- Treat names, historical text, rule labels, media, and network payloads as untrusted.
- Render text safely through constrained structures.
- Validate every nation, competition, edition, stage, team, fixture, record, and action ID.
- Enforce permissions in a trusted process or server.
- Never trust renderer-calculated ranks, scores, qualification, records, awards, eligibility, or draw results.
- Sanitize exports and diagnostics.

## 18. Screen-specific rules

- Provisional and confirmed dates are distinct
- Kickoff timezone presentation does not alter canonical time
- Round and stage membership are authoritative
- Postponed fixtures preserve their scheduling history

## 19. Persistence rules

Persist canonical competition editions, rules, participants, fixtures, results, standings, draws, qualifications, awards, records, rankings, national-team selections, and audited corrections through authoritative transactions. Persist only manager-scoped view preferences for filters and followed entities. Do not persist stale read models or renderer calculations.

## 20. Observability

Record query duration, scope, coverage category, stale-result rejection, and safe failure codes. Avoid recording complete lineups, private tactics, manager identities, or copyrighted media in general telemetry.

## 21. Edge cases

- A season transitions while the screen is open.
- A match result, deduction, draw, or qualification changes remotely.
- A competition format changes between editions.
- A club or nation is renamed or becomes historical.
- A selected stage has no fixtures yet.
- Rankings update after a new snapshot.
- The same result event arrives twice.
- The host disconnects or migrates.

## 22. Acceptance criteria

1. Provisional and confirmed dates are distinct
2. Kickoff timezone presentation does not alter canonical time
3. Round and stage membership are authoritative
4. Postponed fixtures preserve their scheduling history
5. The view is bound to explicit edition, season, stage, coverage, and world revisions.
6. Current, historical, partial-coverage, unavailable, and failed states remain distinct.
7. Official outcomes and calculations are produced only by trusted services.
8. Keyboard and assistive-technology users can access every visible data structure and action.
9. No proprietary source-game assets, wording, flags, logos, likenesses, or database records are required.

## 23. Recommended tests

- Current edition normal view.
- Historical edition with changed format.
- Partial simulation-detail coverage.
- Stale world or rules revision.
- Postponed, awarded, or corrected result.
- Empty stage or draw.
- Duplicate event update.
- Host disconnect or migration.
- Keyboard and screen-reader flow.
- High text scaling and right-to-left layout.

## 24. Condensed LLM implementation brief

```text
Implement Competition Fixtures for an original football-management simulation. Use stable
nation, competition, edition, season, stage, group, round, club, team, fixture,
person, ranking, award, and record IDs; immutable revisioned read models;
authoritative rules, standings, qualification, draw, eligibility, award, record,
and ranking calculations; explicit simulation-detail coverage; cancellable
scope queries; stable sorting; and audited corrections. Never fabricate missing
detail or trust renderer-calculated official outcomes. Support keyboard use,
accessible tables and bracket alternatives, visible focus, high text scaling,
localization, and right-to-left layouts. Treat names, history, rules, labels,
media, IDs, and network payloads as untrusted. Do not copy proprietary artwork,
exact wording, source code, flags, logos, likenesses, or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify competition fixtures screen
```
