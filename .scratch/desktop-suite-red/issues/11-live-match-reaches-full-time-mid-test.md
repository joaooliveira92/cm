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

**Blocked by:** 10

**Status:** claimed

- [ ] The decision on how a test holds a match live is recorded
- [ ] Both journeys live-match tests pass reliably under that decision, with no added retry loop

## Comments

2026-09-16, after ticket 10: with the locators current, all three live-match tests passed in three
runs, each in 2.4–3.7s. The race did not occur in those runs. The baseline snapshots from before
ticket 10 still show the match reaching "Full time" while a test waited, which it did then for 15s
on text that never appeared. Consider that before deciding how much this needs: a test that no
longer waits on dead copy spends far less of the match's reveal budget.
