# 06: Mirror `apps/desktop/test/` onto the `src/` tree

Type: task
Status: resolved

## Landed 2026-09-05

Commit `7cd45a0` did the move. `apps/desktop/test/` is now 99 spec files across 31 directories
mirroring `src/main/` and `src/renderer/`, on one kebab-case convention. Same file count as before,
so nothing was dropped. `test/setup/` stayed put (`vitest.config.ts` names it directly).

Ticket 13 then split the last flat file, `test/season.test.ts`, into eight specs under
`test/main/season/`. **Nothing is left at `test/` root**: 106 spec files across 33 directories,
every one of them mirroring the source module it covers.


**What to build:** `apps/desktop/test/` is 100 files at one level, with no grouping and two
competing naming conventions in the same directory (`leagueSelection.test.ts` beside
`league-selection-screen.test.ts`, `managerProfileScreen.test.ts` beside
`manager-profile-screen.test.ts`). All three `packages/*/test` directories already mirror their
`src/` layout; only the desktop app does not.

The cost is navigational and falls entirely on agents. There is no way to go from a source file to
its specs except by guessing at the slug, and the two naming conventions mean a guess that misses
looks like "no test exists" rather than "wrong spelling".

Target: `test/main/<area>/`, `test/renderer/<feature>/` and `test/shared/` mirroring
`src/main/` and `src/renderer/`, one convention throughout (kebab-case file names,
`<subject>.test.ts`).

**Blocked by:** 04, 05, 07. Every one of those moves source paths, and this ticket rewrites the
relative import in all ~100 spec files. Doing it first means doing it twice.

- [ ] `vitest.config.ts`'s `include` still matches (`test/**/*.test.{ts,tsx}` already recurses).
- [ ] The two path-walking specs still work: `test/aiClubs.test.ts` (reads `../src/main/aiClubs.ts`
      by path and **fails open**) and `test/display-names.test.ts` (walks `../src/main`
      recursively). Confirm both still actually assert, not just pass.
- [ ] The spec count before and after is identical -- this is a pure move, nothing merged or dropped.
- [ ] `pnpm check:all` is green at this commit.
