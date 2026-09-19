# 09: The five disposed player screens lose their placeholders

**What to build:** nothing. Five routed WIP placeholders for screens this effort already disposed are
deleted — the screen file, the route, the nav entry and the `g`-key binding for each.

This is the ticket [ticket 04](04-remaining-screens-disposition.md) said to file and nobody did. The
Group D ledger records the debt under
[What this ledger leaves owed](../../../docs/specs/group_d_player_and_staff_records/RECONCILIATION.md),
and it is milestone [M1](../../../.ai/MILESTONES.md) step 5.

## The five

| Folder | Screen | Kind |
|---|---|---|
| `renderer/playerAttributes/` | 51 Player Attributes | `renamed` — the Squad table's columns |
| `renderer/playerForm/` | 53 Player Form | `deferred` — no match-rating history model |
| `renderer/playerHistory/` | 55 Player History | `deferred` — no persisted career timeline |
| `renderer/playerInjuries/` | 59 Player Injuries | `deferred` — injury is a per-match event, not a record |
| `renderer/playerScoutReport/` | 68 Player Scout Report | `deferred` — player-level scouting is inline |

`renderer/playerCoachReport/` is also routed and answers to Screen 67 Coach Report, which the ledger
disposes `out-of-scope` under the closed role set. It is in scope here for the same reason the five
are, and the ledger's list omitting it is a transcription gap this ticket closes rather than inherits.

## Deferred still means deleted, and that is the point

Four of the five are `deferred` — wanted, in scope, not built — so deleting their routes can look
like overreach. It is not, and M1's exit criterion is written to say so: each screen is "either real
or deleted."

A `deferred` screen comes back as a *real* screen when its model exists. What a placeholder does
meanwhile is claim, in the nav and in the route list, that the screen is merely unfinished — which is
indistinguishable from one that is nearly done, and is exactly the confusion this milestone exists to
end. The ledger is where "we want this later" is recorded durably; a WIP stub is a worse record of it
that costs a route.

## Acceptance

- [ ] Each of the six folders is deleted, with its route, nav entry and any `g`-key binding
- [ ] `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns no `player*` screen
- [ ] No route, nav entry or key binding points at a deleted screen — including from
      `playerProfile`, which links to several of them
- [ ] The Group D ledger's "What this ledger leaves owed" section records the cull as done, and
      names `playerCoachReport` among what went
- [ ] e2e is green, not just unit tests: these screens are reachable and the specs know it
- [ ] `pnpm check:all` green

**Blocked by:** None

**Status:** ready-for-agent
