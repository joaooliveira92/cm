# 10: Split `packages/game-engine/src/match/simulate.ts` (651 lines)

Type: task
Status: resolved

**What to build:** the file mixes four things: ~15 tuning constants, per-team runtime state
(`initTeamState`, `decayConditions`, `computeTeamStrengths`), event resolvers (`resolveAttackingEvent`,
`resolveCards`, `applyInjury`, `resolveContactDuels`, `resolveNonContactInjuries`) and the clock
loop (`resolveSlice`, `runSimulation`) plus the three public `simulateMatch*` entry points.

The tuning constants are the highest-traffic part of the file for a human and the lowest for the
loop logic; today changing one means opening all 651 lines.

Split into `match/simulate/` -- `constants.ts`, `teamState.ts`, `resolvers.ts`, `loop.ts`, and a
barrel exporting the three public entry points.

Two constraints:

- **Determinism is the contract.** `test/world-determinism.test.ts` and
  `test/match/simulate.test.ts` pin exact outcomes for a given seed. The order in which
  `RandomSource` is drawn from is therefore part of the behaviour. A pure move preserves it; any
  reordering of calls, however harmless-looking, does not.
- Do not change any constant's value, even one that looks like a typo. This is a move.

**Blocked by:** None. Confined to `packages/game-engine/`.

- [ ] `packages/game-engine/src/index.ts` exports the identical symbol set as before.
- [ ] No file outside `packages/game-engine/` changed.
- [ ] The determinism specs pass **without** their expected values being edited. If an expectation
      needed updating, the move was not pure -- revert and redo it.
- [ ] `pnpm check:all` is green at this commit.

## Answer

Landed in `5ab64e1`. `constants.ts`, `teamState.ts`, `resolvers.ts`, `loop.ts` plus a barrel.

Determinism held: the only change under `test/` is the import specifier (`git diff --stat` shows
one line, +1/-1), and the seed-pinned specs pass with their expected values untouched. Purity was
verified by diffing the sorted line multiset of the concatenated new files against the original
body -- identical apart from imports, `export` keywords on helpers that now cross a file boundary,
and one file header.

The test's import path had to change: `moduleResolution: nodenext` does not resolve a directory to
its index, and the spec's "no file beside a directory of the same basename" rule rules out the
alternative. Same constraint hit in tickets 08 and 09.

Left in place deliberately, both preserved verbatim as this was a move: `resolveContactDuels` has
no trailing semicolon, and `emptySlot` derives `wasGoalkeeper` from a reference comparison
(`s !== slot`) rather than comparing `playerId`. The latter is correct today because the slot comes
straight out of the live array, but it would break quietly if a caller ever passed a copy. Worth a
follow-up ticket if anyone touches that path.
