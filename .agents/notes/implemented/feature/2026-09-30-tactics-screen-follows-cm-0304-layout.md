# Agent Note: The Tactics screen follows CM 03/04's own layout

Status: implemented

## Problem

The rebuilt Tactic (see [A Tactic is a Tactic Template plus players](../architecture/2026-09-29-tactic-templates-and-grid-cell-slots.md))
carries far more than the v1 screen shows: a 27-cell grid with runs, a template library, nine team
instructions, fifteen per-slot player instructions, six set-piece roles per slot, team set-piece
instructions per side, and eight ordered taker lists. The screen could present that as tabs, a
spreadsheet of slots, or CM 03/04's own tactics screen. A prototype built all four
(`prototype/tactics-screen`, variants A to D) against CM 03/04 screenshots the human supplied.

## Proposal

The Tactics screen follows CM 03/04's tactics screen (prototype variant A):

- **Menu bar.** File (quick load any built-in or saved Tactic Template, Save, Save As) and View
  (which Team Selection columns show) on the left, with the name of the template the Tactic came
  from and "(modified)" beside them; Set Positions, Set Instructions and Set Priorities on the right.
  Unlike CM, Set Instructions and Set Priorities are plain buttons, not menus: the Team/Player
  choice is a toggle in the instructions panel's title row, and Set Priorities shows every taker
  list at once (see below).
- **Team Selection list, always on the left.** Starters in slot order, then substitutes, then
  reserves: shirt number, name, a Capt badge, the compact position label, the slot and its fit tier,
  Condition. Selecting a starter selects his slot; choosing a substitute next swaps him in.
- **Set Positions.** A vertical pitch with the 27 cells; numbered markers with "Surname, F" labels,
  runs as dotted lines, poor fit marked by more than colour. A selected player moves to an empty cell.
- **Set Instructions.** Two titled panels, as CM drew them: "Instructions for Surname, F (cell)"
  (or Team Instructions) above, "Set Piece Instructions for …" below. CM's row: a tick box enabling a dropdown. Unticked, the dropdown is disabled
  and shows what applies instead ("Team (Mixed)" for an override, "(default)" for a standalone
  setting or role). A ticked "often" flag shows CM's own hint line. Player instructions end with Set
  To Preset and the player's six set-piece roles; the Team screen holds the nine team instructions
  and the team set-piece instructions per side.
- **Set Priorities.** All five panels at once rather than CM's one-per-menu-item, because a manager
  setting takers compares the lists. Each panel is one or two ordered taker lists, filled from the
  Team Selection list and reordered in place.
- **In match.** The same screen, as in CM 03/04, with Confirm, Undo Last and Cancel; confirmed
  changes take effect at the next minute (the live-change boundary). The prototype's compact
  live-match variant (D) was not chosen.

## Alternatives considered

- **Tabbed workspace (variant B).** Rejected: splits what a manager adjusts together (a player's
  instructions and his place on the pitch) across tabs.
- **Slot spreadsheet (variant C).** Rejected: dense for comparison but loses the pitch as the primary
  surface and reads nothing like CM.
- **A compact live-match panel (variant D).** Rejected in favour of CM's single screen in and out of
  matches.

## Acceptance criteria

- Every Tactic setting in the model is reachable from this screen, by keyboard as well as pointer.
- Unticked settings show the value that applies instead; nothing reads as blank.
- The screen shows no raw positional rating; fit reads as a tier word and a non-colour marker.

## Risks

- A dense single screen is harder at small window sizes. The editor fills the window and its panels
  scroll; in Set Positions the pitch keeps 68:100 and takes the width that needs (at most 60% of the
  row), and Team Selection drops Condition, then the position label, then the fit word as it narrows.
- CM's drag and drop for takers and swaps needs a keyboard equivalent, which the prototype did not
  build.
