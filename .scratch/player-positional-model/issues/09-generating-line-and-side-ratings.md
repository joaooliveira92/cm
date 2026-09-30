# 09: Generating a player's line and side ratings

Type: grilling
Blocked by: 03, 07

## Question

World generation writes one Natural Position plus sometimes one Competent adjacent Position
(`ADJACENT_POSITIONS`, `SQUAD_COMPOSITION` in `shared/rules/generation.ts`). Decide how a generated
player's eight Line Ratings, three Side Ratings and hidden Free Role Rating are distributed: the
archetypes a squad is built from (full-back, centre-back, winger, ...), how many lines and sides
reach 15 and 18, how footedness-like side patterns arise (R only, L only, RLC), how Free Role
correlates with AM and F, and what replaces `SQUAD_COMPOSITION` so every squad can fill the 29
presets' common shapes. Must stay deterministic under the world seed.
