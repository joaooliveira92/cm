# 03: The canonical representation of where a player can play

Type: grilling
Blocked by: 01
Status: resolved

## Question

Choose what is stored on a player, given what ticket 01 found CM 03/04 actually stores:

- **Line × side ratings**: one rating per positional line and one per side, independent. The
  working hypothesis. It guarantees the compact label is always a clean grid, because every listed
  line pairs with every listed side.
- **Independent per-cell ratings**: one rating per atomic position (`DL`, `DMC`, `AMR` …). Can
  express a player the line × side model cannot (strong at AMR and FC but not AMC or FR), at the cost
  of labels that may not form a grid.
- **A dual representation**, kept only if a migration needs it (see ticket 02). Rejected by default.

Also settle, as part of the same choice:

- the rating scale and whether it is an Attribute in the glossary's sense (it is not a skill, so
  probably not);
- whether the ratings are persisted primitives, like Attributes, or derived from something else;
- the table shape that replaces `player_positions`.

Record the answer as the successor to the Position entry in `CONTEXT.md`, via `domain-modeling`.

## Answer

**Line × side, as CM stored it: eight 1-20 Line Ratings (GK, SW, D, DM, M, AM, F, WB) and three 1-20
Side Ratings (R, L, C), persisted like Attributes but not Attributes, in one row per player replacing
`player_positions`.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-players-store-cm-line-and-side-ratings.md). `CONTEXT.md` is updated when the code ships.
