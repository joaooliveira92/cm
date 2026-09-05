# 01: One home for "the current season row"

**What to build:** a single `apps/desktop/src/main/season/currentSeason.ts` exporting `SeasonRow`,
`SeasonPhase`, `loadSeasonRow`, `toSeasonView` and `isWindowOpen`, with all seven existing
implementations routed through it.

The same meaning -- "the save's current season" -- is currently written seven times:
`season.ts` (`SeasonRow`/`loadSeasonRow`/`toSeasonView`), `transfers.ts` (a byte-for-byte duplicate
of that block, differing only in spelling `phase` as an inline union instead of
`typeof SEASON_PHASES[number]`), `decider.ts`, `managerProfile.ts` and `training.ts` (three
`ORDER BY season_number DESC LIMIT 1` variants), and `match.ts` and `squad.ts`
(`(SELECT MAX(season_number) FROM season)` sub-selects).

Do this **first**. It is low risk on its own, and both 02 and 03 have to touch these same blocks --
collapsing them first means those tickets move one definition instead of reconciling two.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] `main/season/currentSeason.ts` exists and is the only place the current-season query is written.
- [ ] All seven call sites read from it; no `ORDER BY season_number DESC LIMIT 1` and no
      `SELECT MAX(season_number)` remains anywhere else in `src/main`.
- [ ] The `phase` type is spelled one way, derived from `SEASON_PHASES` in contracts.
- [ ] Pure move: no query returns a different row than it did before, and no signature changes.
- [ ] `pnpm check:all` is green at this commit.
