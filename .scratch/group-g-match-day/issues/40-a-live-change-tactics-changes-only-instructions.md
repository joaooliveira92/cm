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

**Status:** resolved

- [x] A live `ChangeTactics` after a red card leaves the team with 10, and changes its Team Instructions
- [x] A live `ChangeTactics` naming a different XI changes no slot; the substitution picker and the engine still agree
- [x] A seeded test pins each; `pnpm check:all` green

## Answer

Resolved 2026-09-22. `applyCommand`'s `ChangeTactics` branch keeps the slots and recomputes only the Team
Instructions (`resolveTeamInstructions` in `tactical-modifiers.ts`); it no longer adds anyone to `beenOn`.
Role bumps still come each minute from the players actually on the pitch. There is no pre-kickoff engine
path: the kickoff Tactic is the setup snapshot, and the club-level `changeTactics` never reaches the
engine. The fold in `pitch.ts` and the engine now agree exactly on who is on and who has been on.

Tests that pinned a line-up with a minute-1 `ChangeTactics` (`commands.test.ts`) now use the persisted
kickoff Tactic; the pins named the same players, and removing them makes the seeded preconditions match
what the tests run. The live copy that told the manager to rearrange players after a red card (the alert
this ticket's symptom came from) now says the team plays on a man down and only the Team Instructions
change. CONTEXT.md's Tactic entry and the Group G ledger's 097 row record the rule.

**Change note.** Committed matches keep their stored timeline (31). A live, uncommitted match replays
differently from a live tactics change's minute if the change came after a red card, a forced
substitution or a bring-off, or named a different line-up, formation or roles. The live UI always sent
the whole slot list and its tactic never reflected dismissals, so in practice that is almost any live
tactics change after such an event, even one that touched only the instructions. Dismissed players no
longer come back, and a player a change named no longer counts as having been on. Play already watched
past the command's minute in such a match can change on replay.

Split out: [43](43-formation-in-play-reads-the-pitch.md) ("Formation in play" lists the tactic, not the pitch).
Report: [group-g-match-day](../../../.ai/reports/group-g-match-day.md).
