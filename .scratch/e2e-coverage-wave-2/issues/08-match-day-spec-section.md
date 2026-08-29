Type: task
Status: ready-for-agent
Blocked by: None (can start immediately)

## Work

A spec section documenting the match day structural extension — sub panel smoke assertions extending `app.spec.ts`, and the substitution click-through journey in `journeys.spec.ts`. Records force-off as intentionally skipped per the Agent Note.

## Decisions

- Force-off e2e skipped; sub interaction gets full click-through flow in journeys.spec.ts; structural sub panel assertions extend existing smoke in app.spec.ts. See [Agent Note](../../../.agents/notes/implemented/testing/2026-08-28-match-day-structural-extension.md).

- [ ] Spec documents sub panel smoke additions (structural elements in app.spec.ts)
- [ ] Spec documents substitution journey (click-through flow in journeys.spec.ts)
- [ ] Spec records force-off as intentionally skipped with rationale
- [ ] Section does not introduce new decisions not covered by the Agent Note