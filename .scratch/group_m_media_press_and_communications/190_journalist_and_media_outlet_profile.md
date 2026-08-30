# Screen 190: Journalist and Media Outlet Profile

> **Clean-room notice:** This specification describes an original football-management simulation inspired by early-2000s management games. Use original text, visuals, fictional media entities, fictional people, and properly licensed data only.

---

## 1. Purpose

Journalist and Media Outlet Profile presents public professional information, coverage areas, outlet reach, relationship history, reliability, interview history, and current requests for fictional or licensed media entities.

## 2. Primary user goals

- Open the journalist, outlet, past interactions, and current requests
- Review topic specialization and publication history
- Adjust manager-private contact notes
- Mute eligible optional requests without blocking mandatory obligations

## 3. Navigation context

```text
Global Application Shell
  -> Media Centre, Inbox, Match, Transfer, Person, or Club
  -> Journalist and Media Outlet Profile
  -> Related communication, entity, narrative, or event
```

The screen preserves the active manager, club, media event, topic, publication boundary, and navigation history.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Journalist, outlet, topics, reach, reliability, relationship, requests, hist |
|------------------------------------------------------------------------------|
| Media context, sources, questions, responses, status, deadlines, and actions  |
|                                                                              |
| [Related Views] [Delegate] [Respond or Publish] [Back]                        |
+------------------------------------------------------------------------------+
```

The layout is conceptual and must use an original presentation system.

## 5. Core data model

```typescript
interface MediaContactProfileModel {
  readonly careerId: string;
  readonly managerId: string;
  readonly clubId?: string;
  readonly mediaEventId?: string;
  readonly communicationRevision: number;
  readonly publicationBoundary: PublicationBoundary;
  readonly issues: readonly MediaWorkflowIssue[];
  readonly permittedActions: readonly MediaWorkflowAction[];
}
```

Renderer-facing models must be immutable per revision, serializable, permission-aware, and validated at process or network boundaries.

## 6. Principal interactions

- Open the journalist, outlet, past interactions, and current requests
- Review topic specialization and publication history
- Adjust manager-private contact notes
- Mute eligible optional requests without blocking mandatory obligations

## 7. Workflow states

- `requested`
- `scheduled`
- `in_progress`
- `awaiting_response`
- `delegated`
- `completed`
- `published`
- `embargoed`
- `corrected`
- `declined`
- `expired`
- `cancelled`
- `permission_limited`
- `failed`

Only transitions valid for the authoritative current media-event revision are enabled.

## 8. Structured communication and safety

- Questions, talking points, and responses use constrained versioned schemas.
- The system must not produce abusive, humiliating, threatening, discriminatory, or defamatory content.
- Free-form user notes remain private and are never published automatically.
- Generated responses reference current committed career facts and explicit uncertainty.
- The renderer cannot invent publishable statements or alter completed transcripts.

## 9. Public, private, and embargoed information

- Public, private, manager-only, club-only, embargoed, rumoured, and unverified states remain distinct.
- Response options are filtered to prevent accidental disclosure of private tactics, contracts, health data, credentials, or negotiations.
- Publication timing is authoritative.
- Corrections and redactions preserve an audit trail where policy requires.
- Multiplayer participants see only communication permitted for their manager and role.

## 10. Sources, rumours, and reliability

- Direct statements, official club communications, journalist reports, and rumours use different source types.
- Rumours are visibly nonauthoritative and include source, confidence, and freshness.
- Reliability is a fictional simulation signal and must not make harmful claims about real people or organizations.
- Unknown truth remains unknown. It must not leak through ordering, color, actions, or response timing.

## 11. Delegation and authority

- Media responsibility may be delegated only to eligible authorized staff.
- Delegation does not transfer broader manager authority.
- Mandatory obligations cannot be silently declined by delegation.
- Commands include stable IDs, expected revisions, authority context, and idempotency request IDs.
- A staff member leaving the club invalidates future delegated events and triggers reassignment.

## 12. Validation and conflict handling

Distinguish missing authority, stale communication revision, expired deadline, changed publication boundary, unavailable participant, delegated event, completed transcript, unsupported response, and operational failure. Preserve a valid draft where safe and offer Refresh, Review Changes, Retry, Delegate, or Return.

## 13. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Expose questions, responses, transcripts, rumours, relationships, and narratives through accessible forms, lists, grids, and headings.
- Announce the active speaker, question, deadline, publication state, and submitted response.
- Provide pause and review controls for automatically advancing sessions.
- Never communicate reliability, sentiment, publication, or relationship state by color alone.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.

## 14. Localization requirements

- Localize media-event types, questions, responses, statuses, dates, times, topics, sentiment, and plural forms.
- Preserve stable manager, club, person, outlet, journalist, event, question, answer, story, rumour, and narrative IDs.
- Preserve structured personal and organization names and native scripts.
- Use complete message templates rather than concatenated fragments.
- Speaker order, quotation marks, and transcript direction must be locale-aware.

## 15. Responsive behavior

- Wide layouts may combine event context, conversation, evidence, and relationship panels.
- Narrow layouts stack context, question, responses, evidence, and actions.
- Transcripts and long statements wrap safely without horizontal scrolling.
- Primary Respond, Publish, Delegate, Decline, Complete, and Back actions remain reachable.
- Ultrawide displays use bounded reading widths.

## 16. Performance requirements

- Keep response eligibility, narrative effects, publication filtering, and relationship calculation outside the renderer.
- Load long transcripts and histories incrementally.
- Cancel stale event, article, and reaction requests.
- Rate-limit public-reaction and narrative updates.
- Cache only permission-safe data keyed by viewer, event, publication, and career revisions.
- Avoid transporting unrelated private career state.

## 17. Security and privacy requirements

- Treat names, questions, statements, transcripts, notes, outlet data, and network payloads as untrusted.
- Render text safely through constrained blocks, not arbitrary executable markup.
- Validate every manager, club, person, outlet, event, question, response, and action ID.
- Enforce authority and publication boundaries in a trusted process or server.
- Never trust renderer-calculated response eligibility, truth state, sentiment, relationship, or publication status.
- Sanitize exports and diagnostics.

## 18. Screen-specific rules

- Profiles must use fictional or licensed identities
- Reliability is a simulation assessment, not a defamatory real-world claim
- Private contact details are not exposed
- Manager notes remain private and untrusted

## 19. Persistence rules

Persist immutable questions and answers, event schedules, delegation, publication events, official statements, transcripts, corrections, response outcomes, relationship events, and public narratives through authoritative transactions. Persist manager-private notes separately. Do not persist stale previews or renderer-derived publication decisions.

## 20. Observability

Record workflow duration, event type, issue codes, outcome category, delegation state, and safe publication status. Avoid recording complete transcript text, private terms, health details, private notes, full identities, or embargoed content in general telemetry.

## 21. Edge cases

- A deadline or publication boundary changes while editing.
- A fixture, transfer, person, or club state changes before response submission.
- A delegated staff member leaves or loses authority.
- A rumour is confirmed, disproven, or expires.
- A transcript receives an audited correction.
- Another manager completes the same shared obligation.
- The same command is submitted twice.
- The host disconnects or migrates.

## 22. Acceptance criteria

1. Profiles must use fictional or licensed identities
2. Reliability is a simulation assessment, not a defamatory real-world claim
3. Private contact details are not exposed
4. Manager notes remain private and untrusted
5. The view is bound to one manager, media event, publication boundary, and communication revision.
6. Requested, scheduled, delegated, completed, published, corrected, expired, and failed states remain distinct.
7. All consequential communication commands are revision-bound and idempotent.
8. Keyboard and assistive-technology users can complete every supported task.
9. No proprietary source-game assets, wording, journalism, likenesses, personal data, or database records are required.

## 23. Recommended tests

- Normal authorized workflow.
- Stale media-event revision.
- Deadline or embargo change.
- Delegated staff member becomes unavailable.
- Private-information disclosure prevention.
- Rumour confirmation or expiration.
- Duplicate response or publication command.
- Multiplayer concurrent completion or host migration.
- Keyboard and screen-reader flow.
- High text scaling and right-to-left layout.

## 24. Condensed LLM implementation brief

```text
Implement Journalist and Media Outlet Profile for an original football-management simulation. Use stable
manager, club, person, journalist, outlet, event, question, response, story,
rumour, transcript, and narrative IDs; immutable revisioned read models and
communication records; constrained safe response schemas; authoritative
permissions and publication boundaries; explicit public, private, embargoed,
rumoured, and corrected states; professional nonabusive content; cancellable
queries; and idempotent revision-bound commands. Never trust renderer-created
statements, truth state, sentiment, publication status, or relationship effects.
Support keyboard operation, accessible conversations and transcripts, visible
focus, high text scaling, localization, and right-to-left layouts. Treat names,
questions, responses, notes, transcripts, outlet data, IDs, and network payloads
as untrusted. Do not copy proprietary artwork, exact wording, source code, logos,
likenesses, journalism, personal data, or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify journalist and media outlet profile screen
```
