# 12: Match engine core (deterministic simulation)

**What to build:** The Match Decider: given two clubs' squads and Tactics, resolve a full match from
`MatchStarted` to `FullTimeWhistle` via the Minute-Slice / Stoppage-Slice loop, Phase Strengths,
Role-Rating-informed `TacticalModifiers`, home advantage, and Stamina-scaled fatigue, emitting the
full v1 Match Event vocabulary. This ticket has no UI — it is verified entirely through tests in
`packages/game-engine` (pure, DB-agnostic, no Electron or SQLite dependency).

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] Three Phase Strengths (Attack, Midfield, Defense) computed per team pre-tactics from Position
      Ratings of players occupying each phase's Positions
- [ ] Tactic resolution produces a flat `TacticalModifiers` struct (attack/midfield/defense/tempo/
      pressing-aggression multipliers, event-odds biases fixed at 0); the match engine itself has no
      knowledge of formations, roles, or instructions
- [ ] Home advantage (~+5–10%) applied to home Phase Strengths before Tactical Modifiers
- [ ] Fatigue decay from minute ~60 on Midfield/Defense Phase Strength, scaled inversely by
      squad-average Stamina, reset per match
- [ ] 90 Minute-Slices plus a Stoppage Slice per half (1–5 minutes, biased by that half's
      stoppage-causing event count) resolve a full match
- [ ] Full Match Event vocabulary emitted: `MatchStarted` (with seed), `Goal`, `ShotOnTarget`,
      `ShotMissed`, `BigChance`, `YellowCard`, `RedCard`, `Injury`, `Substitution`,
      `HalfTimeReached`, `FullTimeWhistle`
- [ ] Given the same `MatchStarted` seed and the same commands, replaying produces an identical event
      timeline (test asserts this directly)
- [ ] `ChangeTactics` and `MakeSubstitution` are accepted as valid mid-match commands by the Decider
      (subs capped at 5 total across max 3 windows; halftime doesn't count as a window) — even though
      no UI drives them yet
