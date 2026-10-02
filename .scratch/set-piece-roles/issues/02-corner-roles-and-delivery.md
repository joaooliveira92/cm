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

**Status:** resolved

## Answer

- `planCorner` (`packages/game-engine/src/match/simulate/cornerPlan.ts`) reads the attacking side's roles and
  the delivery into a plan: a header (with an attack and a defence factor), a shot from the edge of the area,
  or a short corner. Every pick is deterministic, so no random draw is added; at all-default it is exactly
  the old rule. `resolveCorner` acts on the plan. The pick helpers moved to `setPiecePicks.ts` so the plan
  and the resolver can share them.
- Rules: stay-back, lurking, edge-of-area and short-option roles keep a player out of the box, and a box
  with fewer than all outfield players weakens the header (floor 0.7). An aimed delivery prefers the
  matching roles (x1.1). A near-post flick-on goes on to a far-post attacker (x1.1 more), the flicker
  assisting. A teammate challenging the goalkeeper weakens the defence (x0.92). An edge-of-area delivery
  goes to the edge-of-area or lurking player for a shot from range (`chanceType: "longShot"`); a short
  delivery to the short option brings no shot. Constants in `simulate/constants.ts`.
- Commentary reads a shot from range after a corner as long range, not a header.
- Tests in `packages/game-engine/test/match/set-piece-roles.test.ts`: each rule, short and edge-of-area
  corners over 25 matches, and a bounded effect (a strong near-post plan raises corner goals by less than
  1.6x over 80 matches). Defaults: every engine and main-process pinned-seed test passes unchanged.
