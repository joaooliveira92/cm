# 24: Tactics screen: Set Priorities

**What to build:** Set Priorities opens CM's five panels (Captains, Penalty Takers, Free Kick Takers,
Corner Takers, Throw In Takers) holding the eight ordered lists. A player is added from the Team
Selection list, reordered and removed; CM's drag and drop is offered with a keyboard equivalent. A
nominee outside the eleven is allowed with a warning, as CM warned. The captain shows as Capt in the
list. Edits save through `ChangeTactics`.

Seam: renderer only.

**Decisions:**

- **Team set-piece instructions and per-slot set-piece roles live in the Tactic Template; the captain and ordered taker lists live only on the live Tactic; the engine uses them through Corner, Free Kick and Penalty events and long throws in the chance pipeline; absent nominees fall back down the list, then to the best relevant attribute; the captain has no match effect.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-29-cm-set-pieces-in-templates-takers-on-the-tactic.md).
- **The Tactics screen follows CM 03/04's own layout (prototype variant A): File and View menus, Set Positions / Set Instructions / Set Priorities modes, a Team Selection list always on the left, CM's tick-box-plus-dropdown instruction rows, and the same screen in match with Confirm, Undo Last and Cancel.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-30-tactics-screen-follows-cm-0304-layout.md).

**Blocked by:** 22

**Status:** resolved

- [x] Each list adds, reorders and removes players and saves the order.
- [x] A nominee outside the eleven shows a warning but is kept.
- [x] Reordering works by keyboard.
- [x] Renderer tests pass, and typecheck and lint pass.
