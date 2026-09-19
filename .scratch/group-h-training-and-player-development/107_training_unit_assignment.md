# Screen 107: Training Unit Assignment

> **Clean-room notice:** This specification describes an original football-management simulation inspired by early-2000s management games. Use original text, visuals, fictional people, and licensed data only.

---

## 1. Purpose

Training Unit Assignment organizes eligible players into goalkeeping, defensive, attacking, rehabilitation, youth, or custom training units and balances coach coverage and unit size.

## 2. Primary user goals

- Move players between eligible units
- Create, rename, or remove supported custom units
- Assign a unit focus and eligible coaches
- Apply a previewable automatic balance
- Save one validated unit revision

## 3. Navigation context

```text
Global Application Shell
  -> Training or Development
  -> Training Unit Assignment
  -> Related player, coach, schedule, medical, mentoring, or academy workflow
```

The screen preserves the active club, manager, squad scope, training period, and navigation history.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Training units, assigned players, coaches, capacity, focus, workload and war |
|------------------------------------------------------------------------------|
| Training-specific content, status, warnings, evidence, and actions            |
|                                                                              |
| [Primary Views] [Context Actions] [Apply or Back]                             |
+------------------------------------------------------------------------------+
```

The layout is conceptual and must use an original presentation system.

## 5. Core data model

```typescript
interface TrainingUnitAssignmentDraft {
  readonly clubId: string;
  readonly trainingRevision: number;
  readonly period: TrainingPeriod;
  readonly squadScopeId: string;
  readonly issues: readonly TrainingIssue[];
  readonly permittedActions: readonly TrainingAction[];
}
```

Renderer-facing models must be immutable per revision, serializable, and validated at process or network boundaries.

## 6. Principal interactions

- Move players between eligible units
- Create, rename, or remove supported custom units
- Assign a unit focus and eligible coaches
- Apply a previewable automatic balance
- Save one validated unit revision

## 7. View and operation states

- `loading`
- `ready`
- `modified`
- `validating`
- `previewing`
- `submitting`
- `completed`
- `conflicted`
- `permission_limited`
- `failed`

Every asynchronous report, forecast, recommendation, and validation request must support cancellation and request revisions. Late responses from a prior player, period, squad, or club context are discarded.

## 8. Training drafts and canonical state

- Editing creates a revisioned draft.
- A draft does not affect development until authoritative submission succeeds.
- The trusted application service combines team schedule, individual plans, coaching, medical restrictions, matches, travel, and recovery.
- Commands use stable IDs, expected revisions, manager authority, and idempotency request IDs.
- Shared multiplayer edits use a lease or optimistic conflict policy.

## 9. Development uncertainty

- Training outcomes are probabilistic and multifactorial.
- Improvement, decline, adaptation, trait acquisition, and injury risk must not be guaranteed.
- Coach assessments and medical recommendations display author, confidence, observation date, and freshness where relevant.
- Hidden current or potential ability must not leak through sorting, prose, colors, exports, tooltips, or accessibility labels.

## 10. Medical and workload boundaries

- Medical restrictions are authoritative within the simulation.
- Training screens do not provide real-world medical advice.
- Workload, fatigue, injury, recovery, condition, and match fitness remain distinct.
- Sensitive health data is visible only to authorized managers and staff contexts.
- Rest and rehabilitation changes use explicit plans and revisions.

## 11. Automatic and bulk actions

- Recommended schedules, unit balancing, coach assignment, and plan templates are deterministic for one input revision.
- They preview affected, skipped, locked, restricted, and conflicted entities.
- They never submit automatically.
- One accepted preview creates one draft revision.

## 12. Validation and errors

Distinguish stale revision, unavailable player or coach, medical restriction, fixture conflict, insufficient coach coverage, invalid schedule, policy incompatibility, permission loss, and operational failure. Preserve the last valid draft where safe and offer Review Changes, Refresh, Retry, or Return.

## 13. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Provide non-drag alternatives for calendars, unit assignment, and group management.
- Expose schedules, players, coaches, workloads, and reports through accessible grids, lists, and headings.
- Associate warnings and disabled reasons with the relevant row or control.
- Never communicate progress, risk, workload, or development change by color alone.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.

## 14. Localization requirements

- Localize session, unit, role, trait, workload, recovery, period, date, time, money, and status labels.
- Preserve stable player, staff, session, unit, plan, role, trait, and report IDs.
- Preserve structured personal names and native scripts.
- Use complete message templates rather than concatenated fragments.
- Calendar direction and week-start conventions must be locale-aware.

## 15. Responsive behavior

- Wide layouts may combine calendar, list, details, and summary panels.
- Narrow layouts stack period controls, content, warnings, and actions.
- High scaling moves secondary metadata onto additional lines.
- Primary Apply, Save, Submit, and Back actions remain reachable.
- Ultrawide displays use bounded working widths.

## 16. Performance requirements

- Keep forecasts, recommendations, impact calculations, and rule validation outside the renderer.
- Recompute only affected players, units, sessions, or coaches.
- Virtualize long development lists and histories.
- Cancel stale requests and rate-limit live workload updates.
- Cache only data keyed by club, viewer, training, medical, and career revisions.

## 17. Security and privacy requirements

- Treat names, notes, report prose, imported templates, database labels, and network payloads as untrusted.
- Render text safely and parse shared templates through strict schemas.
- Validate every player, staff, session, trait, role, facility, and action ID.
- Enforce club and manager authority in a trusted process or server.
- Never trust renderer-calculated risk, potential, development, workload, cost, or eligibility.
- Sanitize exports and diagnostics.

## 18. Screen-specific rules

- A player belongs to at most one primary unit for the same session scope
- Rehabilitation assignment follows medical policy
- Unit membership does not change squad registration or match selection
- Automatic balancing never submits silently

## 19. Persistence rules

Persist explicit training drafts, submitted schedules, individual plans, unit and coach assignments, mentoring groups, academy decisions, camp plans, and manager-scoped view preferences according to policy. Do not persist stale forecasts, invalid drafts, hover state, or hidden ability values.

## 20. Observability

Record operation duration, validation issue codes, conflict category, report freshness, and safe submission outcome. Avoid recording health details, hidden ability, player personality, report prose, youth personal information, or manager identities in general telemetry.

## 21. Edge cases

- A player is injured, transferred, promoted, loaned, released, or made unavailable.
- A coach leaves or changes responsibilities.
- A fixture or travel date changes.
- Medical restrictions change during editing.
- Another manager edits the same training plan.
- A forecast completes after its inputs change.
- The same command is submitted twice.
- The host disconnects or migrates.

## 22. Acceptance criteria

1. A player belongs to at most one primary unit for the same session scope
2. Rehabilitation assignment follows medical policy
3. Unit membership does not change squad registration or match selection
4. Automatic balancing never submits silently
5. The view is bound to one club and current authoritative training revision.
6. Loading, modified, invalid, conflicted, permission-limited, and completed states are distinct.
7. All consequential commands are revision-bound and idempotent.
8. Keyboard and assistive-technology users can complete every supported task without drag-only interaction.
9. No proprietary source-game assets, wording, likenesses, or database records are required.

## 23. Recommended tests

- Normal authorized workflow.
- Stale training revision.
- Player or coach becomes unavailable.
- Medical restriction changes.
- Deterministic recommendation preview.
- Duplicate command.
- Multiplayer concurrent edit.
- Fixture or travel conflict.
- Keyboard and screen-reader flow.
- High text scaling and right-to-left layout.

## 24. Condensed LLM implementation brief

```text
Implement Training Unit Assignment for an original football-management simulation. Use stable
club, player, staff, session, unit, role, trait, plan, and report IDs; immutable
revisioned drafts; authoritative schedule, medical, workload, permission, and
eligibility validation; cancellable asynchronous reports and forecasts;
deterministic previewable recommendations; and idempotent revision-bound
commands. Model development as uncertain and multifactorial. Never trust
renderer-calculated potential, risk, effects, workload, or cost. Support full
keyboard operation, non-drag alternatives, accessible calendars and grids,
visible focus, high text scaling, localization, and right-to-left layouts. Treat
names, notes, reports, labels, templates, IDs, and network payloads as untrusted.
Do not copy proprietary artwork, exact wording, source code, logos, likenesses,
or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify training unit assignment screen
```
