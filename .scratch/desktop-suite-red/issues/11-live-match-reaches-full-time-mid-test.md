# 11: A live match can reach full time while a spec is still issuing commands

**What to fix:** the two `journeys.spec.ts` live-match tests (AC-33 and Screen 97) make several live
commands in sequence. In the ticket 08 runs, both page snapshots at failure showed "Full time", a
final score and "Accept result". The match had ended mid-test, and `MatchDayScreen` swaps the
control panel for `MatchComplete`, so the steps that remain have nothing to act on.

The reveal pace is `REVEAL_INTERVAL_MS = 350` in `src/renderer/rpc/pacing.ts`. A 90-minute reveal
leaves a test a budget measured in seconds, and a loaded machine spends it quickly.

This needs a decision before it is a fix: how does an e2e test hold a match live? Options include a
pacing seam the harness can slow, pausing the match, or starting commands at half time. A fixed
wait or retry loop is not acceptable. If the choice needs a decision request, raise one.

Fix [ticket 10](10-live-match-specs-assert-retired-copy-and-nav.md) first. Until its locators are
current, those failures hide this one.

**Blocked by:** [group-g-match-day 18](../../group-g-match-day/issues/18-substitution-count-reads-the-whole-match.md)

**Status:** resolved

- [x] The decision on how a test holds a match live is recorded
- [x] Both journeys live-match tests pass reliably under that decision, with no added retry loop

## Comments

2026-09-16, after ticket 10: with the locators current, all three live-match tests passed in three
runs, each in 2.4–3.7s. The race did not occur in those runs. The baseline snapshots from before
ticket 10 still show the match reaching "Full time" while a test waited, which it did then for 15s
on text that never appeared. Consider that before deciding how much this needs: a test that no
longer waits on dead copy spends far less of the match's reveal budget.

## Answer

2026-09-16. **Decision:** no pacing seam, pause or half-time scheme. The full-time race was a
symptom of tests waiting 15s on retired copy, which ticket 10 fixed, and it no longer reproduces.
`pnpm test:e2e e2e/journeys.spec.ts:96 e2e/journeys.spec.ts:163 e2e/app.spec.ts:90 --repeat-each=10`
gave 29 passed and 1 failed, and no run reached Full time.

**The one failure** was Screen 97 asserting `Substitutions used: 0/` while the screen showed
`1/5 · Windows used: 1/3` before the test had substituted. A Severe injury substitutes from the
bench (`forcePlayerOff` in `packages/game-engine/src/match/simulate/teamState.ts`, emitting
`Substitution` with `forcedByInjury: true`), and the e2e match seed is random (pinning it is ticket 03).

**Change:** the Screen 97 test in `apps/desktop/e2e/journeys.spec.ts` now reads N from
`Substitutions used: N/M` before substituting and asserts `N+1/M` after. If N is already at the cap it
fails with an explicit message. AC-33 and `app.spec.ts` Match Day assert only `Substitutions used:`
with no count, so they are unchanged.

**Still open, found while validating:** the rerun gave 29 passed and 1 failed again. This time
Screen 97 read `Rejected — The match did not take the substitution.` The cause is in the product:

- `buildResumeSimulationView` (`apps/desktop/src/main/match/view.ts`) computes `homeSubs`/`awaySubs`
  over the **whole re-derived timeline**, not the revealed minutes. A forced injury sub at minute 80
  already counts at minute 3, which is why the screen showed 1/5 early.
- `submitMatchCommand` re-simulates the match with the command. The manager's substitution changes
  who is on the pitch, so the rest of the match diverges: a later injury sub can disappear or appear.
- `resolveCommandStatus` (`apps/desktop/src/renderer/match/commandStatus.ts`) infers "applied" from
  `after.used > before.used`. When the divergence drops a later injury sub, an accepted substitution
  reads as Rejected.

An engine probe (1,500 seeds with `buildTeam` fixtures, manager sub slot 0 → first bench player at
minute 3) found: baseline home subs > 0 in 118 runs; after the command, the count was not N+1 in 51
and did not increase at all in 23. The engine accepted the command in all 1,500 runs. So the test
still flakes about 2–3% of the time, and a player can see an accepted substitution reported as
Rejected, or future substitutions counted early. The second criterion is therefore not met by a test
change alone. The fix belongs in the substitution count and status, which should count only up to
the revealed minute or confirm the command's own `Substitution` event. It needs its own ticket.

2026-09-16, orchestrator: decision recorded and the relative-count test change committed. Criterion 2
is not met. The remaining failures come from product defects, filed as
[group-g-match-day 18](../../group-g-match-day/issues/18-substitution-count-reads-the-whole-match.md)
(count over the whole timeline, "applied" inferred from the count) and
[19](../../group-g-match-day/issues/19-substitution-picker-lists-the-tactic-not-the-pitch.md)
(picker built from the Tactic). The claim is released and the ticket is blocked on 18. Once 18 lands,
re-run `--repeat-each=10` and close this.

2026-09-16, closed: group-g-match-day 18 landed (`d8170df`).
`pnpm test:e2e e2e/journeys.spec.ts:163 e2e/journeys.spec.ts:96 e2e/app.spec.ts:90 --repeat-each=10`
gave 30 passed (1.8m), against 29/30 before it.
