# Scout resource model & assignment mechanics

Type: grilling
Status: resolved

## Question

Design the Scout resource and Scouting Assignment mechanics for the human-managed club:

- How many Scouts does a club have, and how does that number derive from Stature Tier (mirroring how
  Transfer Budget/Wage Budget already derive from it)?
- Assignment targeting is Player-only (confirmed during charting — see map's Out of scope for the
  rejected "watch a Club" alternative). What does assigning/unassigning a Scout to a Player actually
  look like as a command? Can multiple Scouts be assigned to the same Player? Is there a cap on
  simultaneous assignments per club (bounded by Scout count, or can assignments queue)?
- Reassigning a Scout from Player A to Player B: confirmed during charting that Player A's Scouting
  Progress pauses/freezes rather than resets (Attribute Range only ever narrows, never widens). Does
  a paused assignment show anywhere distinct from an active one, or is "not currently assigned" the
  only state that matters?
- Free Agents: confirmed during charting that they're treated identically to contracted players
  (start Unscouted, need a Scout assigned) — any wrinkle specific to Free Agents worth calling out
  (e.g. they can't be "hidden" behind another club's information asymmetry, but the mechanic still
  applies uniformly)?
- What happens to an in-flight Scouting Assignment/Progress when its target Player transfers into the
  human's own club (immediately Fully Scouted per existing squad rules) or out of the game entirely
  (retires, if that ever happens) or into another club's squad?

Blocked by: none (can start immediately).

## Answer

**Scout count derives from Stature Tier (tier→count table, set once at Season start); strict 1:1 assignment (N Scouts = N slots, no stacking); explicit `AssignScout`/`UnassignScout` commands with no implicit auto-swap; Progress just stops/resumes on unassign/reassign (no separate paused state); Free Agents get no special-case; Progress is discarded on joining the human's own squad, persists across moves to other clubs.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-28-scout-resource-and-assignment-model.md).
