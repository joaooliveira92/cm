# 35: A manager's substitution comes from the named bench, with no re-entry

Split from [26](26-forced-substitution-picks-any-squad-player.md), 2026-09-21, orchestrator.

**What to build:** the manager half of decision request 04's answer. `applyCommand`
(`packages/game-engine/src/match/simulate/teamState.ts`) accepts any squad player not on the pitch as
the incoming substitute. Refuse anyone not named on the current Tactic's bench, and anyone who has
already been on the pitch in this match (26's `beenOn` tracking). `pitchAsOf`'s
`MatchPitchView.substitutes` and both substitution pickers narrow the same way, so the picker never
offers a player the engine would refuse.

**Decisions:** [decision request 04](../decision-request-04-who-may-come-on-as-a-substitute.md), Option A.
A journaled substitution of a non-bench player in a live, uncommitted match no longer replays; say so in
the change note. Committed matches keep their stored timeline ([31](31-committed-matches-store-their-timeline.md)).

**Blocked by:** 26, 34

**Status:** resolved

- [x] The engine refuses a substitute who is off the bench or has already been on, with a reason
- [x] `MatchPitchView.substitutes` lists exactly the bench players who have not been on
- [x] A seeded test pins each refusal; `pnpm check:all` green, and e2e since the picker changes

## Answer

Resolved 2026-09-21. `applyCommand` refuses a manager's `MakeSubstitution` whose incoming player is not
named on the bench ("is not named on the bench") or has already been on ("has already been on the
pitch"), before any cap or window check, so a refusal spends nothing. `pitchAsOf`'s
`MatchPitchView.substitutes` is the kickoff bench, in bench order, minus anyone who has been on, so the
pickers offer exactly who the engine accepts. With nobody left they say "No substitutes named or left on
the bench."

**The bench is fixed at kickoff**, an orchestrator ruling from review. The first cut let the engine follow a
live `ChangeTactics`'s bench while the picker read the kickoff one, and that is reachable: the Squad
screen autosaves the bench mid-match and the live tactics builders draft from it. Decision request 04
("forecloses late changes to the bench") and decision request 01 (a live Change Tactics carries Team
Instructions only) both point to freezing it. This also changes 26's forced path, which followed the
current bench; `CONTEXT.md`'s Tactic entry says so. Decision request 01's line-up half had no ticket:
[40](40-a-live-change-tactics-changes-only-instructions.md).

The e2e substitution journeys now name a bench first (`nameBench` in `e2e/launchApp.ts`); the Squad screen's
lineup bar is the only place a bench is set.

**Change note.** A live, uncommitted match whose journal holds a manager substitution of a player off the
bench, or of one who has already been on, no longer applies it, and can play out differently from that
minute. So can one whose journal holds a live tactics change naming a different bench. Committed matches
keep their stored timeline (31). A human club on the default Tactic (empty bench) can make no
substitution until it names one; [39](39-an-empty-bench-is-flagged-before-kickoff.md) flags that before kickoff.
Seeds re-pinned: `GOALKEEPER_STAND_IN_SEED` 26 → 455 and `STAND_IN_INJURY_LINE` 23 → 20
(`substitution-accuracy.test.ts`).
Report: [group-g-match-day](../../../.ai/reports/group-g-match-day.md).
