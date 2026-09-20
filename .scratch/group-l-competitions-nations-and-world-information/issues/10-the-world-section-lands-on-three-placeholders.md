# 10: The World section's three entries all land on placeholders

Split out of [ticket 09](09-cull-the-group-l-placeholders.md) on 2026-09-20, which culled eighteen
`deferred` drill-downs and kept these three because they are **live nav destinations**, not
URL-only stubs.

## What is wrong

The World section offers Competitions, Nations and Clubs. All three render
`WIP — Placeholder screen`:

| Entry | Screen | What exists behind it |
|---|---|---|
| Competitions | `competitions/` | Every competition in the save, and **Screen 161 Competition Overview now exists** for each |
| Nations | `nations/` | `nations` and `cities` rows exist; every Group L nation *screen* is `deferred` |
| Clubs | `clubs/` | Every club, and Screens 34, 38, 39, 40 and 42 all exist per club |

This is the same defect group-c ticket 02 fixed for Club → Staff, three times over: a nav entry
promising a screen while a real one sits a route away.

## Competitions is the urgent one

[Ticket 08](08-competition-overview.md) built Screen 161 as the competition branch's landing page,
and it links to Table, Fixtures and Results. **Nothing links to it.** Until this entry lists the
save's competitions, that whole branch — four screens, three of them shipped weeks ago — is
reachable only by typing a URL.

Clubs is the same shape and nearly as strong: five club screens exist and the only way into any of
them is a league-table row, which reaches only the clubs in the manager's own division.

**Nations is the weak one, and may not be worth building.** Every nation screen Group L charted is
`deferred` — overview, competitions, clubs, fixtures, history, players, squads, staff — so a Nations
list would link to nothing. Ruling it removed, with its nav entry, is a legitimate answer and
probably the right one; say which and why rather than building a list of dead ends.

## What each list owes

A row per entity, named through the content pack, linking to the screen that exists for it. Nothing
more: these are browse lists, not dashboards, and neither has a model of its own to show.

Read the [ledger](../../../docs/specs/group_l_competitions_nations_and_world_information/RECONCILIATION.md)
before adding a column. Competition statistics, records and history are all `deferred`, and a browse
list is exactly where a stray "titles won" column would look harmless.

## Acceptance

- [ ] World → Competitions lists the save's competitions, each reaching its Overview (Screen 161)
- [ ] World → Clubs lists the save's clubs, each reaching a club screen that exists
- [ ] Nations is either built or removed with its nav entry, and the ledger records which and why
- [ ] No column sourced from a model the ledger says does not exist
- [ ] `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns no `competition*` or
      `nation*` screen, and no `clubs/`
- [ ] An e2e spec reaches Screen 161 **through the navbar**, retiring the by-address entry the
      competition specs currently use
- [ ] `pnpm check:all` green and `pnpm --filter @cm-clone/desktop test:e2e` green

**Blocked by:** None.

**Status:** ready-for-agent
