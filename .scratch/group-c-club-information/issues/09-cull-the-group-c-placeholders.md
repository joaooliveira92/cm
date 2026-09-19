# 09: Cull the Group C placeholders the dispositions leave behind

**What to build:** nothing. The placeholders for screens this group disposed or collapsed lose their
screen file, route, nav entry and screen-scope entries.

This is milestone [M1](../../../.ai/MILESTONES.md) step 5 for Group C, filed **with** the
dispositions rather than after them. Group D owed exactly this ticket, ticket 04 said to file it,
nobody did, and the debt sat in that ledger for five days before anyone noticed.

## What goes, and why

| Folder | Screen | Why |
|---|---|---|
| `clubReservesDetail/` | 36 Reserve Squad | `deferred` — `CONTEXT.md:774`, no reserve squad in v1 |
| `clubYouthDetail/` | 37 Youth Squad | `deferred` — same sentence |
| `clubHistory/`, `clubHistoryDetail/` | 43–45 | Follow **Group Q**; out of M1 |

`clubInfo/` and `finances/` also go, but they are **not** this ticket's: they are collapsed by
[06](06-club-general-information.md) and [08](08-club-finances-and-the-board-half-of-47.md), which
replace them rather than delete them, and deleting a nav destination before its replacement exists
would take the entry away from the player twice.

Likewise `clubSquadDetail/`, `clubFixturesDetail/` and `clubTransfersDetail/` belong to
[07](07-any-club-squad-fixtures-and-transfers.md), which absorbs them.

`clubs/` and `clubCompetitionsDetail/` answer to no Group C screen in the disposition table. **Rule
on each before touching it** — that is what group-d ticket 10 had to do for three unmapped `staff*`
folders, and the ruling belongs in the ledger, not in a commit message.

## Deferred still means deleted

Four of these are `deferred`, so deleting their routes can look like a re-ruling. It is not. A
`deferred` screen returns as a *real* screen when its model exists; what a placeholder does meanwhile
is claim in the nav that the screen is merely unfinished, which is indistinguishable from nearly
done. The ledger is the durable record of "wanted later" — that is what makes the stub redundant
rather than load-bearing.

## Acceptance

- [x] Each named folder is deleted with its route, nav entry and screen-scope entries
- [x] `clubs/` and `clubCompetitionsDetail/` have an explicit ruling and a ledger row each, whichever
      way they go
- [x] Any route branch left with no children goes with its children
- [x] `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns no `club*` screen that
      this group disposed
- [x] The Group C ledger records the cull as done
- [x] `pnpm check:all` green and e2e green

**Blocked by:** [06](06-club-general-information.md), [07](07-any-club-squad-fixtures-and-transfers.md)
and [08](08-club-finances-and-the-board-half-of-47.md) — each absorbs placeholders this ticket would
otherwise delete out from under them.

**Status:** resolved

## Answer

Five folders gone: `clubReservesDetail/`, `clubYouthDetail/`, `clubHistory/`, `clubHistoryDetail/`
and `clubCompetitionsDetail/`, with their routes, screen-scope entries and action rows.

### The two unmapped folders went different ways

- **`clubCompetitionsDetail/` goes.** A club's competitions at `club/$clubId/competitions`, asked
  for by no import screen and reached by no nav entry. Its content is a line on Screen 34 or a panel
  on Screen 33, not a screen. `deferred` into those, with a ledger row so the next reader does not
  re-derive that it was considered.
- **`clubs/` stays, and is not this group's.** It is the **World** section's Clubs browse entry,
  sibling to `nations` and `competitions` — both Group L's. The ticket said to check case 1 before
  ruling, and this is case 1.

### `clubHistory` cost more than a folder

It was a live Club-section nav destination, so removing it meant removing the entry, the
`CareerDestination` union member, its `CAREER_SCREEN_TYPES` row, its `ResolvedDestination` variant,
the adapter arm, the `KeyboardSpine` binding and the `NavProvider` label. Two guards caught what the
typechecker did not: `route-index` asserts every persistent career screen has a navbar home, and
`stage2` asserts every career destination is reachable in one action. Both failed while the
destination existed with no entry — which is exactly the half-deleted state they exist to catch.

The Club section loses its History item until Group Q builds it. That is the milestone's own
instruction, and an entry pointing at a WIP page was worth less than its absence.

### One placeholder deliberately survives

`clubSquadDetail/`. [Ticket 10](10-the-any-club-squad.md) is blocked on
[group-i decision request 01](../../group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md),
so Screen 35 is *coming* rather than disposed. A placeholder for a screen that is arriving is the
one case where the stub is not a lie.

So M1 exit criterion 1 is not yet met for `club*`, and that is now a precise statement rather than a
backlog: three remain, and each has a named owner — `clubs/` is Group L's, `clubSquadDetail/` is
ticket 10's, `nationClubs/` is Group L's.
