# Screen 203: Manager Dismissal and Termination

> **Clean-room notice:** This specification describes an original football-management simulation inspired by early-2000s management games. Use original text, visuals, fictional people, fictional employers, and properly licensed data only.

---

## 1. Purpose

Manager Dismissal and Termination presents an employer-initiated end of employment, including effective date, stated reasons, compensation, history entry, control transition, and next career options.

## 2. Primary user goals

- Review the decision and evidence summary
- Open board confidence, objectives, results, and contract where permitted
- Acknowledge the termination
- Continue to job search, manager profile, or another controlled manager

## 3. Navigation context

```text
Global Application Shell
  -> Manager Career or Job Centre
  -> Manager Dismissal and Termination
  -> Related employer, application, interview, contract, or history workflow
```

The screen preserves the active manager, employment context, vacancy or transaction revision, and navigation history.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Employer decision, reasons, effective date, compensation, transition and nex |
|------------------------------------------------------------------------------|
| Career context, evidence, terms, deadlines, status, warnings, and actions    |
|                                                                              |
| [Related Views] [Review] [Primary Career Action] [Back]                      |
+------------------------------------------------------------------------------+
```

The layout is conceptual and must use an original presentation system.

## 5. Core data model

```typescript
interface ManagerDismissalModel {
  readonly managerId: string;
  readonly employerId?: string;
  readonly vacancyId?: string;
  readonly employmentTransactionId?: string;
  readonly managerCareerRevision: number;
  readonly authorityRevision: number;
  readonly issues: readonly ManagerCareerIssue[];
  readonly permittedActions: readonly ManagerCareerAction[];
}
```

Renderer-facing models must be immutable per revision, serializable, permission-aware, and validated at process or network boundaries.

## 6. Principal interactions

- Review the decision and evidence summary
- Open board confidence, objectives, results, and contract where permitted
- Acknowledge the termination
- Continue to job search, manager profile, or another controlled manager

## 7. Career workflow states

- `available`
- `draft_application`
- `applied`
- `shortlisted`
- `interview_scheduled`
- `interviewed`
- `offer_received`
- `negotiating`
- `accepted_provisionally`
- `appointed`
- `employed`
- `resignation_pending`
- `resigned`
- `dismissed`
- `unemployed`
- `withdrawn`
- `expired`
- `failed`

Only transitions valid for the authoritative manager-career revision are enabled.

## 8. Employment lifecycle and boundaries

- Vacancy, application, interview, offer, negotiation, appointment, employment, resignation, dismissal, retirement, and unemployment are distinct states.
- Club and national-team employment may coexist only when career policy explicitly permits it.
- Acceptance is not appointment until completion succeeds.
- Resignation leaves the manager active. Retirement ends active manager control.
- Historical records are appended only after authoritative commit.

## 9. Professional and fair communication

- Applications, interviews, offers, dismissals, and reviews use professional, respectful, policy-defined content.
- The simulation must not generate discriminatory hiring conditions, harassment, humiliation, threats, or retaliation.
- Employer preferences relate to football experience, qualifications, availability, and career evidence.
- Free-form private notes are never submitted or published automatically.
- Real-world employment or legal advice is outside the scope of these screens.

## 10. Contracts, money, and authority

- Compensation uses explicit currency, minor units, and payment period.
- Wage, bonus, compensation, termination, and course costs remain distinct.
- Job title, employment contract, delegated responsibilities, and operational authority are separate.
- Authority cannot exceed employer policy.
- Contract terms and expected start dates are revalidated before appointment.

## 11. Drafts, revisions, and concurrency

- Applications, interviews, offers, negotiations, resignations, and appointments use revisioned drafts or immutable proposals.
- Commands include stable IDs, expected revisions, controller authority, and idempotency request IDs.
- Remote offers or decisions invalidate stale local drafts.
- Duplicate submissions return the original result.
- Multiplayer manager ownership and hot-seat privacy are enforced by the authoritative host.

## 12. Validation and error handling

Distinguish stale vacancy, expired deadline, withdrawn offer, changed employer state, invalid contract term, current-employment conflict, missing authority, unavailable manager, host migration, and operational failure. Preserve valid drafts where safe and offer Refresh, Review Changes, Retry, Withdraw, or Return.

## 13. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Expose vacancies, applications, interview questions, offers, contracts, evidence, and history through accessible forms, grids, lists, and headings.
- Associate every deadline, changed term, warning, and disabled reason with the relevant control.
- Announce interview progress, offer changes, appointment, resignation, and dismissal professionally.
- Never communicate security, suitability, status, or reputation by color alone.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.

## 14. Localization requirements

- Localize job types, roles, statuses, questions, answers, dates, durations, money, qualifications, and plural forms.
- Preserve stable manager, employer, vacancy, application, interview, offer, contract, qualification, and event IDs.
- Preserve structured personal and organization names and native scripts.
- Use complete professional message templates rather than concatenated fragments.
- Employer-candidate and current-new employer semantics remain clear in RTL layouts.

## 15. Responsive behavior

- Wide layouts may combine vacancy or contract detail, evidence, timeline, and actions.
- Narrow layouts stack context, terms, evidence, warnings, and actions.
- Long expectations and contract terms wrap safely.
- Primary Apply, Accept, Reject, Withdraw, Resign, Acknowledge, and Back actions remain reachable.
- Ultrawide displays use bounded reading widths.

## 16. Performance requirements

- Keep suitability, authority, contract, compensation, reputation, and appointment calculations outside the renderer.
- Virtualize long vacancy, application, and history lists.
- Cancel stale search and evidence requests.
- Cache only permission-safe data keyed by manager, employer, vacancy, contract, and career revisions.
- Rate-limit live vacancy and job-security updates.
- Avoid transporting unrelated private manager data.

## 17. Security and privacy requirements

- Treat names, application text, interview content, contract terms, employer messages, and network payloads as untrusted.
- Render text safely through constrained structures.
- Validate every manager, employer, vacancy, application, interview, offer, contract, qualification, and action ID.
- Enforce ownership, authority, and privacy in a trusted process or server.
- Never trust renderer-calculated suitability, security, reputation, compensation, or appointment status.
- Sanitize exports and diagnostics.

## 18. Screen-specific rules

- Dismissal state is authoritative and not negotiable unless an explicit appeal system exists
- Reasons reference committed career facts
- The workflow remains professional and nonhumiliating
- Manager history and public record update atomically

## 19. Persistence rules

Persist vacancies, immutable applications, interview answers, proposal revisions, accepted contracts, appointments, resignations, dismissals, qualifications, employment events, and audited corrections through authoritative transactions. Persist manager-private searches and notes separately. Do not persist stale suitability previews or renderer authority decisions.

## 20. Observability

Record workflow duration, status transition, issue code, conflict category, and safe outcome. Avoid recording interview answers, private offers, exact compensation, employer messages, complete identities, or manager notes in general telemetry.

## 21. Edge cases

- A vacancy closes while an application is being prepared.
- The manager changes employer or ownership context remotely.
- An offer expires or is withdrawn during review.
- The current manager is controlling a live match or unsafe transaction boundary.
- A resignation and appointment overlap.
- A qualification completes during contract negotiation.
- The same command is submitted twice.
- The host disconnects or migrates.

## 22. Acceptance criteria

1. Dismissal state is authoritative and not negotiable unless an explicit appeal system exists
2. Reasons reference committed career facts
3. The workflow remains professional and nonhumiliating
4. Manager history and public record update atomically
5. The view is bound to one manager and current authoritative career, authority, and transaction revisions.
6. Vacancy, application, interview, offer, appointment, employment, resignation, dismissal, retirement, and unemployment remain distinct.
7. All consequential career commands are revision-bound and idempotent.
8. Keyboard and assistive-technology users can complete every supported task.
9. No proprietary source-game assets, wording, likenesses, personal data, or database records are required.

## 23. Recommended tests

- Normal authorized workflow.
- Vacancy or offer expires during editing.
- Stale career or contract revision.
- Current-employment conflict.
- Appointment at a safe simulation boundary.
- Resignation and organization continuity.
- Duplicate command.
- Multiplayer ownership or host migration.
- Keyboard and screen-reader flow.
- High text scaling and right-to-left layout.

## 24. Condensed LLM implementation brief

```text
Implement Manager Dismissal and Termination for an original football-management simulation. Use stable
manager, employer, vacancy, application, interview, offer, proposal, contract,
qualification, employment, and career-event IDs; immutable revisioned read
models and proposals; authoritative eligibility, authority, contract, deadline,
compensation, appointment, resignation, and dismissal validation; professional
non-discriminatory content; safe simulation boundaries; and idempotent revision-
bound commands. Keep vacancy, application, interview, offer, appointment,
employment, resignation, dismissal, retirement, and unemployment states distinct.
Never trust renderer-calculated suitability, security, reputation, compensation,
or employment status. Support keyboard operation, accessible forms and histories,
visible focus, high text scaling, localization, and right-to-left layouts. Treat
names, messages, terms, answers, IDs, and network payloads as untrusted. Do not
copy proprietary artwork, exact wording, source code, logos, likenesses, personal
data, or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify manager dismissal and termination screen
```
