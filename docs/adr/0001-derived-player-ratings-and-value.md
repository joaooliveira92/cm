# Player ratings and transfer value are derived, not persisted

Championship Manager's classic implementation stores a hidden Current Ability scalar per player and
keeps it in sync with individual attributes. We deliberately don't: Position Rating, Overall Rating,
and Transfer Value are all computed on read from the stored Attributes (plus the hidden Potential
Ability), never written to the `players` table. This avoids a second source of truth that would need
invalidating every time an attribute changes (aging, and later, injuries/form), at the cost of
recomputing a weighted average on each read — cheap relative to SQLite's row scan cost at our data
volume (a handful of clubs' worth of players, not thousands).

`position_weights`, the (Position, Attribute) importance table these formulas read from, is
correspondingly a code-defined constant in `packages/shared`, not a SQL table — it's fixed game-design
data with no event that ever produces or mutates it, so it belongs in the same place as the rating
formula that consumes it, not behind a SQL join.
