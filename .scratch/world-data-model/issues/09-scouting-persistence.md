# 09 - Scouting: assignments, progress, and information policy at world scale

Type: grilling
Status: claimed
Blocked by: 05, 07

## Question

Scouting is designed and unbuilt: `.agents/notes/proposed/feature/` holds the progress-accrual and
scout-assignment designs, `.agents/notes/proposed/architecture/` holds the technical contract, and no
table exists. Charting settled that scouting ships in MVP, and that Scouts are staff.

With the staff model (05) and the depth model (07) settled, decide the persistence:

- What tables scouting needs: assignments, per-(player, club) progress, and whatever Attribute Range
  display requires. Is Attribute Range computed from progress at read time, or stored?
- The row-count problem this creates. Progress is per-(player, human club); with one human club that
  is one row per scoutable player in the world, which at `standard` depth could be hundreds of
  thousands. Is progress stored only for players actually scouted, with absence meaning Unscouted?
- How scouting interacts with depth. Can the human scout a player in a `results-only` competition
  where no player rows exist? What does the search screen show?
- Whether AI clubs carry scouting state. The existing design says they read full information and never
  scout, which keeps this cheap — confirm that survives a multi-nation world.
- Where Tactical Acumen's deferred scouting binding lands, if anywhere in MVP.

The proposed notes are the input, not the output: this ticket may contradict them, and if it does it
says so explicitly.
