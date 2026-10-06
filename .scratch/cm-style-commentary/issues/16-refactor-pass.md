# 16: Refactoring pass from the code review

Spec: [spec.md](../spec.md)

**What to build:** the review's judgement calls that ticket 15 left open. No behaviour changes.

**Acceptance:**

- The commentary table reaches the match view through an Effect service (`Context.Reference`, defaulting
  to the shipped table), not a defaulted parameter.
- The highlight levels are defined once, in contracts, and the engine and renderer derive from it.
- No `as never` casts around the always-shown rule; `applySetting`'s switch is exhaustive.
- The main-process cache is keyed by file and documented, so tests and folders can't see each other's.
- Ticket references leave source comments; the oxlint `forEach` warning in the engine parser is gone.

**Blocked by:** 15

**Status:** resolved

## Answer

Four commits, no behaviour change:

- `CommentaryTableSource` (`apps/desktop/src/main/match/commentaryFile.ts`), a `Context.Reference`
  defaulting to the shipped table, replaces the defaulted parameter on `resumeSimulation` and
  `submitMatchCommand`; the two RPC handlers provide the player's file.
  `test/main/rpc/commentary-reaches-match-reads.test.ts` covers both paths.
- `packages/shared/src/commentary.ts` holds `HIGHLIGHT_LEVELS`, `isHighlightLevel` and `shownAtLevel`; the
  engine, the contract and the renderer derive from it.
- `changesTheMatch(key)` replaces the four casts. `sectionTag` could not honestly return an event tag,
  since `GoalScore` sections narrate none, so the one string-set lookup lives in that helper instead.
  The parser switch is exhaustive, its loop is `for...of`, and its docstring and regexes moved.
- The main cache is a `Map` keyed by file path, documented. Ticket references left the comments, and
  the comments in the files this effort created no longer use mid-sentence colons or parenthetical
  asides (`docs/agents/unslop.md` 13, 14).
