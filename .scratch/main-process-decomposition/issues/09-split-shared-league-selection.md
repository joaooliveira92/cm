# 09: Split `packages/shared/src/setup/leagueSelection.ts` (716 lines)

Type: task
Status: resolved

**What to build:** four independent concerns behind one name, already separated by banner comments
that cite their spec sections:

| Concern | Spec | Roughly |
|---|---|---|
| Intent and effective selection | §19 | types + `resolveSelection` (~230 lines) |
| Issues and validation gating | §16, §17 | codes, `blockingIssues`, `canContinue` |
| Active-leagues projection | §12 | `projectActiveLeagues` (~100 lines) |
| Nation rows and mode transitions | §7, §9.5 | `nationSelectionState`, `applyModeChange` |

Its spec, `packages/shared/test/setup/leagueSelection.test.ts`, is 699 lines and splits the same way.

Split both into `setup/leagueSelection/` with a barrel, and mirror the split in `test/`.

**Blocked by:** None. Confined to `packages/shared/`.

- [ ] `packages/shared/src/index.ts` exports the identical symbol set as before.
- [ ] No file outside `packages/shared/` changed.
- [ ] Test count before and after is identical.
- [ ] `pnpm check:all` is green at this commit.

## Answer

Landed in `43da86d`. Four source files plus a barrel; 24 exported symbols, diff-clean.

Two things the ticket did not anticipate:

- **The barrel cannot be `export *`.** Splitting forced the previously-private `issue`
  constructor to be exported so `selection.ts` and `activeLeagues.ts` could share it.
  Named re-exports keep it out of the package surface.
- **Five of the spec's twelve describe blocks did not test `leagueSelection` at all.** They
  covered `careerScopeEstimate`, `leagueSearch`, `leaguePresets` and `advancedOptions` -- they had
  simply accumulated in the nearest large file. They now live in specs named after what they
  exercise (`careerScopeEstimate.test.ts`, `leagueSearch.test.ts`, `leaguePresets.test.ts`, and
  appended to `advancedOptions.test.ts`). 356 tests before, 356 after.

The second one is the same failure mode ticket 06 addresses at scale in `apps/desktop/test/`:
specs drift to whichever file is nearest rather than the one named for the code they cover.
