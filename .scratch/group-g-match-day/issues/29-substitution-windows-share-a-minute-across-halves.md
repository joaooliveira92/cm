# 29: A first-half stoppage substitution and a second-half one share a window when their minutes match

**What to fix:** the engine opens a substitution window when `minute !== team.lastWindowMinute`
(`packages/game-engine/src/match/simulate/teamState.ts` `applyCommand`). Minutes are raw, and
first-half stoppage runs 46 and up, so a substitution at first-half stoppage minute 48 and a
second-half substitution at minute 48 compare equal and spend one window between them. Ticket 25's
view reconstruction (`classifySubstitutions`) copies this faithfully, so the displayed counts match
the engine but the rule is wrong.

Key the window by half and minute. This changes replayed results for matches that hit the case, so
the change must say which saved matches replay differently. Once the engine is fixed, update
`classifySubstitutions`/`spendWindow` in `apps/desktop/src/main/match/substitutions.ts`.

A cheaper long-term route is also open: have the engine mark each Substitution event with its role
(stand-in, halftime instruction, opened a window). The view could then stop reconstructing. That
changes the event model and needs an architecture-class Agent Note. Found in review of
[ticket 25](25-substitution-count-and-outcome-accuracy.md).

**Blocked by:** None

**Status:** ready-for-agent

- [ ] A substitution in first-half stoppage minute N and one in second-half minute N spend two windows
- [ ] The view's counts agree, with a table test
- [ ] The change states which saved matches replay differently
