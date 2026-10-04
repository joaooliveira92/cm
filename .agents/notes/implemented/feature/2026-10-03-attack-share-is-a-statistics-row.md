# Agent Note: Attack share is a statistics row

Status: implemented

Superseded in part by
[possession is the share of minutes with the ball](2026-10-03-possession-is-the-share-of-minutes-with-the-ball.md):
the footer bar shows possession now, not attack share. What this note records, and what stands, is the
surviving statistics decision — the chance-share proxy is renamed to what it measures, "Attacks", and
shown as a Statistics row, and corners, free kicks and penalties become counted rows. Partially
supersedes [the match model shows only what it produces](../../implemented/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md)
for corners only: that note listed corners as unavailable because no set-piece event existed, and one
now does. Sibling of
[the match player line folds only recorded events](../../proposed/feature/2026-10-03-the-match-player-line-folds-only-recorded-events.md).

## Problem

CM 03/04 draws a two-colour bar under every match tab. The engine had no ball-possession model. Since
the formations-and-instructions work (commit `b4eb2787`), `apps/desktop/src/main/match/statistics.ts`
computes `computePossession` as each side's share of chance-type events (`ThroughBall`, `Cross`,
`LongShot`, `RunWithBall`, `HoldUpLayOff`, `Counter`) and still lists `possession` in
`UNAVAILABLE_MATCH_STATISTICS`. A percentage of attacks labelled possession is the invented figure the
standing rule forbids. Separately, `Corner` events exist, but `corners` is still listed as unavailable
and `countedFor` ignores the tag.

## Decision

- **Attacks.** The proxy is named `attackShare` in the statistics view and labelled **Attacks** where it
  is shown: "Attacks 58% – 42%". It is a derivation (each side's chance-type events over both sides'),
  so the rule allows it once it is named for what it is. When neither side has attacked yet, both halves
  are null, never 50–50. It is a row on the Statistics tab, not the footer bar — the bar shows
  possession, per the superseding note.
- **Corners** moved from unavailable to `MATCH_STATISTIC_KEYS`, counted from `Corner` events for
  `teamClubId`. Free kicks and penalties awarded are counted the same way (`FreeKick`, `Penalty`), as
  "Free kicks" and "Penalties" rows.
- `computeChancesByType`'s six near-identical filters were folded into one pass; the behaviour did not
  change.

## Alternatives considered

**Keep the label "Possession" with a footnote.** Rejected: a footnote on a different tab does not
travel with the figure, and the figure is not possession.

**Drop the attack share entirely.** Rejected: it answers a real question at a glance ("who is creating
chances") that possession does not, and the rule allows it once named honestly.

**Build a possession model in the engine now.** Rejected for this effort, then delivered by the
superseding note: it changes what every seed produces, so it belonged in the engine-detail effort.

## Consequences

- The Statistics tab names the proxy "Attacks"; no string "Possession" labels a chance share.
- Corners, free kicks and penalties appear as counted rows, live-cut like the others, and a test folds a
  timeline with each and checks both sides.
- `UNAVAILABLE_MATCH_STATISTICS` no longer contains `possession`; the surviving unavailable set is the
  recorded-defending rows a pre-change timeline lacks.
- Attack share tracks chance creation, so a side that keeps the ball without creating chances looks
  passive. That is what the model knows; accepted.
- Old stored timelines contain `Corner` events only if they were committed after set pieces shipped;
  earlier ones count zero corners. Saves are disposable during development (group-g ticket 32), so no
  backfill.
