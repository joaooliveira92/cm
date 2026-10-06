# 30: The Match Report lists a goalkeeper stand-in as a substitution

**What to fix:** `apps/desktop/src/main/match/report.ts` `reportEvents` passes through every
`Substitution { forcedByInjury: true }`, including the outfield stand-in the engine drags into goal
(`emptySlot`). `MatchReportScreen` renders it as "Substitution: X on for the injured GK", although X
was already on the pitch and, after a bring-off, the keeper may not be injured. Since ticket 25, the
report's substitutions statistic excludes stand-ins, so the incident list and the statistic disagree
on one screen.

Give stand-ins their own incident kind or flag, using ticket 25's `classifySubstitutions`, with copy
such as "X moves into goal".

Found in review of [ticket 25](25-substitution-count-and-outcome-accuracy.md).

**Blocked by:** None

**Status:** resolved

- [x] A goalkeeper stand-in reads as a move into goal, not a substitution
- [x] The incident list and the substitutions statistic agree, with a test

## Answer

Resolved 2026-09-17. `MatchReportEventView.kind` gains `GoalkeeperStandIn`. `reportEvents` lists
ticket 25's `standIns` under that kind, so the listed substitutions are exactly the ones the
substitutions statistic counts.

For a stand-in, `replaced.forcedByInjury` is true only when a same-minute severe Injury to the
departing player came directly before it. After a keeper is brought off the engine still marks the
drag as forced, but no injury happened. The screen reads "Goalkeeper stand-in: X moves into goal for
[the injured] Y (Club)".

**Tests.**

- `substitution-accuracy.test.ts`, seed 26 with the property re-verified: two stand-in entries (the
  minute-3 bring-off drag, not injured; the minute-88 severe injury drag, injured). Substitution
  entries equal the substitutions statistic for both clubs, and substitution plus stand-in entries
  equal the Substitution lines.
- `packages/contracts/test/match-report.test.ts`: round trip.
- `match-report-screen.test.tsx`: both copy variants.

All failed first.
