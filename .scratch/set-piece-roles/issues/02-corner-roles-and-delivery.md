# 02: Corners follow the attacking roles and the delivery

Spec: [spec.md](../spec.md)

**What to build:** who is in the box comes from `attackCorner` (stay-back, lurking, edge-of-area and
short-option roles are not); the delivery picks the target (near post prefers near-post and flick-on roles,
far post prefers far-post roles, six-yard box prefers challenging the goalkeeper, edge of area goes to the
edge-of-area or lurking player for a shot from range, short plays it to the short option). A player
challenging the goalkeeper weakens the keeper; a near-post flick-on can redirect to a far-post attacker.

**Acceptance:** every rule above has a test; all-default tactics reproduce the old events exactly;
calibration holds.

**Blocked by:** 01

**Status:** ready-for-agent
