# 11: A corner taker heads his own corner

Found while working [07](07-events-name-the-keeper-and-the-taker.md), 2026-10-01.

`resolveCorner` (`packages/game-engine/src/match/simulate/setPieceResolvers.ts`) picks the corner taker
(the first nominated corner taker on the pitch, else the best header) and resolves the header outcome with
that same player's heading and strength. So the player who takes the corner also heads it, and a nominated
taker with poor heading wastes every corner. A fix picks the player who attacks the ball separately,
which changes seeded results; seeded tests that pin outcomes would need repinning.

**Blocked by:** None

**Status:** needs-triage
