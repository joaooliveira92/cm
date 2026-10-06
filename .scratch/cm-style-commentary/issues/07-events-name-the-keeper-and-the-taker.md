# 07: Events name the keeper and the set-piece taker

Spec: [spec.md](../spec.md)

**What to build:** a saved shot names the goalkeeper who saved it; a corner names its taker as well as the
player who attacks it; a set-piece goal or shot names the taker as its assist. New placeholders reach the
commentary file as `{player2}` in those sections. No extra random draws, so seeded matches play the same.

**Acceptance:** seeded matches produce the same results as before; the new fields are filled; the shipped
file uses them.

**Scope change, 2026-10-01:** the corner taker is dropped from this ticket. The engine's corner resolver
has the nominated taker head his own corner (the outcome uses the taker's heading), so naming a separate
taker means changing how corners resolve, which changes results. Filed as
[11](11-a-corner-taker-heads-his-own-corner.md) for triage. This ticket names the goalkeeper on saved shots
and goals, and fixes the committed-timeline schema dropping `assistPlayerId` on chance events.

**Blocked by:** 02

**Status:** resolved

## Answer

- `ShotOnTargetEvent` and `GoalEvent` carry an optional `keeperId`, filled by `goalkeeperId` in
  `simulate/teamState.ts`: a lookup of the defending side's goalkeeper slot, so no random draw is added
  and seeded matches play the same (the pinned-seed main-process tests pass unchanged).
- In `Goal:*` and `ShotOnTarget:*` sections `{player2}` is the goalkeeper. A line whose placeholders an
  event can't fill (no keeper on the pitch, or a timeline stored before this) is skipped in the draw.
- The committed-timeline schema (`apps/desktop/src/main/match/timeline.ts`) now keeps `keeperId` and the
  build-up events' `assistPlayerId`, which it used to drop.
- The shipped `events.cfg` has keeper lines in every save and goal section.
- Tests: `packages/game-engine/test/match/commentary-file.test.ts` (keeper describe),
  `apps/desktop/test/main/match/stored-timeline-keeps-commentary-fields.test.ts`.
