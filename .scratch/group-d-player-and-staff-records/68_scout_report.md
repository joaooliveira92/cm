# Screen 68: Scout Report

> **Clean-room notice:** This specification describes an original football-management simulation inspired by early-2000s management games. Use original text, visuals, fictional people, and licensed data only.

---

## 1. Purpose

Scout Report provides a scout-authored, knowledge-limited assessment of an external or internal player, including identity confidence, ability, potential, position, value, wage expectations, availability, fit, risks, and recommendation.

## 2. Primary user goals

- Open player, scout, club, and competition
- Review strengths, weaknesses, risks, and role fit
- Compare multiple reports and scouts
- Assign follow-up scouting or add to shortlist
- Open transfer action when authorized

## 3. Navigation context

```text
Global Application Shell
  -> Club Squad, Staff List, Search, Shortlist, Match, or Report
  -> Scout Report
  -> Linked person, club, competition, contract, or workflow
```

The source-list context should support Previous and Next navigation without relying on mutable row positions.

## 4. Conceptual layout

```text
| SCOUT REPORT: PLAYER NAME | Scout: Jamie Observer |
| Knowledge: Extensive | Recommendation: Sign |
| Ability: Strong | Potential: Very good |
| Estimated value: 2.0m-3.0m EC | Wage estimate: 15k-20k EC/week |
| Strengths, weaknesses, risks, role fit, transfer interest |
```

The layout is conceptual and must use an original presentation system.

## 5. Core data model

```typescript
interface ScoutReportModel {
  readonly reportId: string;
  readonly playerId: string;
  readonly scoutId: string;
  readonly observedAt: string;
  readonly knowledge: KnowledgeConfidence;
  readonly identityConfidence: KnowledgeConfidence;
  readonly ability: AbilityBand;
  readonly potential?: PotentialBand;
  readonly valueEstimate?: MoneyRange;
  readonly wageEstimate?: MoneyRange;
  readonly findings: readonly ReportFinding[];
  readonly risks: readonly ScoutingRisk[];
  readonly recommendations: readonly ScoutingRecommendation[];
  readonly freshness: ReportFreshness;
}
```

Read models must be immutable per revision, serializable, permission-aware, and validated at process or network boundaries.

## 6. Principal interactions

- Open player, scout, club, and competition
- Review strengths, weaknesses, risks, and role fit
- Compare multiple reports and scouts
- Assign follow-up scouting or add to shortlist
- Open transfer action when authorized

## 7. View states

- `loading`
- `ready`
- `refreshing`
- `knowledge_limited`
- `permission_limited`
- `unavailable`
- `error`

Asynchronous requests must be cancellable and revision-aware. Late results from a previous person, tab, manager, or career context are discarded.

## 8. Knowledge and visibility

- Public identity and career information may be broadly visible.
- Attributes, potential, value, wages, happiness, health, relationships, and reports follow explicit knowledge and permission policies.
- Unknown information remains Unknown or an uncertainty range.
- The UI must not leak hidden values through sorting, colors, tooltips, accessibility labels, exports, or response timing.
- The report author, observation date, confidence, and freshness must be visible where relevant.

## 9. Actions and mutations

- Read views never mutate canonical state directly.
- Consequential actions open a dedicated workflow or submit a narrow authoritative command.
- Commands use stable IDs, expected revisions, permissions, and idempotency request IDs.
- Bulk actions preview affected, skipped, unavailable, and conflicted people.
- Disabled actions remain inspectable and explain their reason.

## 10. Search, sorting, and source-list navigation

- Use deterministic stable sorting and tie-breakers.
- Preserve source filter and selection context.
- Previous and Next use a revision-bound list cursor.
- Deleted or inaccessible entities are skipped with an announcement.
- Large player and staff lists are virtualized.

## 11. Empty and error states

Distinguish unavailable data, insufficient knowledge, permission denied, deleted person, stale report, incomplete simulation detail, offline authority, and operational failure. Preserve the last valid view during a recoverable refresh failure.

## 12. Accessibility

