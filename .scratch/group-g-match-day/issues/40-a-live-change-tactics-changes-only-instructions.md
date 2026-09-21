# 40: A live Change Tactics changes only the Team Instructions

Filed 2026-09-21, orchestrator, while closing [35](35-manager-substitutions-come-from-the-bench.md): decision
request 01 was answered with no build ticket.

**What to fix:** `applyCommand`'s `ChangeTactics` branch (`packages/game-engine/src/match/simulate/teamState.ts`)
sets `team.resolved = resolveTeamTactics(command.tactic)`, rebuilding all eleven slots from the command. A
live tactics change after a red card or an injury-to-10 therefore puts the missing player back on, and
since ticket 22 the "Playing with 10 men" alert stays up while the simulation is back to eleven. Mid-match,
apply only the three Team Instructions (Mentality, Tempo, Pressing); who is on the pitch stays owned by
substitutions, red cards and injuries. The pre-match `ChangeTactics` (before kickoff) still sets the
whole Tactic. The main-process fold `pitch.ts` already assumes this, and the bench is already fixed at
kickoff (35).

**Decisions:** [decision request 01](../decision-request-01-live-change-tactics-scope.md), Option A, recorded as
[revealed play is immutable](../../../.agents/notes/proposed/feature/2026-09-19-revealed-play-is-immutable.md)
point 1. It changes what a seed produces for any match with a live tactics change; committed matches keep
their stored timeline ([31](31-committed-matches-store-their-timeline.md)). Say which live matches replay
differently.

**Blocked by:** None

**Status:** ready-for-agent

- [ ] A live `ChangeTactics` after a red card leaves the team with 10, and changes its Team Instructions
- [ ] A live `ChangeTactics` naming a different XI changes no slot; the substitution picker and the engine still agree
- [ ] A seeded test pins each; `pnpm check:all` green
