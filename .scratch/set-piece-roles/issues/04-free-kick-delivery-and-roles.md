# 04: Free kicks follow the delivery and the roles

Spec: [spec.md](../spec.md)

**What to build:** a free kick's delivery decides between a direct shot (`default`), a cross headed by a box
player (`crossNear`, `crossFar`, `crossCentre`, `aimForBestHeader`) and keeping the ball (`short`, `long`,
no shot). `attackFreeKick` roles decide who is in the box and help a direct shot (disrupting the wall or the
keeper, a decoy runner); `defendFreeKick` roles build the wall and defend the cross.

**Acceptance:** each delivery and role has a test; all-default reproduces the old events; calibration holds.

**Blocked by:** 03

**Status:** resolved

## Answer

`planFreeKick` and `defendFreeKickFactor` (`packages/game-engine/src/match/simulate/freeKickPlan.ts`):

- Delivery: `default` is the old direct shot; `crossNear`, `crossFar`, `crossCentre` and `aimForBestHeader`
  (x1.1) are headed by the best header in the box, the taker assisting (`chanceType: "cross"`, so
  commentary reads a header); `short` and `long` keep the ball with no shot. The `FreeKick` event carries
  `deliveryType` when it isn't `default`, and the stored timeline keeps it.
- Attacking roles: stay-back, at-the-ball and wall-disrupting players aren't in the box for a cross;
  disrupting the wall (x1.06), a decoy standing with the taker or running over the ball (x1.04) and
  disrupting the goalkeeper (keeper's part x0.94) help a direct shot.
- Defending roles: each player forming the wall +3 % against a direct shot, up to four; against a cross,
  players left forward thin the box, a zonal defender at the aimed post x1.08, man-marking x1.05.
- All picks deterministic, all factors 1 at default: the engine and main-process pinned seeds hold. Tests in
  `set-piece-roles.test.ts`, including whole matches with crossed and kept free kicks.
