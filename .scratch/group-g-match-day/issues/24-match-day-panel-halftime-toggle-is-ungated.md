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

**Status:** ready-for-agent

- [ ] The panel offers the halftime instruction only while half time is revealed and not yet passed
- [ ] A panel test covers it
