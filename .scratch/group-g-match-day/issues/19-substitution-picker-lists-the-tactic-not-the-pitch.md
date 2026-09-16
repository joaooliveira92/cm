# 19: The substitution picker lists the Tactic's players, not who is on the pitch

**What to fix:** `MatchSubstitutionsScreen.tsx` builds its "Player coming off" and "Player coming on"
lists from `ready.tactic`, which is the manager's last live tactic or the pre-match tactic. Once a
revealed forced injury substitution has happened, the injured player is still offered as on the pitch
and the replacement as on the bench. Choosing either makes the engine reject the command ("not on the
pitch" or "not an available substitute"). A red card or a manager bring-off has the same effect.

Found in desktop-suite-red ticket 11 by reading the component. It was not the cause of that ticket's
e2e failure.

Depends on the same revealed-position cut as [ticket 18](18-substitution-count-reads-the-whole-match.md):
the lists must reflect the pitch as of the revealed minute, not the end of the re-simulated match.

**Blocked by:** 18

**Status:** resolved

- [x] After a revealed forced substitution, red card or bring-off, the picker offers only players on the pitch and unused substitutes
- [x] A test covers the forced-injury case

## Answer

Resolved 2026-09-16.

- **Contract.** `ResumeSimulationView` and `SubmitMatchCommandView` carry `homePitch` and `awayPitch`
  (`MatchPitchView { onPitch: PitchSlotView[], substitutes }`), cut at the same `revealedEvents` as
  ticket 18's counts.
- **Fold.** `apps/desktop/src/main/match/pitch.ts` `pitchAsOf` is a pure fold from the kickoff Tactic
  over the re-derived timeline. Red cards, severe Injuries and forced substitutions count once
  revealed. Manager substitutions and bring-offs count once journaled, and each bring-off is ordered
  after same-minute commands journaled before it. A severe Injury with no substitution following it
  empties the slot. `substitutes` is the squad minus anyone who has been on. The fold assumes a live
  `ChangeTactics` does not change who is on the pitch (decision request 01).
- **Renderer.** `MatchSubstitutionsScreen` and the Match day panel's `SubstitutionControl` both list
  from the pitch. `CommentaryProvider` applies a pitch only from a response sent no earlier than the
  last one applied. It re-reads the pitch when a red card, Injury or Substitution line is revealed.

**Tests.**

- `test/main/match/revealed-pitch.test.ts`:
  - seed 550: RedCard at line 9, Injury at 16, forced substitution at 17, each position checked;
  - seed 17: a severe Injury with no windows left;
  - a manager substitution, a bring-off, and a goalkeeper bring-off;
  - a same-minute substitution then bring-off of the same player.
- `packages/contracts/test/match-command-outcome.test.ts`: pitch round trips.
- Renderer: `live-command-screens`, `live-panel-controlled-club`, and `streaming-integration`
  (re-read, and a stale poll answered after a command).

**Review.** APPROVE. M1 (same-minute ordering) and M2 (stale poll) were fixed test-first. Follow-ups:
[decision request 04](../decision-request-04-who-may-come-on-as-a-substitute.md) (who may come on)
and [26](26-forced-substitution-picks-any-squad-player.md) (a forced substitution can bring back a
dismissed or used player). Review M3, a live tactics change resetting the line-up, is decision
request 01.
