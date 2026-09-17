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

**Status:** claimed

- [ ] A goalkeeper stand-in reads as a move into goal, not a substitution
- [ ] The incident list and the substitutions statistic agree, with a test
