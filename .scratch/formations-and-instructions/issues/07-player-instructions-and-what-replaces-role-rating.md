# 07: Player instructions, and what replaces Role Rating

Type: grilling
Blocked by: 03, 04, 13
Status: resolved

## Question

Given ticket 03's findings, fix the per-player instruction set, each one's values, and whether a
value can defer to the team setting. Decide each slot's default instructions (by slot, by preset,
or a single default). Decide what replaces Role Rating's job: today a player's fit for his Role
nudges `TacticalModifiers` by up to ±0.05. Either an instruction-fit measure takes that job, or the
mechanism goes and instructions act only through ticket 08's effects. Decide whether role-like
instruction bundles exist as UI-only conveniences (allowed only if ticket 03 shows CM offered
something similar); they must not be domain concepts. Uses ticket 13's inventory of Role consumers.

## Answer

**CM 03/04's per-player screen exactly (five overrides with a `team` value, three standalone
settings, seven normal/often switches), stored per slot; Distribution on the GK slot only; specific
marking is match-time only; built-in templates seed each slot from CM's instruction template for its
cell for the non-override instructions only, leaving the five overrides at `team`; no fit
rating replaces Role Rating, and effects read the executing player's attributes.** See
[Agent Note](../../../.agents/notes/implemented/feature/2026-09-29-cm-player-instructions-per-slot-without-a-fit-rating.md).
The template values are transcribed in
[ticket 14](14-transcribe-cm-instruction-templates.md).

Amended 2026-09-29 after [ticket 14](14-transcribe-cm-instruction-templates.md) showed every CM
template sets Passing, Tackling and Mentality explicitly: seeding those would cut built-in slots off
from the Team Instructions. `default` means the engine's own behaviour with no instruction.
