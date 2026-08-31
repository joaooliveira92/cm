# Screen 135: Transfer Negotiation

> **Clean-room notice:** This specification describes an original football-management simulation inspired by early-2000s management games. Use original text, visuals, fictional people, and properly licensed data only.

---

## 1. Purpose

Transfer Negotiation manages counteroffers and revisions between clubs while preserving offer history, deadlines, authority, budget impact, clause compatibility, and final agreement status.

## 2. Primary user goals

- Review the chronological offer history
- Accept, reject, withdraw, or submit a counteroffer
- Compare the current proposal with prior revisions
- Open related player, club, budget, and clause details

## 3. Navigation context

```text
Global Application Shell
  -> Transfer Centre, Player, Staff, Contract, or Finance
  -> Transfer Negotiation
  -> Related offer, negotiation, clause, registration, or completion workflow
```

The screen preserves the active club, manager, transfer window, transaction revision, and navigation context.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Negotiation history, current proposal, counteroffer editor, deadline, author |
|------------------------------------------------------------------------------|
| Transaction terms, status, deadlines, validation, history, and actions        |
|                                                                              |
| [Related Views] [Revise] [Primary Decision] [Back]                            |
+------------------------------------------------------------------------------+
```

The layout is conceptual and must use an original presentation system.

## 5. Core data model

```typescript
interface TransferNegotiationModel {
  readonly clubId: string;
  readonly managerId: string;
  readonly transactionId?: string;
  readonly transactionRevision: number;
  readonly transferWindowId?: string;
  readonly issues: readonly TransferWorkflowIssue[];
  readonly permittedActions: readonly TransferWorkflowAction[];
}
```

Renderer-facing models must be immutable per revision, serializable, permission-aware, and validated at process or network boundaries.

## 6. Principal interactions

- Review the chronological offer history
- Accept, reject, withdraw, or submit a counteroffer
- Compare the current proposal with prior revisions
- Open related player, club, budget, and clause details

## 7. Transaction lifecycle states

- `draft`
- `submitted`
- `received`
- `negotiating`
- `countered`
- `accepted_provisionally`
- `agreed`
- `awaiting_conditions`
- `scheduled`
- `completed`
- `rejected`
- `withdrawn`
- `expired`
- `failed`
- `cancelled`

The screen must expose only transitions valid for the authoritative current state.

## 8. Offers, agreements, and completion

- An offer is a proposal.
- A negotiation contains immutable proposal revisions.
- An agreement may remain conditional.
- Completion creates canonical employment, registration, payment, and squad changes.
- Registration may occur after contractual completion according to competition rules.
- The UI must not collapse these stages into one ambiguous status.

## 9. Money and clauses

- Every monetary value uses explicit currency, minor units, and payment period where relevant.
- Upfront, installment, conditional, wage, bonus, signing, representative, compensation, and tax-like costs remain distinct.
- Clauses use trusted versioned schemas with typed bounds.
- Converted values are presentation only and identify the applicable career exchange context.
- Total-cost previews disclose assumptions and uncertainty.

## 10. Drafts and authoritative commands

- Editing produces a revisioned offer, negotiation, contract, clause, cancellation, or completion draft.
- The trusted service validates permission, budget, dates, transfer windows, contracts, representation, squad capacity, and competition rules.
- Commands use stable IDs, expected revisions, authority, and idempotency request IDs.
- Duplicate submissions return the original result.
- Shared multiplayer workflows use authoritative locks, leases, or optimistic conflicts.

## 11. Deadlines and concurrency

- Deadlines are authoritative and may expire while the screen is open.
- Offer and negotiation revisions are immutable.
- Only the current valid proposal can transition.
- Remote counteroffers invalidate stale local drafts.
- The user must review changed terms before acceptance.
- Clock display and timezone presentation never change canonical deadlines.

## 12. Knowledge, privacy, and representation

- Interest, wage expectations, availability, competing offers, and representative demands may be unknown or estimated.
- Private negotiations, contracts, notes, and budgets follow viewer permissions.
- Hidden exact values must not leak through sorting, colors, result counts, exports, or accessibility labels.
- Representative identity and communication data require fictional or licensed content.

## 13. Validation and errors

Distinguish stale proposal, expired deadline, changed budget, withdrawn offer, unavailable person, invalid clause, missing authority, transfer-window closure, registration failure, and operational error. Preserve valid drafts where safe and offer Refresh, Review Changes, Revise, Retry, or Return.

## 14. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Expose terms, clauses, installments, comparisons, and histories through accessible forms, tables, lists, and headings.
- Associate every validation issue with the relevant term.
- Announce proposal changes, deadlines, acceptance, rejection, and completion without exposing private terms in shared contexts.
- Never communicate status or affordability by color alone.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.

## 15. Localization requirements

- Localize statuses, dates, durations, money, percentages, counts, roles, clauses, and plural forms.
- Preserve stable player, staff, club, offer, contract, clause, payment, registration, and transaction IDs.
- Preserve structured personal names and native scripts.
- Use complete legal-style simulation messages rather than concatenated fragments.
- Keep home, away, buyer, seller, employer, and employee semantics clear in RTL layouts.

## 16. Responsive behavior

- Wide layouts may combine term editor, financial summary, history, and validation panels.
- Narrow layouts stack terms, clauses, budget effects, warnings, and actions.
- Long monetary values and clause descriptions wrap safely.
- Primary Accept, Reject, Submit, Complete, Cancel, and Back actions remain reachable.
- Ultrawide displays use bounded working widths.

## 17. Performance requirements

- Keep affordability, clause validation, negotiation transitions, and completion planning outside the renderer.
- Recalculate only affected terms and totals.
- Cancel stale previews and rule checks.
- Virtualize long transaction histories.
- Cache only permission-safe data keyed by transaction, budget, contract, policy, and career revisions.
- Avoid transporting the complete club finance ledger.

## 18. Security and integrity requirements

- Treat names, messages, clauses, representative data, imported terms, and network payloads as untrusted.
- Render text safely and parse structures through strict schemas.
- Validate every person, club, offer, contract, clause, payment, registration, and action ID.
- Enforce manager and club authority in a trusted process or server.
- Never trust renderer-calculated affordability, totals, eligibility, deadlines, or completion state.
- Sanitize exports and diagnostics.

## 19. Screen-specific rules

- Every counteroffer creates a new immutable negotiation revision
- Only the current valid proposal can be accepted
- Expired or withdrawn negotiations are read-only
- Duplicate commands return the original response

## 20. Persistence rules

Persist immutable proposal revisions, accepted agreements, contracts, payment schedules, clauses, registration records, completion events, cancellation outcomes, and audit events through authoritative transactions. Do not persist stale previews, invalid drafts, renderer totals, plaintext secrets, or private data in public scopes.

## 21. Observability

Record transition duration, issue codes, deadline conflicts, idempotency outcome, and safe completion categories. Avoid recording exact private terms, wages, budgets, representative communications, player identities, or negotiation prose in general telemetry.

## 22. Edge cases

- A person changes club, contract, representation, availability, or eligibility.
- A transfer window or deadline closes during editing.
- A budget changes because another transaction completes.
- A remote counteroffer arrives during local revision.
- Registration rules or squad capacity change.
- One party withdraws while the other submits.
- The same command is sent twice.
- The host disconnects or migrates.

## 23. Acceptance criteria

1. Every counteroffer creates a new immutable negotiation revision
2. Only the current valid proposal can be accepted
3. Expired or withdrawn negotiations are read-only
4. Duplicate commands return the original response
5. The view is bound to one club, manager, transaction, and current authoritative revision.
6. Draft, submitted, negotiated, agreed, completed, cancelled, expired, and failed states remain distinct.
7. All consequential commands are revision-bound and idempotent.
8. Keyboard and assistive-technology users can complete every supported task.
9. No proprietary source-game assets, wording, likenesses, personal data, or database records are required.

## 24. Recommended tests

- Normal authorized workflow.
- Stale offer or transaction revision.
- Deadline or transfer-window expiry.
- Budget changes during negotiation.
- Remote counteroffer conflict.
- Invalid clause or payment schedule.
- Duplicate command.
- Multiplayer host disconnect or migration.
- Keyboard and screen-reader flow.
- High text scaling and right-to-left layout.

## 25. Condensed LLM implementation brief

```text
Implement Transfer Negotiation for an original football-management simulation. Use stable
person, club, offer, negotiation, contract, clause, payment, registration, and
transaction IDs; immutable proposal revisions; authoritative permissions,
budgets, windows, deadlines, representation, contract, squad, and registration
validation; typed money and clause structures; cancellable previews; atomic
completion; and idempotent revision-bound commands. Keep offer, agreement,
completion, employment, payment, and registration states distinct. Never trust
renderer-calculated totals, affordability, eligibility, or deadlines. Support
keyboard operation, accessible terms and histories, visible focus, high text
scaling, localization, and right-to-left layouts. Treat names, terms, clauses,
communications, IDs, and network payloads as untrusted. Do not copy proprietary
artwork, exact wording, source code, logos, likenesses, personal data, or
databases.
```

## Suggested Git commit

```text
docs(game-ui): specify transfer negotiation screen
```
