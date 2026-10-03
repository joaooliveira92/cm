# Naming the fouled player

Type: grilling
Status: resolved
Blocked by: 03

## Question

`Foul` names only the fouling defender, so the Fld column and "fouls suffered" cannot be filled, and a
penalty's `Penalty` event names the taker, not the player brought down. Who is the fouled player: an
attacker picked by the same rule as the fouler, the ball carrier of that slice if one exists, or the
taker? Does the answer change who takes free kicks and penalties (it must not, unless deliberately)?

## Answer

**The fouled player is a player of the side in possession, picked on the attribution stream weighted
by dribbling plus flair, preferring attack-phase players as the fouler pick does; recorded as
`fouledPlayerId` on the `Foul` event.**

- Every foul is rolled in `resolveFoul` against the side out of possession, so the victim belongs to
  the side with the ball; picking him there is attribution of a decided fact
  ([02](02-record-or-simulate.md)), drawn from the attribution source
  ([03](03-attribution-without-moving-the-seed.md)).
- The field is optional, so stored timelines without it decode; the fold counts Fld only where present.
- A `Penalty` keeps naming the taker. The player brought down is the preceding `Foul`'s
  `fouledPlayerId`, so commentary may say "X is brought down … Y to take it", and no `Penalty` field is
  added.
- Who takes free kicks and penalties does not change: takers are chosen from the set-piece taker
  lists on the main stream, untouched.
- With fouls at 3.6 per match on the engine fixtures (against the calibration target of 20–26), Fld
  will be small until fouls are re-calibrated; that is a balance issue of the existing engine, not of
  this field, and sits in the map's balance fog.
