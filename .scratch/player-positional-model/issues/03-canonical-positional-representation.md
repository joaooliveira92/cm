# 03: The canonical representation of where a player can play

Type: grilling
Blocked by: 01

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
