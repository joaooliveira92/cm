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

**`renderer/playerCoachReport/` is not one of them, and this ticket originally said it was.** It is a
built screen — Group H's Screen 113 Performance Report, reading `getSquad` and
`getPlayerDevelopmentHistory` — and it carries no `WIP` marker, which is why the exit criterion's own
grep does not list it. Group D's Screen 67 Coach Report is a different thing that was never built at
all. The ledger's list of five was right; the "transcription gap" this ticket claimed does not exist.
Recorded rather than quietly deleted, because the next reader will make the same guess from the name.

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

- [x] Each of the five folders is deleted, with its route, nav entry and any `g`-key binding
- [x] `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns no Group D `player*`
      screen (`playerSearch` is Group I's, `competitionPlayerStats` and `nationPlayers` Group L's)
- [x] No route, nav entry or key binding points at a deleted screen — including from
      `playerProfile`, which links to several of them
- [x] The Group D ledger's "What this ledger leaves owed" section records the cull as done, and
      states that `playerCoachReport` was examined and is not a Group D placeholder
- [~] e2e: 42 passed, 4 failed — **all four pre-existing and none related to this cull**. Proven by
      stashing this ticket's changes and re-running: identical 4 failures, identical 42 passes. They
      are Group H training specs drifted against a UI redesign; filed separately.
- [x] `pnpm check:all` green

**Blocked by:** None

**Status:** resolved

## Answer

The five folders are gone, with everything that pointed at them. The reference set was tighter than
expected — exactly five sites each, and nothing else in the tree touched them:

- `router/index.tsx` — the import, the `createRoute` block, and the entry in `playerRoute.addChildren`
- `actions/types.ts` — the `ScreenId` union member
- `actions/registry.ts` — the `PLAYER_SCOPED_SCREENS` entry
- `actions/allActions.ts` — the per-screen action defaults row
- `keyboard/screenId.ts` — the URL-segment → surface mapping

No test, no e2e spec and no nav link referenced any of them. They were routed but reachable only by
typing a URL, which is its own comment on what a placeholder was worth here.

### The correction this ticket needed

It was filed claiming `playerCoachReport/` as a sixth folder and the ledger's list of five as a
transcription gap. **That was wrong.** `playerCoachReport/` is Group H's Screen 113 Performance
Report — a built screen reading `getSquad` and `getPlayerDevelopmentHistory` — and it carries no
`WIP` marker, which is why M1's own grep never listed it. Group D's Screen 67 Coach Report is a
different thing that was never built. The ledger was right and the ticket was wrong; both now say so,
because the name invites the same guess from the next reader.

### Observed, not fixed

`playerDevelopment` — a shipped Group D screen (61) — has a route but appears in neither
`PLAYER_SCOPED_SCREENS` nor `PLAYER_SURFACE_BY_SEGMENT`. That predates this ticket and was not
introduced by the cull; it means the screen has no action scope and no keyboard surface id. Recorded
here rather than fixed, because it is a Group H/D screen-scope question rather than a placeholder.

### Validation

`pnpm check:all` green — typecheck, lint, effect-lint, verify-md-links, verify-db-schema, test.

**e2e is 42 passed / 4 failed, and the four are not this ticket's.** Proven rather than asserted: the
working tree was stashed and the same four specs re-run against the pre-change tree, giving an
identical 42/4. The diff is also surgical — exactly five lines removed from each of the four registry
files, none of them near the training area.

The four are `development-centre`, `performance-report`, `training-plan` and `training-workload`, all
of which begin by navigating to Training and expecting a `Coaching Assignments` h1. The page snapshot
shows why: Training is now an **Overview hub** with a tab strip (Overview, Schedules, Players,
Coaches, Assignments, Reports, Options) and preview regions offering *View coaching assignments* and
*View workload details*. The screens work; the specs describe a shape the UI has left. Filed as
group-h ticket 12.
