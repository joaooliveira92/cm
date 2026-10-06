# 09: Generating a player's line and side ratings

Type: grilling
Blocked by: 03, 07
Status: resolved

## Question

World generation writes one Natural Position plus sometimes one Competent adjacent Position
(`ADJACENT_POSITIONS`, `SQUAD_COMPOSITION` in `shared/rules/generation.ts`). Decide how a generated
player's eight Line Ratings, three Side Ratings and hidden Free Role Rating are distributed: the
archetypes a squad is built from (full-back, centre-back, winger, ...), how many lines and sides
reach 15 and 18, how footedness-like side patterns arise (R only, L only, RLC), how Free Role
correlates with AM and F, and what replaces `SQUAD_COMPOSITION` so every squad can fill the 29
presets' common shapes. Must stay deterministic under the world seed.

## Answer

**Archetype generation: GK, centre-back, full-back, wing-back, defensive mid, central mid, wide mid,
attacking mid, wide forward and striker, each fixing which lines reach natural (18-20) and competent
(15-17) and drawing a side pattern (R, L, RL, C, RC, LC, RLC) with archetype-specific odds; Free Role
correlates with AM, F and flair; WB is high for wing-backs and some full-backs.** Squad demand of
about 25: GK 3, CB 4, FB 2+2 (a pair per side), DM 2, CM 3, wide mid 2, AM 1, wide forward 2, striker
3; versatile players cover 3- and 5-back shapes. The odds are tuning constants, generation stays
deterministic under the world seed, and the renumbered squad slots are a ruleset change (older saves
are refused anyway). No Agent Note: generation data under the representation note.
