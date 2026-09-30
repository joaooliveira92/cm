# 05: The built-in formation preset set

Type: grilling
Blocked by: 02, 04
Status: resolved

## Question

Given ticket 02's findings, fix the list of built-in presets and each one's slot composition. For
each preset, say whether it uses only today's slots (buildable immediately) or needs a slot that
[player-positional-model ticket 05](../../player-positional-model/issues/05-tactical-slot-vocabulary.md)
introduces (sliced behind that ticket). Decide what happens to a shipped CM preset whose slot the
positional effort decides not to add. Decide which preset a new career's manager and a fresh AI club
start from, and what replaces `manager_profile.preferred_formation`'s five-value constraint.

## Answer

**The 29 presets of patch 4.1.3 onward ship as built-in Tactic Templates, with their cells and runs
exactly as in the files and their names as the file names.** Every preset waits on the grid from
[player-positional-model ticket 05](../../player-positional-model/issues/05-tactical-slot-vocabulary.md),
since slots are grid cells (ticket 04); the "existing Positions proceed immediately" route no longer
exists. Unverified details in the files (the R/L handedness) take the reading that matches CM's usual
order. Built-in templates carry the per-slot default Player Instructions from ticket 07, not values
guessed from undecoded bytes. `manager_profile.preferred_formation` becomes a reference to one of the
29; a new manager's first Tactic loads it, and an AI club starts from its manager's preferred
template until ticket 11 decides AI choice. No Agent Note: the list is research data, and the
reference and defaults are recorded in
[the team-instructions note](../../../.agents/notes/proposed/feature/2026-09-29-cm-team-instructions-replace-sliders-and-styles.md).
