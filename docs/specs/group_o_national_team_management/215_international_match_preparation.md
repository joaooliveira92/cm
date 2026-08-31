# Screen 215: International Match Preparation

> **Clean-room notice:** Use original content, fictional people, and properly licensed data only.

---

## 1. Purpose

Consolidates opponent intelligence, squad status, travel, venue, officials, weather where modeled, tactics, lineup readiness, and media obligations before an international match.

## 2. Primary user goals

- Review opponent report and campaign context
- Open lineup, tactics, eligibility, and set pieces
- Resolve fitness, arrival, registration, or suspension alerts
- Proceed to final team submission

## 3. Navigation context

```text
Global Application Shell
  -> National Team
  -> International Match Preparation
  -> Related player, fixture, competition, staff, tactic, or federation workflow
```

The view preserves the active manager, national team, team level, international window, competition edition, and career revision.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| International Match Preparation                                              |
|------------------------------------------------------------------------------|
| International context, deadlines, status, evidence, warnings, and actions    |
|                                                                              |
| [Related Views] [Review] [Primary Action] [Back]                             |
+------------------------------------------------------------------------------+
```

The presentation must be original and must not imitate proprietary layouts.

## 5. Core data model

```typescript
interface NationalTeamWorkflowModel {
  readonly nationalTeamId: string;
  readonly managerId: string;
  readonly teamLevelId: string;
  readonly internationalWindowId?: string;
  readonly competitionEditionId?: string;
  readonly internationalRevision: number;
  readonly rulesRevision: number;
  readonly issues: readonly InternationalManagementIssue[];
  readonly permittedActions: readonly InternationalManagementAction[];
}
```

Read models are immutable per revision, serializable, permission-filtered, and validated at process or network boundaries.

## 6. Principal interactions

- Review opponent report and campaign context
- Open lineup, tactics, eligibility, and set pieces
- Resolve fitness, arrival, registration, or suspension alerts
- Proceed to final team submission

## 7. Workflow states

- `loading`
- `ready`
- `modified`
- `validating`
- `submitted`
- `awaiting_response`
- `completed`
- `withdrawn`
- `expired`
- `conflicted`
- `permission_limited`
- `failed`

Only transitions valid for the current rules, window, and international-management revision are enabled.

## 8. Club and international boundaries

- Club employment, national-team employment, call-up, registration, travel, and match selection are separate domains.
- Club tactics, notes, and private medical information are not copied into national-team state without explicit policy.
- International commands cannot mutate club contracts or squad registration.
- Release, withdrawal, and replacement events use narrow authoritative workflows.
- Dual roles are allowed only by explicit career policy.

## 9. Eligibility and competition rules

- Eligibility is resolved by a trusted, edition-aware rules service.
- Nationality links, prior representation, age-level appearances, waiting periods, and commitment events use structured evidence.
- Unknown or disputed evidence remains unresolved.
- The renderer never decides eligibility, replacement rights, squad limits, or qualification.
- These screens explain fictional simulation rules and do not provide legal advice.

## 10. Privacy, health, and player welfare

- Health, travel, relationships, and private player decisions are permission-restricted.
- Medical restrictions override ordinary selection and training choices.
- The UI must not pressure injured or unavailable players.
- Interactions use professional, nonabusive constrained content.
- Public announcements are separate from private selection drafts.

## 11. Drafts, deadlines, and commands

- Squad, registration, call-up, tactic, training, and staffing changes use revisioned drafts.
- Commands contain stable IDs, expected revisions, manager authority, and idempotency keys.
- Deadlines are authoritative and may close while a draft is open.
- Remote withdrawals or rule changes invalidate affected drafts.
- Duplicate submissions return the original outcome.

## 12. Validation and recovery

Distinguish stale revisions, deadline expiry, ineligible player, club-release conflict, medical withdrawal, unavailable staff, invalid registration, missing authority, host migration, and operational failure. Preserve safe drafts and offer Refresh, Review Changes, Replace, Retry, or Return.

## 13. Accessibility

- Support full keyboard operation and visible focus.
- Expose squads, eligibility evidence, call-ups, campaigns, and histories as accessible forms, grids, lists, and headings.
- Associate every warning and disabled reason with the relevant person or action.
- Announce deadlines, selection totals, replacements, and submission outcomes politely.
- Never communicate eligibility, morale, status, or qualification by color alone.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.

## 14. Localization

- Localize team levels, windows, competitions, eligibility states, dates, times, roles, and plural forms.
- Preserve stable team, player, staff, fixture, call-up, evidence, registration, and campaign IDs.
- Preserve structured names and native scripts.
- Use complete message templates rather than concatenated fragments.
- Home-away, federation-club, and selected-standby semantics remain clear in RTL layouts.

## 15. Responsive behavior

- Wide layouts may combine summary, roster, evidence, and action panels.
- Narrow layouts stack context, content, warnings, and actions.
- Long eligibility explanations wrap safely.
- Primary Select, Call Up, Replace, Submit, Withdraw, and Back actions remain reachable.
- Ultrawide layouts retain bounded reading widths.

## 16. Performance

- Keep eligibility, qualification, release, and registration calculations outside the renderer.
- Virtualize large eligible-player and history lists.
- Cancel stale searches, reports, and validation requests.
- Cache only permission-safe data keyed by team, manager, rules, window, and career revisions.
- Rate-limit live availability and club-release updates.
- Avoid transporting unrelated club-private state.

## 17. Security and integrity

- Treat names, messages, evidence labels, notes, and network payloads as untrusted.
- Validate every team, player, staff, fixture, competition, call-up, registration, and action ID.
- Enforce manager authority and privacy in a trusted process or server.
- Never trust renderer-calculated eligibility, qualification, availability, squad totals, or deadlines.
- Sanitize exports and diagnostics.
- Reject events for inactive managers or superseded international windows.

## 18. Screen-specific rules

- Opponent information follows scouting confidence
- The view cannot reveal hidden opposition selection
- One coherent fixture revision drives all readiness checks
- Deadlines remain authoritative

## 19. Persistence

Persist authoritative appointments, squad submissions, call-ups, responses, withdrawals, registrations, accepted tactical snapshots, staff assignments, competition campaigns, commitment events, and audited corrections. Persist manager-private views separately. Do not persist stale eligibility previews or renderer decisions.

## 20. Observability

Record workflow duration, status transition, rules version, issue category, and safe outcome. Avoid recording health details, private eligibility evidence, relationship data, tactical content, or complete identities in general telemetry.

## 21. Edge cases

- A player is injured, suspended, transferred, or withdrawn after selection.
- A club release response arrives after a replacement is drafted.
- Eligibility evidence or competition rules change.
- The submission deadline closes during validation.
- Club and national-team fixtures overlap.
- Another manager modifies shared federation state.
- The same command is submitted twice.
- The host disconnects or migrates.

## 22. Acceptance criteria

1. Opponent information follows scouting confidence
2. The view cannot reveal hidden opposition selection
3. One coherent fixture revision drives all readiness checks
4. Deadlines remain authoritative
5. The view is bound to one national team, manager, rules revision, window, and career revision.
6. Club and international employment, selection, registration, and availability states remain distinct.
7. All consequential commands are revision-bound and idempotent.
8. Keyboard and assistive-technology users can complete every supported task.
9. No proprietary assets, wording, flags, logos, likenesses, personal data, or databases are required.

## 23. Recommended tests

- Normal authorized workflow.
- Stale rules or international revision.
- Player withdrawal after call-up.
- Eligibility evidence changes.
- Deadline closes during validation.
- Club and international fixture conflict.
- Duplicate command.
- Multiplayer or host migration.
- Keyboard and screen-reader flow.
- High scaling and right-to-left layout.

## 24. Condensed LLM implementation brief

```text
Implement International Match Preparation for an original football-management simulation. Use stable
national-team, manager, team-level, player, staff, fixture, window, competition,
call-up, eligibility-evidence, registration, and campaign IDs; immutable
revisioned drafts; authoritative edition-aware eligibility, release,
registration, deadline, qualification, health, and permission validation; strict
club-international boundaries; professional safe interactions; and idempotent
revision-bound commands. Never trust renderer-calculated eligibility,
availability, qualification, squad totals, or deadlines. Support keyboard use,
accessible rosters and evidence, visible focus, high text scaling, localization,
and right-to-left layouts. Treat names, messages, evidence, notes, IDs, and
network payloads as untrusted. Do not copy proprietary artwork, exact wording,
source code, flags, logos, likenesses, personal data, or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify international match preparation screen
```
