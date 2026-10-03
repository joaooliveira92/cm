# 03: Defending corners follow the defending roles

Spec: [spec.md](../spec.md)

**What to build:** `defendCorner` roles shape the defence: zonal near/far-post defenders are stronger against
that delivery, man-markers (including tall/small) against the target they mark, players kept back or left
forward don't defend the box, and closing down weakens a shot from the edge.

**Acceptance:** each role's effect has a test; all-default reproduces the old events; calibration holds.

**Blocked by:** 02

**Status:** resolved

## Answer

`defendCornerFactor` (`packages/game-engine/src/match/simulate/cornerPlan.ts`) turns the defending side's
`defendCorner` roles into one multiplier on the defence's value, exactly 1 when every role is `default`:
players left forward thin the box (floor 0.75), a zonal defender at the post the corner is aimed at x1.08,
man-marking x1.05, marking the kind of player attacking the ball x1.08 (the attacking side's best header
is its tall player; anyone else is small), and closing down x1.1 against a shot from the edge. `back`
counts as defending the box, as `default` does. Tests in `set-piece-roles.test.ts`; every pinned seed holds.
