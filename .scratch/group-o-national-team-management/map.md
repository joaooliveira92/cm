# Map: Group O — National Team Management

Label: `wayfinder:map`

## Destination

A reconciliation spec and deviation register for screens 208–221 (National Team Management Centre
through International Management History), stating per screen what the implementation must do and
what deviations exist from the imported spec at
`docs/specs/group_o_national_team_management/`.

## Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer.

**Existing Agent Note**: [National teams are deferred, not ruled out]
(../../../.agents/notes/implemented/architecture/2026-09-13-national-teams-deferred-not-ruled-out.md)
already settles this group: deferred, unscheduled. CONTEXT.md's **Nationality** entry confirms
"national teams are not modelled" and lists them as deferred.

**Grounding**: all 14 screens are absent from the shipped renderer, RPC layer, schema, and shared
domain — no stubs, no routes, no components. CONTEXT.md:102-103 explicitly states "work permits and
national teams are not modelled."

## Decisions so far

- [01 — Screen inventory](issues/01-screen-inventory.md): all 14 screens are Absent — no routes, no
  stubs, no RPCs, no DB tables, no components. CONTEXT.md:103 confirms "national teams are not
  modelled."
- [02 — v1 scope](issues/02-v1-scope.md): the existing deferred decision holds. All 14 screens stay
  out of v1, deferred unscheduled.

## Not yet specified

Nothing. The existing Agent Note and CONTEXT.md settle the scope.

## Out of scope

This map produces a deviation register — everything here is deferred per the existing note, not
out of scope. Will any screen land `out-of-scope` in the register? Only if a shipped screen
contradicts it. None do — these screens are merely absent.

- **Screens 208–221 as imported.** All deferred per the existing Agent Note. Building national teams
  would require international fixtures in the Calendar, eligibility (a second Nationality per player),
  and club-release rules — a new effort with its own map.