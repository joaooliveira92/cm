# Screen 151: Club Vision and Culture

> **Clean-room notice:** This specification describes an original football-management simulation inspired by early-2000s management games. Use original text, visuals, fictional people, and properly licensed data only.

---

## 1. Purpose

Club Vision and Culture describes the club’s strategic football identity, recruitment principles, development priorities, playing philosophy, financial expectations, community orientation, and long-term milestones.

## 2. Primary user goals

- Review current and historical vision pillars
- Open objectives and evidence
- Propose supported changes where authorized
- Compare manager approach with club expectations

## 3. Navigation context

```text
Global Application Shell
  -> Club Operations or Board
  -> Club Vision and Culture
  -> Related objective, request, project, staff, finance, or meeting workflow
```

The screen preserves the active club, manager, authority context, club revision, and navigation history.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Vision pillars, culture, philosophy, recruitment, development, finance, mile |
|------------------------------------------------------------------------------|
| Operational content, evidence, status, deadlines, warnings, and actions       |
|                                                                              |
| [Related Views] [Review] [Primary Action] [Back]                              |
+------------------------------------------------------------------------------+
```

The layout is conceptual and must use an original presentation system.

## 5. Core data model

```typescript
interface ClubVisionModel {
  readonly clubId: string;
  readonly managerId: string;
  readonly clubOperationsRevision: number;
  readonly authorityRevision: number;
  readonly issues: readonly ClubOperationsIssue[];
  readonly permittedActions: readonly ClubOperationsAction[];
}
```

Renderer-facing models must be immutable per revision, serializable, permission-aware, and validated at process or network boundaries.

## 6. Principal interactions

- Review current and historical vision pillars
- Open objectives and evidence
- Propose supported changes where authorized
- Compare manager approach with club expectations

## 7. View and workflow states

- `loading`
- `ready`
- `modified`
- `validating`
- `submitted`
- `under_review`
- `approved`
- `conditionally_approved`
- `rejected`
- `completed`
- `cancelled`
- `conflicted`
- `permission_limited`
- `failed`

Only transitions valid for the authoritative current state are enabled.

## 8. Authority and delegation

- Board, owner, manager, director, and staff authority scopes remain distinct.
- Delegation cannot create authority that the delegating actor does not possess.
- Shared multiplayer settings are enforced by the host or server.
- Commands include stable IDs, expected revisions, authority context, and idempotency request IDs.
- Stale or revoked authority invalidates unsubmitted drafts.

## 9. Evidence, forecasts, and uncertainty

- Requests and reviews reference committed results, finances, staffing, attendance, and project facts.
- Forecasts, costs, completion dates, attendance, and benefits disclose assumptions and uncertainty.
- Hidden board formulas and undisclosed thresholds are not exposed.
- Qualitative bands include textual definitions.
- Changed evidence invalidates affected previews and recommendations.

## 10. Money, projects, and schedules

- All money uses explicit currency, minor units, and payment dates.
- Approved budget, expected cost, committed cost, and actual cost remain distinct.
- Projects use explicit proposed, approved, scheduled, active, delayed, completed, cancelled, and failed states.
- Deadlines and milestones are authoritative and revision-bound.
- No project or agreement is created by renderer-only state.

## 11. Validation and conflict handling

Distinguish missing authority, stale revision, changed finances, unavailable facility, project conflict, expired response, invalid delegation, missing staff, provider outage, and operational failure. Preserve valid drafts where safe and offer Refresh, Review Changes, Revise, Retry, or Return.

## 12. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Expose objectives, requests, responsibilities, projects, agreements, calendars, and meetings through accessible forms, grids, lists, and headings.
- Associate each warning or decision reason with the relevant item.
- Never communicate confidence, approval, risk, progress, or budget state by color alone.
- Provide non-drag alternatives for calendars and responsibility assignment.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.

## 13. Localization requirements

- Localize roles, authority, objectives, statuses, dates, durations, money, capacity, percentages, and plural forms.
- Preserve stable club, person, objective, request, project, facility, affiliate, agreement, and meeting IDs.
- Preserve structured personal names and native scripts.
- Use complete message templates rather than concatenated fragments.
- Keep owner, board, manager, staff, home, and affiliate semantics clear in RTL layouts.

## 14. Responsive behavior

- Wide layouts may combine summary, evidence, details, and actions.
- Narrow layouts stack status, content, warnings, and actions.
- Long objective, condition, and project descriptions wrap safely.
- Primary Submit, Accept, Revise, Cancel, and Back actions remain reachable.
- Ultrawide displays use bounded working widths.

## 15. Performance requirements

- Keep authority, forecast, project, finance, and rule calculations outside the renderer.
- Recalculate only affected objectives, requests, or project terms.
- Virtualize long histories, calendars, and agreement lists.
- Cancel stale previews and rate-limit operational updates.
- Cache only permission-safe data keyed by club, manager, authority, policy, and career revisions.
- Avoid transporting the complete finance ledger or board simulation state.

## 16. Security and privacy requirements

- Treat names, rationale, notes, meeting text, sponsor data, and network payloads as untrusted.
- Render text safely and parse structured drafts through strict schemas.
- Validate every club, person, objective, request, project, facility, agreement, and action ID.
- Enforce authority in a trusted process or server.
- Never trust renderer-calculated costs, benefits, confidence, progress, or approval state.
- Sanitize exports and diagnostics.

## 17. Screen-specific rules

- Vision is not a stereotype of supporters or location
- Philosophy expectations remain distinct from tactical commands
- Changes require board approval
- Long-term milestones expose uncertainty and dates

## 18. Persistence rules

Persist immutable request and response revisions, objectives, approved projects, responsibility and delegation settings, affiliations, agreements, meetings, operational events, and manager-scoped view preferences according to policy. Do not persist stale forecasts, invalid drafts, renderer calculations, plaintext secrets, or permission decisions outside the authority service.

## 19. Observability

Record workflow duration, issue codes, outcome categories, authority conflicts, and safe project milestones. Avoid recording private board discussions, exact sponsor terms, manager rationale, supporter personal data, or full identities in general telemetry.

## 20. Edge cases

- Authority changes while a draft is open.
- A budget, objective, facility, project, or deadline changes remotely.
- A responsible staff member leaves the club.
- An affiliate becomes unavailable or changes division.
- A venue or project milestone is delayed.
- A decision arrives after the request has been withdrawn.
- The same command is submitted twice.
- The host disconnects or migrates.

## 21. Acceptance criteria

1. Vision is not a stereotype of supporters or location
2. Philosophy expectations remain distinct from tactical commands
3. Changes require board approval
4. Long-term milestones expose uncertainty and dates
5. The view is bound to one club, manager, authority revision, and club-operations revision.
6. Draft, submitted, reviewed, approved, rejected, completed, cancelled, and failed states remain distinct.
7. All consequential commands are revision-bound and idempotent.
8. Keyboard and assistive-technology users can complete every supported task.
9. No proprietary source-game assets, wording, likenesses, personal data, or database records are required.

## 22. Recommended tests

- Normal authorized workflow.
- Authority revoked during editing.
- Stale request or project revision.
- Budget or deadline changes.
- Responsible staff member becomes unavailable.
- Conditional approval.
- Duplicate command.
- Multiplayer concurrent edit or host migration.
- Keyboard and screen-reader flow.
- High text scaling and right-to-left layout.

## 23. Condensed LLM implementation brief

```text
Implement Club Vision and Culture for an original football-management simulation. Use stable
club, manager, board, objective, request, response, staff, policy, project,
facility, affiliate, agreement, calendar, and meeting IDs; immutable revisioned
read models and drafts; authoritative authority, finance, project, deadline, and
permission validation; explicit currency and schedule models; uncertain and
explainable forecasts; and idempotent revision-bound commands. Never trust
renderer-calculated costs, benefits, confidence, progress, or approval. Support
keyboard operation, accessible forms and histories, non-drag alternatives,
visible focus, high text scaling, localization, and right-to-left layouts. Treat
names, rationale, notes, commercial data, IDs, and network payloads as untrusted.
Do not copy proprietary artwork, exact wording, source code, logos, likenesses,
personal data, or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify club vision and culture screen
```
