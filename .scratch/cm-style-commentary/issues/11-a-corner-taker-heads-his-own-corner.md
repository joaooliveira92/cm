# 11: A corner taker heads his own corner

Found while working [07](07-events-name-the-keeper-and-the-taker.md), 2026-10-01.

`resolveCorner` (`packages/game-engine/src/match/simulate/setPieceResolvers.ts`) picks the corner taker
(the first nominated corner taker on the pitch, else the best header) and resolves the header outcome with
that same player's heading and strength. So the player who takes the corner also heads it, and a nominated
taker with poor heading wastes every corner. A fix picks the player who attacks the ball separately,
which changes seeded results; seeded tests that pin outcomes would need repinning.

**Blocked by:** None

**Status:** resolved

## Comments

2026-10-01, triage: approved by Joao for this effort. Ready for an agent: the corner's header-taker is
picked separately from the taker, and seeded tests that pin outcomes are repinned in the same change.

## Answer

`resolveCorner` now picks the taker by crossing (the first nominated corner taker on the pitch, else the
best crosser) and, separately, the best header among the other outfield players, who attacks the ball;
the outcome uses his heading and strength as before, and the taker is his `assistPlayerId`. Both picks
are deterministic, so no random draw moved. With no nominated taker the old code already had the best
header attack it, so balance barely changes; all 599 main-process tests, including the pinned-seed ones,
pass without a repin. Commentary: a shot after its side's corner reads as a header whoever took it, and
the Corner section can now name the taker.

Not done: CM's per-slot `attackCorner` roles (`SET_PIECE_ROLE_VALUES` in `packages/shared`) never reach
the engine, so the header is the best header rather than the player told to attack corners. Wiring the
set-piece roles into `MatchSlot` is its own change.
