# Agent Note: The possession bar shows attack share

Status: proposed

Partially supersedes [the match model shows only what it produces](../../implemented/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md)
for corners only: that note listed corners as unavailable because no set-piece event existed, and one
now does. Possession stays unavailable exactly as it ruled. Sibling of
[the match player line folds only recorded events](2026-10-03-the-match-player-line-folds-only-recorded-events.md).

## Problem

CM 03/04 draws a two-colour Possession bar under every match tab. The engine has no ball-possession
model. Since the formations-and-instructions work (commit `b4eb2787`), `apps/desktop/src/main/match/statistics.ts`
computes `computePossession` as each side's share of chance-type events (`ThroughBall`, `Cross`,
`LongShot`, `RunWithBall`, `HoldUpLayOff`, `Counter`) and still lists `possession` in
`UNAVAILABLE_MATCH_STATISTICS`. A percentage of attacks labelled possession is the invented figure the
standing rule forbids. Separately, `Corner` events exist, but `corners` is still listed as unavailable
and `countedFor` ignores the tag.

## Proposal

- **Attacks.** The proxy will be renamed `attackShare` in the statistics view and labelled
  **Attacks** wherever shown: "Attacks 58% – 42%". It is a derivation (each side's chance-type events
  over both sides'), so the rule allows it once it is named for what it is. When neither side has
  attacked yet, both halves are null and the bar renders as an empty neutral track with the text
  "No attacks yet", never 50–50.
- **The footer bar.** The match screen's persistent bottom bar will show Attacks, split in the two
  clubs' colours, with the numbers as text at each end so the split is never colour-only. The live bar
  is cut at the revealed position like every other live total.
- **Possession** will stay in `UNAVAILABLE_MATCH_STATISTICS` and keep its "not tracked" line on the
  Statistics tab.
- **Corners** will move from unavailable to `MATCH_STATISTIC_KEYS`, counted from `Corner` events for
  `teamClubId`. Free kicks and penalties awarded will be added the same way (`FreeKick`, `Penalty`),
  as "Free kicks" and "Penalties" rows.
- `computeChancesByType`'s six near-identical filters will be folded into one pass while touching the
  file; the behaviour does not change.

## Alternatives considered

**Keep the label "Possession" with a footnote.** Rejected: the bar is the most glanced-at element on
the screen, and a footnote on a different tab does not travel with it.

**Drop the footer bar.** Rejected: the user named the screen as inspiration, the bar is its signature,
and an honestly-labelled attack share answers the same question at a glance ("who is on top").

**Build a possession model in the engine now.** Rejected for this effort: it changes what every seed
produces and has no consumer besides this bar; listed under the map's Out of scope as part of the
engine-detail effort.

## Acceptance criteria

- No string "Possession" labels a number anywhere in the renderer; the Statistics tab still names
  possession as not tracked.
- The footer bar reads "Attacks", shows both percentages as text, and shows "No attacks yet" before
  the first chance.
- Corners, free kicks and penalties appear as counted rows, live-cut like the others, and a test
  folds a timeline with each and checks both sides.
- `UNAVAILABLE_MATCH_STATISTICS` contains `possession` only.

## Risks

- Attack share tracks chance creation, so a side that keeps the ball without creating chances looks
  passive. That is what the model actually knows; accepted.
- Old stored timelines contain `Corner` events only if they were committed after set pieces shipped;
  earlier ones count zero corners. Saves are disposable during development (group-g ticket 32), so no
  backfill.