- Use headings and definition lists for summaries.
- Expose data tables as accessible grids with sort state.
- Associate uncertainty, confidence, and freshness with each relevant value.
- Never communicate status, increase, decrease, or suitability by color alone.
- Support keyboard tabs, Previous and Next, actions, and linked entities.
- Restore focus after dialogs and linked workflows.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.

## 13. Localization

- Localize labels, dates, times, money, units, statuses, roles, positions, and plural forms.
- Preserve stable person, role, position, competition, and report IDs.
- Apply locale-aware sorting and search.
- Preserve structured personal names and native scripts.
- Use complete message templates rather than concatenated fragments.

## 14. Responsive behavior

- Wide layouts may use tabs plus a summary sidebar.
- Narrow layouts stack identity, status, core content, and actions.
- Tables may transform into accessible cards at small widths.
- High scaling must keep labels, uncertainty, and action reasons visible.
- Ultrawide displays use bounded content widths.

## 15. Performance

- Query compact permission-filtered read models.
- Virtualize histories, form rows, reports, and comparison lists.
- Debounce filters and cancel stale requests.
- Cache only data keyed by person, viewer, knowledge, and career revisions.
- Keep aggregation and visibility calculations outside the renderer.

## 16. Security and privacy

- Render names, biographies, reports, and user annotations as text or constrained structured blocks.
- Validate every stable ID, route, action, and revision in a trusted layer.
- Restrict health, contract, happiness, relationships, notes, and reports by permission.
- Store money with explicit currency and minor units.
- Sanitize exports and diagnostics.
- Reject events for inactive career, manager, person, or report contexts.
- Never trust renderer-supplied attributes, ability, potential, valuation, or eligibility.

## 17. Screen-specific rules

- Value and wage are estimates with ranges and confidence
- Reports must not leak hidden exact attributes
- Identity uncertainty must be represented for low knowledge
- Recommendation is advisory and depends on club context

## 18. Persistence

Persist only canonical person state through domain transactions and safe manager-scoped view preferences such as selected tab, columns, and filters. Do not persist stale read models, exposed hidden values, transient menu state, or unvalidated actions.

## 19. Observability

Record query duration, cache result, visibility-policy outcome category, revision conflicts, and safe diagnostic codes. Avoid recording health details, exact hidden attributes, happiness concerns, contract terms, report prose, or complete identities in general telemetry.

## 20. Edge cases

- The person changes club while the screen is open.
- A contract expires or transfer completes during refresh.
- The active manager or knowledge scope changes.
- A report becomes stale or its author leaves the club.
- The person retires, becomes unavailable, or is removed by an audited correction.
- The source list changes while Previous or Next is used.
- The same action is submitted twice.
- The host disconnects or migrates.

## 21. Acceptance criteria

1. Value and wage are estimates with ranges and confidence
2. Reports must not leak hidden exact attributes
3. Identity uncertainty must be represented for low knowledge
4. Recommendation is advisory and depends on club context
5. The screen distinguishes loading, unavailable, permission-limited, knowledge-limited, and failed states.
6. Navigation, reports, and actions use stable IDs and current revisions.
7. Keyboard and assistive-technology users can access all visible information and actions.
8. No proprietary source-game assets, likenesses, database records, or copied wording are required.

## 22. Recommended tests

- Normal authorized view.
- External person with limited knowledge.
- Permission-limited private data.
- Stale asynchronous response.
- Person changes club.
- Deleted linked entity.
- Large virtualized history or list.
- Duplicate action request.
- Keyboard and screen-reader navigation.
- High text scaling and right-to-left layout.

## 23. Condensed LLM implementation brief

```text
Implement Scout Report for an original football-management simulation. Use stable
person and entity IDs, compact immutable revisioned read models, explicit viewer
knowledge and permission policies, cancellable asynchronous queries, safe source-
list navigation, deterministic sorting, and idempotent revision-bound actions.
Never infer or leak hidden values. Preserve uncertainty, report authorship,
confidence, freshness, currency, and simulation-detail limitations. Support
keyboard use, accessible summaries and grids, visible focus, high text scaling,
localization, and right-to-left layouts. Treat all names, reports, biographies,
IDs, money, links, and renderer commands as untrusted. Do not copy proprietary
artwork, exact wording, source code, likenesses, logos, or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify scout report screen
```
