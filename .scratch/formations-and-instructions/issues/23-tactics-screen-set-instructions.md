# 23: Tactics screen: Set Instructions

**What to build:** Set Instructions ▸ Player shows "Instructions for Surname, F (cell)": CM's rows of
a tick box enabling a dropdown for the five overrides (unticked shows "Team (value)"), the three
standalone settings (unticked shows "(default)"; Distribution only for the goalkeeper), the seven
"more often" switches with CM's hint line when ticked, Set To Preset with CM's seven templates, and
"Set Piece Instructions for …" with the six roles. Set Instructions ▸ Team shows the nine Team
Instructions in the same rows with their unticked placeholders, and the team set-piece instructions
per side. All edits save through `ChangeTactics`.

Seam: renderer only.

**Decisions:**

- **The Tactics screen follows CM 03/04's own layout (prototype variant A): File and View menus, Set Positions / Set Instructions / Set Priorities modes, a Team Selection list always on the left, CM's tick-box-plus-dropdown instruction rows, and the same screen in match with Confirm, Undo Last and Cancel.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-30-tactics-screen-follows-cm-0304-layout.md).
- **CM 03/04's per-player screen exactly (five overrides with a `team` value, three standalone settings, seven normal/often switches), stored per slot; Distribution on the GK slot only; specific marking is match-time only; built-in templates seed each slot from CM's instruction template for its cell for the non-override instructions only, leaving the five overrides at `team`; no fit rating replaces Role Rating, and effects read the executing player's attributes.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-29-cm-player-instructions-per-slot-without-a-fit-rating.md).
- **CM 03/04's nine team instructions, each defaulting to the game's unticked state, replace Mentality/Tempo/Pressing; Tactical Style presets are removed and the preferred formation is the manager's tactical identity.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-29-cm-team-instructions-replace-sliders-and-styles.md).

**Blocked by:** 22

**Status:** resolved

- [x] Ticking a row enables its dropdown and sets the first real value; unticking restores the team or default text.
- [x] Set To Preset fills the slot with that template's values.
- [x] Distribution appears only for the goalkeeper slot.
- [x] A ticked switch shows CM's hint; every control is keyboard reachable.
- [x] Renderer tests pass, and typecheck and lint pass.
