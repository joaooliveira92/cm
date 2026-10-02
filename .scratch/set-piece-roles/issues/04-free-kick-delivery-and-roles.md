# 04: Free kicks follow the delivery and the roles

Spec: [spec.md](../spec.md)

**What to build:** a free kick's delivery decides between a direct shot (`default`), a cross headed by a box
player (`crossNear`, `crossFar`, `crossCentre`, `aimForBestHeader`) and keeping the ball (`short`, `long`,
no shot). `attackFreeKick` roles decide who is in the box and help a direct shot (disrupting the wall or the
keeper, a decoy runner); `defendFreeKick` roles build the wall and defend the cross.

**Acceptance:** each delivery and role has a test; all-default reproduces the old events; calibration holds.

**Blocked by:** 03

**Status:** ready-for-agent
