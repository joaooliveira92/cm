# Screen 244: Promotion Relegation and Qualification Confirmation

> **Clean-room notice:** Use original content, fictional entities, and properly licensed data only.

---

## 1. Purpose

Promotion Relegation and Qualification Confirmation presents finalized movement between competitions, playoff outcomes, continental places, licensing conditions, unresolved dependencies, and effective next-season destinations.

## 2. Primary user goals

- Review confirmed and provisional destinations
- Open standings, rules, playoffs, and dependent competitions
- Inspect unresolved licensing or administrative conditions
- Acknowledge finalized movement

## 3. Navigation context

```text
Global Application Shell
  -> Awards, Honours, Season Review, or Continue
  -> Promotion Relegation and Qualification Confirmation
  -> Related person, club, competition, finance, or transition workflow
```

The view preserves the selected season, competition edition, entity, manager, transition revision, and navigation history.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Promotion Relegation and Qualification Confirmation                          |
|------------------------------------------------------------------------------|
| Season context, evidence, outcomes, milestones, warnings, and actions         |
|                                                                              |
| [Related Views] [Review] [Primary Action] [Continue or Back]                  |
+------------------------------------------------------------------------------+
```

The presentation must be original, accessible, and usable without animation.

## 5. Core data model

```typescript
interface SeasonTransitionViewModel {
  readonly careerId: string;
  readonly seasonId: string;
  readonly competitionEditionId?: string;
  readonly entityId?: string;
  readonly seasonRevision: number;
  readonly transitionRevision?: number;
  readonly issues: readonly SeasonTransitionIssue[];
  readonly permittedActions: readonly SeasonTransitionAction[];
}
```

Read models are immutable per revision, serializable, permission-filtered, and validated at process or network boundaries.

## 6. Principal interactions

- Review confirmed and provisional destinations
- Open standings, rules, playoffs, and dependent competitions
- Inspect unresolved licensing or administrative conditions
- Acknowledge finalized movement

## 7. Workflow states

- `loading`
- `ready`
- `provisional`
- `confirmed`
- `presenting`
- `awaiting_acknowledgement`
- `validating`
- `transitioning`
- `paused_safe`
- `completed`
- `blocked`
- `recovering`
- `failed`

Only actions valid for the authoritative season and transition state are enabled.

## 8. Season completion and rollover boundaries

- Match completion, competition completion, season review, movement confirmation, rollover, and new-season readiness are separate phases.
- The previous season remains queryable after rollover.
- New competition editions receive new stable IDs and versioned rules.
- Rollover occurs only at safe simulation boundaries.
- The renderer cannot mutate canonical season state.

## 9. Awards and honours integrity

- Awards, nominees, selections, ceremonies, honours, and records use committed eligible evidence.
- Trusted services determine recipients and official selections.
- Hidden voting or scoring formulas remain private unless the award policy discloses them.
- Ties, withdrawals, corrections, and absent categories use explicit states.
- Presentation effects never influence outcomes.

## 10. Transactional season transition

- Rollover uses resumable, checkpointed, idempotent domain operations.
- Competition membership, calendars, contracts, budgets, records, rules, ages, registrations, and scheduled events update coherently.
- A failure cannot expose contradictory partial canonical state.
- Recovery resumes from the last verified checkpoint.
- Completion produces an immutable transition report.

## 11. Forecasts, narratives, and expectations

- Reviews and expectations reference committed facts and named forecasts.
- Forecasts, budgets, attendance, development, and performance projections remain uncertain.
- Narrative summaries must not imply unsupported causation.
- Board expectations and contract promises remain distinct.
- Readiness indicators are preparation checks, not guarantees.

## 12. Validation and recovery

Distinguish incomplete competitions, unresolved playoffs, administrative dependencies, invalid registration, contract conflict, budget failure, unavailable destination, stale revision, interrupted rollover, and operational failure. Preserve verified checkpoints and provide Review Blocker, Retry, Resume, or Return actions.

## 13. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Expose awards, nominees, teams, honours, reviews, checklists, and transition progress through accessible lists, grids, headings, and status regions.
- Provide text alternatives for ceremonies, formations, charts, and animations.
- Allow pause, skip, and reduced-motion presentation.
- Never communicate outcome, progress, qualification, or readiness by color alone.
- Support high contrast, 200 percent text scaling, and right-to-left layouts.

## 14. Localization requirements

- Localize award names, stages, statuses, dates, seasons, money, numbers, competitions, and plural forms.
- Preserve stable award, honour, entity, season, edition, transition, checkpoint, and objective IDs.
- Preserve structured names and native scripts.
- Use complete message templates rather than concatenated fragments.
- Ceremony sequence and formation semantics remain correct in RTL layouts.

## 15. Responsive behavior

- Wide layouts may combine summary, evidence, history, and actions.
- Narrow layouts stack context, outcomes, evidence, warnings, and actions.
- Ceremonies degrade to an immediate accessible list.
- Long review and objective text wraps safely.
- Primary Review, Accept, Start, Resume, Skip, Continue, and Back actions remain reachable.

## 16. Performance requirements

- Run award selection, qualification, rollover, and readiness validation outside the renderer.
- Stream compact progress and checkpoint events.
- Virtualize long award, honour, and transition histories.
- Cancel stale evidence and review queries.
- Cache only permission-safe data keyed by season, edition, entity, and transition revisions.
- Avoid transporting complete world state during rollover monitoring.

## 17. Security and integrity requirements

- Treat names, narratives, award labels, objectives, imported schedules, and network payloads as untrusted.
- Validate every award, person, club, competition, season, edition, project, checkpoint, and action ID.
- Enforce authority and season-state transitions in a trusted process or server.
- Never trust renderer-calculated recipients, qualification, budgets, readiness, or rollover progress.
- Sanitize exports and diagnostics.
- Reject duplicate or out-of-order transition events.

## 18. Screen-specific rules

- Qualification is calculated by trusted competition services
- Sporting and administrative outcomes remain distinct
- Provisional and confirmed destinations are explicit
- Corrections preserve prior decisions in audit history

## 19. Persistence rules

Persist official awards, nominations, selections, honours, movement decisions, frozen season reviews, transition checkpoints, rollover reports, approved off-season plans, expectations, budgets, and readiness acknowledgements through authoritative transactions. Do not persist transient ceremony animation state or renderer-derived outcomes.

## 20. Observability

Record workflow duration, phase, checkpoint ID, issue category, safe progress, and outcome. Avoid recording private votes, exact hidden formulas, complete financial details, personal data, or full narrative content in general telemetry.

## 21. Edge cases

- A competition or playoff remains incomplete at the expected transition date.
- An award or qualification receives an audited correction.
- A club changes destination after an administrative decision.
- Rollover is interrupted after a verified checkpoint.
- A contract, budget, or registration conflict blocks transition.
- The user skips a ceremony or closes the client during presentation.
- The same transition command is submitted twice.
- The host disconnects or migrates.

## 22. Acceptance criteria

1. Qualification is calculated by trusted competition services
2. Sporting and administrative outcomes remain distinct
3. Provisional and confirmed destinations are explicit
4. Corrections preserve prior decisions in audit history
5. The view is bound to explicit season, edition, entity, and transition revisions.
6. Provisional, confirmed, presenting, blocked, transitioning, recovering, completed, and failed states remain distinct.
7. Official awards, qualification, movement, readiness, and rollover outcomes come only from trusted services.
8. Keyboard and assistive-technology users can access every outcome and action without animation.
9. No proprietary source-game assets, wording, likenesses, ceremonies, or database records are required.

## 23. Recommended tests

- Normal completed-season workflow.
- Provisional qualification awaiting dependency.
- Award tie or audited correction.
- Interrupted rollover and checkpoint recovery.
- Duplicate transition command.
- Invalid contract, budget, or registration blocker.
- Ceremony skip and reduced-motion mode.
- Host migration during transition.
- Keyboard and screen-reader flow.
- High scaling and right-to-left layout.

## 24. Condensed LLM implementation brief

```text
Implement Promotion Relegation and Qualification Confirmation for an original football-management simulation. Use stable
award, nomination, honour, person, club, team, competition, season, edition,
objective, budget, transition, checkpoint, and report IDs; immutable revisioned
read models; authoritative award, qualification, movement, budget, readiness,
and rollover validation; accessible skippable presentations; resumable atomic
season transitions; and idempotent revision-bound commands. Keep competition
completion, review, confirmation, rollover, and readiness phases distinct. Never
trust renderer-calculated recipients, qualification, progress, budgets, or
readiness. Treat names, narratives, labels, schedules, IDs, and network payloads
as untrusted. Do not copy proprietary artwork, exact wording, source code, logos,
likenesses, ceremonies, or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify promotion relegation and qualification confirmation screen
```
