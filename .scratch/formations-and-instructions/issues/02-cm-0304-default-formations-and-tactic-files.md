# 02: What formations CM 03/04 shipped, and what a tactic file held

Type: research
Blocked by: None (can start immediately)
Status: resolved

## Question

Establish, from primary or near-primary evidence, the built-in formation set of Championship
Manager 03/04 and the shape of a saved tactic. Label every claim **verified for CM 03/04**,
**inherited from CM 01/02 or CM4**, or **later Football Manager**. Record an unsourced claim as
unverified, not smoothed over.

The pasted requirements list that opened this effort is a hypothesis to test, not a source. It
claims these presets: 4-4-2, 4-4-2 Diamond, 4-4-2 Attacking, 4-3-3, 4-5-1, 4-2-3-1, 3-5-2
Attacking, 3-5-2 Defensive, 3-4-3, 5-3-2, 4-1-2-1-2, 4-2-4, 5-4-1 (Sweeper), 2-5-3. Suspect claims
include the 4-3-3 as three flat MCs plus three STs, 2-5-3 as a shipped default, and the two
contradictory definitions of 3-5-2 Defensive.

Evidence worth seeking: the default `.tac` files shipped with the game, the Quick Load / tactic
load menu, the official manual, GameFAQs guides, and champman0102.net and similar archives.

Settle:

1. **The shipped preset list**, by name, with each preset's slot composition (which positional
   cell each of the ten outfield players occupies).
2. **The slot grid.** The cells a player can be placed in on the CM 03/04 tactics screen (for
   example GK, SW, D L/C/R, WB L/R, DM L/C/R, M L/C/R, AM L/C/R, F/ST L/C/R). Coordinate with
   [player-positional-model ticket 01](../../player-positional-model/issues/01-cm-0304-editor-positional-fields.md),
   which covers what the *player database* stores. This ticket covers the *tactics screen*.
3. **Tactic file contents.** What a saved `.tac` file stores: formation, with-ball and without-ball
   positions, team instructions, per-player instructions, set-piece takers, captain, anything else.
   Whether it stores player identities or only slots.
4. **Which presets the AI used**, and whether anything documents how the AI picked one.
5. **With-ball / without-ball positions.** Whether CM 03/04 had separate positions per phase
   (movement arrows) and what they were called in the game.

Findings: [CM 03/04 formation presets, the tactics slot grid, and .tac files](../../../docs/research/formations-and-instructions-cm0304-formations-and-tactic-files.md)

Deliverable: one findings file under `docs/research/` via the `research` skill, and a context
pointer appended to this ticket. Feeds tickets 04, 05, 10 and 11. Decides nothing about this
codebase.

## Answer

**CM 03/04 ships 29 presets from patch 4.1.3 onward (27 at retail, inherited from CM4), on a grid
of one GK cell plus six outfield rows (SW, D, DM, M, AM, forward) by five columns (L, LC, C, RC,
R), with no wing-back row; each player has a base cell and one run (arrow) target.** A `.tac` file
holds pitch coordinates, base and run cells, and per-player instruction and set-piece blocks for 11
slots, plus a team block; no player identities, captain or takers. The pasted list's 3-5-2
Attacking/Defensive and 5-4-1 Sweeper do not exist (the game has 5-3-2 Attacking/Defensive/Sweeper);
2-5-3 and the 4-3-3 of three MCs plus three strikers are real. The presets double as AI tactics and
staff carry a Preferred Formation naming one; how the AI picks is undocumented. Full tables in the
findings file linked above. No Agent Note: fact-finding only.
