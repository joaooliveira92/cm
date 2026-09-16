# Decision Request: Who may come on in a live match, only the named bench or anyone in the squad?

## Question

During a live match, may a substitution (the manager's or a forced injury one) bring on only a player
named on the Tactic's bench who has not yet played, with re-entry of anyone substituted off, sent off
or injured off refused? Or does every squad player not currently on the pitch stay eligible?

## Why this is blocking

Found in review of [ticket 19](issues/19-substitution-picker-lists-the-tactic-not-the-pitch.md).

- The engine never reads `Tactic.bench`. `applyCommand` (`packages/game-engine/src/match/simulate/teamState.ts`)
  accepts any squad player not on the pitch, including one already substituted off or sent off.
- Ticket 19's `MatchPitchView.substitutes` is "squad minus anyone who has been on", so both pickers
  offer the whole club squad.
- The contracts package elsewhere (`SelectionSummaryView`) and the proposed note
  [the team sheet is the Tactic](../../.agents/notes/proposed/architecture/2026-09-13-the-team-sheet-is-the-tactic.md)
  define substitutes as the players named on the active Tactic's bench.

Guessing wrong either changes the replay of saved matches, or leaves "substitutes" meaning two
different things in one contract.

## What is already settled

- CONTEXT.md: a Severe injury is "forced off — substituted, or the team plays with 10".
- Screen 97 spec §17: "Dismissed and injured-player constraints are explicit."
- That forced substitutions must never bring back a dismissed or already-used player is treated as a
  defect, not part of this question: [ticket 26](issues/26-forced-substitution-picks-any-squad-player.md).

## Options

### Option A — the named bench only, no re-entry

- **What the player experiences**: the familiar football rule. Picking the bench before kickoff
  matters, and the picker lists at most the named substitutes who have not played.
- **What it costs to build**: the engine validates substitutions against `Tactic.bench` minus anyone
  who has been on. `pitchAsOf` narrows `substitutes` the same way. A save's journaled substitution of
  a non-bench player no longer replays as before.
- **What it forecloses**: late changes to the bench once the match has started.

### Option B — any squad player not on the pitch

- **What the player experiences**: no bench selection pressure. A player taken off can come back on.
- **What it costs to build**: nothing in the engine. `MatchPitchView.substitutes` must be renamed or
  redocumented so it does not clash with the bench meaning.
- **What it forecloses**: a team sheet whose bench means anything during the match.

## Recommendation

**Option A.** It is how the Screen 97 spec and the team-sheet note already describe substitutes, and
it gives the bench on the team sheet a reason to exist.
