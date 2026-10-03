# 24: The Match day panel's halftime instruction toggle is not gated to half time

**What to fix:** [ticket 16](16-live-commands-stamped-by-revealed-minute.md) gates the halftime
instruction to the moment `HalfTimeReached` is revealed, but only in `useLiveMatchCommands`
(`atHalftime`). The Match day panel has its own state (`useMatchControl.ts`, a plain
`useState(false)`) and renders the checkbox unconditionally (`MatchControlPanel.tsx`). A halftime
substitution raised at minute 10 is stamped 45, counts at once and reads "Applied". If a red card at
minute 30 then removes the outgoing player, re-derivation drops the substitution, while
`applyPollView`'s never-lower rule keeps the stale count.

Share `atHalftime` with the panel and add a panel test.

Found in the review of [ticket 18](18-substitution-count-reads-the-whole-match.md).

**Blocked by:** None

**Status:** resolved

- [x] The panel offers the halftime instruction only while half time is revealed and not yet passed
- [x] A panel test covers it

## Answer

Resolved 2026-09-16. The Match day panel and the standalone Match Tactics and Substitutions screens
share one half-time window.

- **The rule.** `getAtHalfTime(saveId)` in `session.ts` is true while `HalfTimeReached` is revealed
  and the last revealed minute is still 45. First-half stoppage lines (46 and later) come before
  `HalfTimeReached`, and every second-half line is 46 or later (`loop.ts`). `HALFTIME_MINUTE` now
  lives in `session.ts` for the renderer.
- **The hook.** `useHalftimeInstruction(saveId)` returns `atHalftime` and a derived `isHalftime`. It
  also clears a stale tick during render, which the test showed is load-bearing: without it, state
  set while the box was disabled shows ticked the moment half time opens. `useLiveMatchCommands` and
  `useMatchControl` both use the hook.
- **The panel.** The checkbox is disabled outside the window, with " — available at half time", as
  on the ticket 16 screens.

`test/renderer/match/panel-halftime-window.test.tsx` covers:

- closed through a first-half stoppage line, where a submission is not a halftime instruction;
- open at `HalfTimeReached`, where a submission is `isHalftime: true, minute: 45`;
- closed and unticked at the first second-half line, where a submission is not a halftime instruction;
- open on the first render after returning at half time.

Review: APPROVE, with lows. The half-time submission assertion was added. The reviewer's suggestion
to delete the render-time clear was tried and reverted, because it broke the window test. The remount
case guards the restore only. The module-state read during render is a React Compiler adoption note.
