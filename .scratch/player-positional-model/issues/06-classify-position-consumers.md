# 06: What each Position consumer actually needs

Type: grilling
Blocked by: 03, 05
Status: resolved

## Question

The map's **Known `Position` consumers** table lists every place the ten-value `Position` is read.
Once the representation (03) and slot vocabulary (05) are settled, classify each consumer by what it
really needs:

- a **tactical slot** (formations, pitch layout, `tactic_slots`),
- a **positional line** or a **side** (generation, squad grouping, search filters),
- a **derived suitability** for a (player, slot) pair (best XI, the Tactics overview),
- a **compact display label** (squad column, player profile, transfer lists),
- or a **broad category** such as GK / defender / midfielder / forward (AI squad needs, valuations).

The output is the table with a "needs" column and, for each row, the type it will import. Its
purpose is to stop the richer model being passed everywhere as one overloaded type. Consumers that
turn out to need only a broad category should get one named type, not each derive their own.

## Answer

**Approved classification.** `POSITION_WEIGHTS` → 12 weight tables by row and width;
`PHASE_POSITIONS` → phase by row, run-aware in possession; `FORMATION_SLOTS` → the 29 built-in Tactic
Templates; `POSITION_ROLES` → deleted; `ADJACENT_POSITIONS` and `SQUAD_COMPOSITION` → generation
archetypes (ticket 09); Best XI → fills cells by suitability-adjusted Position Rating; Overall Rating →
best Position Rating among Natural cells; storage → the twelve-rating player row, and `tactic_slots`
holding row, column, run and instructions; Tactics overview → derived tiers; pitch layout → the
31-cell grid; transfers and AI squad needs → coverage by line and side, valuations on Overall Rating;
scouting's predicted shape → template name plus row-count label; match commentary, ratings and stats →
phase by row; squad, search and filters → ticket 11. Contract offers and the `PlayerSigned` event
drop the positional designation entirely (CM 03/04 contracts named none), which supersedes the
"replace with the Position" line of formations-and-instructions ticket 13. No Agent Note: a
classification of consumers under already-recorded decisions.
