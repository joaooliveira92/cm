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

**Status:** ready-for-agent

- [ ] The engine refuses a substitute who is off the bench or has already been on, with a reason
- [ ] `MatchPitchView.substitutes` lists exactly the bench players who have not been on
- [ ] A seeded test pins each refusal; `pnpm check:all` green, and e2e since the picker changes
