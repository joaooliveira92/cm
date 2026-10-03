# 07: Move the six remaining renderer root screens into feature folders

Type: task
Status: resolved

**What to build:** commit `0890d19` moved most renderer screens into feature folders
(`renderer/squad/`, `renderer/transfers/`, `renderer/news/`, ...) but left six files at
`renderer/` root:

| File | Lines |
|---|---|
| `KeyboardSpine.tsx` | 360 |
| `TacticsScreen.tsx` | ~300 |
| `SeasonSummaryScreen.tsx` | ~250 |
| `ManagerProfileScreen.tsx` | ~200 |
| `FixturesScreen.tsx` | ~180 |
| `LeagueTableScreen.tsx` | ~170 |

The root then reads as a mix of two organising schemes, and an agent scanning `renderer/` cannot
tell whether a screen lives at root or in a folder without listing both.

Give each a feature folder alongside its siblings. The genuinely cross-cutting root files
(`main.tsx`, `rpc.ts`, `focus.ts`, `format.ts`, `hotkeys.ts`, `theme.ts`, `window.d.ts`) stay put --
they are app-wide, not screens.

`KeyboardSpine.tsx` is claimed by `.scratch/react-composition-audit/issues/06`, which splits its
*contents*. Move the file, do not restructure it; leave the split to that ticket.

**Blocked by:** 05 (do it after the tests are typechecked, so a missed import is caught by a gate
rather than by a 15-minute vitest run).

Landed as: `keyboard/KeyboardSpine.tsx`, `tactics/TacticsScreen.tsx`,
`seasonSummary/SeasonSummaryScreen.tsx`, `managerProfile/ManagerProfileScreen.tsx`,
`fixtures/FixturesScreen.tsx`, `leagueTable/LeagueTableScreen.tsx`. The seven cross-cutting root
files stayed put. `test/renderer-boundary-lint.test.ts`'s path literals moved with the files and
`isBoundaryEnforced` still returns `true` for every one of them.

- [ ] `vite.renderer.config.ts`'s entry still resolves and `pnpm build` was run. *Entry verified by
  inspection -- `root` is `src/renderer` and neither `index.html` nor `main.tsx` moved -- but
  `pnpm build` was NOT run: the working tree carries another agent's in-flight `src/main` changes.*
- [x] Pure moves. No component was restructured, renamed or split in this ticket.
- [ ] `pnpm check:all` is green at this commit. *Ran `typecheck`, `lint`, `effect-lint`,
  `verify-md-links` and the affected specs; the full `test` gate is the orchestrator's.*
