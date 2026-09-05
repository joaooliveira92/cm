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
