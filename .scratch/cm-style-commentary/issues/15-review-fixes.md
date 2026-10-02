# 15: Fixes from the code review of 01-14

Spec: [spec.md](../spec.md)

**What to build:** the findings from the 2026-10-01 two-axis review that were approved for fixing.

**Acceptance:**

- A goal flash interrupted by the next line never leaves the bar inverted.
- No filesystem path reaches the renderer: the commentary file status names the file, not its path.
- `rpcServer.ts` imports the commentary file module directly, not through the match barrel.
- A failed write in reset, choose or update reaches Preferences as a typed error the player can read.
- A line after a corner can name the taker: an `{assist}` placeholder in the shot and goal sections,
  skipped where there is no assist.
- `spec.md` no longer lists highlight levels as out of scope; the Preferences problem text is accurate.

**Blocked by:** None

**Status:** resolved

## Answer

- Flash: `useFlash` resets its counter when the next line starts; the interruption test fails without it.
- No path: `CommentaryFileStatusView` names files only (a contract test pins its fields); Preferences
  shows the file name and an Open folder button.
- Errors: open, choose, update and reset fail with `CommentaryFileError { action, reason }`, the reason a
  system error code or `not-in-folder` / `no-application`, never a message (they embed paths).
  `describeRpcError` turns them into sentences. Loading never fails.
- Barrel: `rpcServer.ts` imports `../match/commentaryFile.js`; the commentary exports left `match/index.ts`.
- Corner taker: `{assist}` in every shot section, filled from `assistPlayerId` (the corner taker, or the
  creator in open play); the shipped header sections use it.
- Docs: `spec.md`'s out-of-scope line and the Preferences problems sentence corrected.

Not done from the review (judgement calls, left for a later pass): the commentary table as an Effect
service instead of a defaulted parameter, the four definitions of the highlight levels, `sectionTag`'s
return type and the `default:` branch in `applySetting`, the module-level cache, and the comment-prose
style notes.
