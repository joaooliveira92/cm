# Screen follow-through

Type: grilling
Status: resolved
Blocked by: 02, 04, 06

## Question

Once the engine records tackles, interceptions, header duels, fouls suffered and possession, what
changes on the screens specified by the [match screen map](../../match-screen-cm-layout/map.md), and
how is that work sequenced against that map's tickets 12–20?

## Answer

**The new figures join the existing column list, fold and statistics read; no new screen and no new
decision on the match-screen side.**

- **Per-player table** (Home/Away Stats, Form rows): gains, in CM order, Tck, Won (tackles), Hea, Won
  (headers), Int, Run and Fld, between Key and Off. Run needs no engine change (the `RunWithBall`
  creator, [02](02-record-or-simulate.md)) and may ship with the match-screen ticket 12. Pas, Cmp and
  Key (headers) stay absent.
- **Form season block** gains Tck (tackles won per appearance is not shown; the count is) and Fls Ag.
- **Statistics tab** gains Possession as a counted row and Tackles, Interceptions and Headers won per
  side; possession leaves the unavailable line.
- **Bottom bar** shows Possession; Attacks stays a Statistics row ([04](04-recording-possession.md)).
- **Old data** reads "-" per [10](10-saves-and-in-progress-matches.md).
- **Sequencing:** the engine work lands after match-screen tickets 12 (the fold and column list) and 18
  (the line table), so it extends them rather than racing them. The match-screen spec gets a one-line
  pointer to this map in its Further Notes when this map's spec is written, not before.
