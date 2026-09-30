# 13: Players are stored and generated with line, side and Free Role ratings

**What to build:** A new career generates every player with twelve positional ratings drawn from
footballing archetypes (GK, centre-back, full-back, wing-back, defensive mid, central mid, wide mid,
attacking mid, wide forward, striker), with side patterns (R, L, RL, C, RC, LC, RLC) at
archetype-specific odds, Free Role correlated with AM, F and flair, and WB high for wing-backs and
some full-backs. Each club's squad of about 25 follows the new demand: GK 3, centre-back 4, full-back
2+2 (a pair per side), defensive mid 2, central mid 3, wide mid 2, attacking mid 1, wide forward 2,
striker 3. The ratings are stored in one row per player, each column checked to 1-20, replacing
`player_positions`. Every existing reader keeps working unchanged through a derived projection that
yields the old list of (Position, Familiarity Tier) from the ratings via the transitional mapping,
keeping competent-or-better entries as the stored rows did. An older save is refused on open with the
existing schema-mismatch error. `CONTEXT.md` gains Line Rating, Side Rating and Free Role Rating.

Seam: world generation and the player read path in the main process. The storage boundary treats a
rating outside 1-20 as a defect (the check constraint), not a typed failure. Generation stays a pure,
seeded function; renumbering squad slots is a ruleset change. Tested at [the spec](../spec.md)'s seam 2.

**Decisions:**

- **Line × side, as CM stored it: eight 1-20 Line Ratings (GK, SW, D, DM, M, AM, F, WB) and three 1-20 Side Ratings (R, L, C), persisted like Attributes but not Attributes, in one row per player replacing `player_positions`.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-players-store-cm-line-and-side-ratings.md).
- **Free Role is a twelfth 1-20 positional rating, stored with the lines and hidden from every screen; the Free Role player instruction belongs to the formations-and-instructions effort and its effect scales with this rating.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-players-store-cm-line-and-side-ratings.md).

**Blocked by:** 12

**Status:** ready-for-agent

- [ ] A seeded world is deterministic: two generations with the same seed produce identical ratings.
- [ ] Every generated club can fill the 4-4-2, 4-3-3, 3-5-2 and 5-3-2 shapes (mapped onto cells) with players of competent-or-better suitability.
- [ ] Archetype distributions stay inside stated bounds over a large seeded sample (side patterns, share of RLC players, Free Role correlation).
- [ ] Every existing reader of positions and familiarity passes its existing tests unchanged through the projection.
- [ ] A save created under the old schema is refused with the schema-mismatch error.
- [ ] The commit states it is a DDL change that refuses older saves.
- [ ] `pnpm check:all` is green, and every e2e spec touching squads passes.
