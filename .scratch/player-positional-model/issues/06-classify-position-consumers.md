# 06: What each Position consumer actually needs

Type: grilling
Blocked by: 03, 05

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
