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

- [ ] Each named folder is deleted with its route, nav entry and screen-scope entries
- [ ] `clubs/` and `clubCompetitionsDetail/` have an explicit ruling and a ledger row each, whichever
      way they go
- [ ] Any route branch left with no children goes with its children
- [ ] `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns no `club*` screen that
      this group disposed
- [ ] The Group C ledger records the cull as done
- [ ] `pnpm check:all` green and e2e green

**Blocked by:** [06](06-club-general-information.md), [07](07-any-club-squad-fixtures-and-transfers.md)
and [08](08-club-finances-and-the-board-half-of-47.md) — each absorbs placeholders this ticket would
otherwise delete out from under them.

**Status:** ready-for-agent
