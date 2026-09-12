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

**Status:** resolved

- [x] `main/index.ts` is still at exactly `apps/desktop/src/main/index.ts`, and `pnpm build` was run
      to prove packaging still resolves -- no test covers this. (`pnpm --filter @cm-clone/desktop
      build:main` -- 123 modules, 373.58 kB. The renderer half of `pnpm build` was skipped: a second
      agent was mid-reorganisation of `src/renderer/**` in the same worktree and its failures would
      not have been about this ticket.)
- [x] `test/aiClubs.test.ts`'s path-based layering assertion was updated and confirmed to still
      actually assert (it fails open if the path is wrong). Now reads
      `../src/main/club/aiClubs.ts`; the path was resolved and the file's 15008 bytes read back
      outside vitest to prove the assertion has something to assert against. `test/scouting.test.ts`
      carries the same shape of path-based assertion and was repointed at
      `../src/main/club/scouting.ts` alongside it.
- [x] `test/display-names.test.ts`, which walks `../src/main` recursively, still passes. It walks
      `main/` recursively and skips `prototype-scale-probe`, so the new subfolders are covered by
      the same walk.
- [ ] `pnpm check:all` is green at this commit. Run gate by gate instead, because the worktree was
      shared with a second agent: `pnpm -r typecheck` (clean -- only pre-existing `TS3771..`
      suggestions), `oxlint .` (one error, and it is the other agent's `src/renderer/transfers`
      duplicate import, not this ticket's), `pnpm effect-lint` (0 violations, 507 files),
      `pnpm verify-db-schema`, `pnpm verify-md-links` (788 files, all links resolve), and the whole
      desktop vitest suite -- 99 files, 1010 tests, all passing in 908s. Left unrun: `pnpm -r test`
      for `packages/*`, which this ticket does not touch, and `check:all` as a single command.

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

## What landed

```
main/
  index.ts       unmoved -- vite.main.config.ts:9
  rpc/           rpcServer.ts logging.ts keybindings.ts + index.ts
  db/            unchanged (schema.ts stays drizzle-pinned)
  world/         worldGeneration.ts leagueSelection.ts saves.ts displayNames.ts + index.ts
  career/        managerProfile.ts managerStatus.ts staff.ts clubSelection.ts news.ts + index.ts
  club/          squad.ts tactics.ts training.ts scouting.ts development.ts aiClubs.ts + index.ts
  season/        + decider.ts
  transfers/     unchanged
  match/         start.ts stream.ts view.ts queries.ts commands.ts + index.ts
```

`decider.ts` sits under `season/` but is deliberately **not** on the season barrel, the same way
`currentSeason.ts` is not: it is an event-stream primitive the whole main process appends through,
not part of what a *season* offers. Its call sites name `season/decider.js` directly.

`match.ts` split along the seams the execution decisions called for, plus two internal modules the
seams demanded: `stream.ts` (the persisted `Persisted*` shapes and the pure `deriveMatchEvents` over
them) and `view.ts` (`buildResumeSimulationView` and the chunking constants), because `start`,
`queries` and `commands` all three need them. `start.ts` holds `startMatch` and its kickoff
snapshot; `queries.ts` holds `listOpponentClubs` and `resumeSimulation`; `commands.ts` holds
`submitMatchCommand`. No function body changed.

Intra-`main` imports name the concrete file (`../club/squad.js`), not a sibling barrel. Barrels are
for call sites outside `main/`. Routing `career -> club -> transfers -> career` through barrels
would have closed a module-init cycle that ESM resolves at runtime and no gate here catches.
