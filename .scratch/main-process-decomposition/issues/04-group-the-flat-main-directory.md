# 04: Group the flat `main/` directory into subfolders

**What to build:** `apps/desktop/src/main/` currently holds ~30 files at one level. After 02 and 03
land, `season/`, `transfers/` and `db/` exist and the barrel pattern is proven; extend it to the rest.

```
main/
  index.ts       entry -- MUST stay at this exact path (vite.main.config.ts:9)
  rpc/           rpcServer.ts logging.ts keybindings.ts
  db/            schema.ts migrations.generated.ts createSaveSchema.ts
  world/         worldGeneration.ts leagueSelection.ts saves.ts displayNames.ts
  career/        managerProfile.ts managerStatus.ts staff.ts clubSelection.ts news.ts
  club/          squad.ts tactics.ts training.ts scouting.ts development.ts aiClubs.ts
  season/        (from 02) + decider.ts
  transfers/     (from 03)
  match/         match.ts
```

Measured cost: ~161 import lines (67 intra-`main`, 94 in `test/` and `e2e/`). All mechanical.
`saves.ts` (29 edits) and `squad.ts` (22) are 32% of that on their own -- if the cost is not worth
it, leaving those two at `main/` root as shared leaves captures most of the benefit.

Lower value than 01-03; do it only once those are settled.

**Blocked by:** 02, 03.

**Status:** ready-for-agent

- [ ] `main/index.ts` is still at exactly `apps/desktop/src/main/index.ts`, and `pnpm build` was run
      to prove packaging still resolves -- no test covers this.
- [ ] `test/aiClubs.test.ts`'s path-based layering assertion was updated and confirmed to still
      actually assert (it fails open if the path is wrong).
- [ ] `test/display-names.test.ts`, which walks `../src/main` recursively, still passes.
- [ ] `pnpm check:all` is green at this commit.

## Execution decisions (2026-09-05, round 2)

Measured again after 02, 03 and 05 landed. `main/` holds 21 loose `.ts` files; `db/`, `season/`
and `transfers/` already exist. Import sites by module:

```
31 saves        14 leagueSelection   6 clubSelection   4 news            3 logging
30 squad        12 tactics           5 worldGeneration 4 managerProfile  3 keybindings
18 decider      10 displayNames      5 match           4 aiClubs         2 rpcServer
                 9 managerStatus     4 staff           3 training        1 development
```

**The `saves.ts` / `squad.ts` escape hatch above is declined.** Leaving two loose files sitting
among six folders recreates exactly the two-competing-schemes problem that ticket 07 exists to fix
in the renderer; accepting it here would be inconsistent. The hatch was written for when the cost
is not worth it, and the cost changed: ticket 05 landed, so `test/` is now typechecked and a
missed import fails in seconds instead of hiding until a 15-minute vitest run.

**`match/` is a real module, not a one-file directory.** `match.ts` is 577 lines with four exported
functions, one of which (`startMatch`) is 300 lines on its own. Moving it to `match/index.ts` would
put a 577-line body where every other module in `main/` has a thin barrel. Split it the way
`season/` and `transfers/` were split -- `start.ts`, `queries.ts`, `commands.ts` and a barrel --
following the seams already in the file.

Everything else in this ticket is a pure move behind a barrel.
