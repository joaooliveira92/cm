# Spec: CM 03/04 player positional model

Status: ready-for-agent

> Synthesized by `cm-to-spec` from the resolved [player-positional-model map](map.md) (tickets 01-11)
> and the conversation of 2026-09-29. Every implementation decision below traces to a resolved
> ticket; decisions that produced a proposed Agent Note end with that ticket's gist and link. The
> sibling effort [formations-and-instructions](../formations-and-instructions/map.md) consumes the
> slot vocabulary defined here.

## Problem Statement

A player's positional ability is one Familiarity Tier (natural, competent, unfamiliar) per Position,
from ten Positions (GK, DC, DL, DR, DM, MC, ML, MR, AMC, ST), with one Natural Position and at most
one Competent neighbour per generated player. That is an MVP model. It cannot express what
Championship Manager 03/04, the game this clones, expressed: a player who is a strong defender on
both flanks but weak in the centre, a wide midfielder who can also play wing-back, a sweeper, a wide
attacking midfielder, a striker who is really a forward. It cannot tell two centre-backs apart, so a
tactics grid with left-centre and right-centre cells has nothing to rate a player against. It shows
no CM-style label (`D/DM RC`, `AM/F RC`). Playing a player out of position costs nothing beyond his
attributes weighing poorly against the slot. Positions never change over a career.

## Solution

Players carry CM 03/04's positional ratings: eight Line Ratings (GK, SW, D, DM, M, AM, F, WB),
three Side Ratings (R, L, C) and a hidden Free Role Rating, each 1-20. From those the game derives,
for every cell of CM's tactics grid, how well the player suits it; derives the Familiarity Tier from
that suitability; and renders CM's compact label. The manager sees labels and a fit indicator, never
the raw numbers, as CM showed them. Squads are generated from footballing archetypes so every club can
field CM's common shapes. A manager can retrain a player toward a new line or side through training.
Tactics slots become cells of CM's grid, rated by row and width. Poor suitability costs in the match,
decided and built by the sibling effort.

## User Stories

1. As a manager, I want each player to show a CM-style position label such as `D/DM RC`, so that I can
   read at a glance where he plays.
2. As a manager, I want the label to follow CM 03/04's own rules, so that it reads the way the game I
   know read.
3. As a manager, I want goalkeepers labelled plain `GK`, so that the label is not cluttered.
4. As a manager, I want a forward labelled `F` when he also plays wide or behind the striker and `S`
   when he is an out-and-out striker, so that I can tell a forward from a striker.
5. As a manager, I want players rated separately for their line and their side, so that a right-back
   who cannot play on the left is not shown as a full-back on both flanks.
6. As a manager, I want versatile players who cover several lines and sides, so that I can build
   3-back and 5-back shapes from a normal squad.
7. As a manager, I want the Tactics screen to show how well a player suits each cell, so that I can
   see whether he fits before I place him.
8. As a manager, I want left-centre and right-centre cells rated like the centre, so that two
   centre-backs are both at home.
9. As a manager, I want wing-backs rated for the wide defensive-midfield and wide defence cells, so
   that 5-3-2 wing-backs fit where CM put them.
10. As a manager, I want a midfielder who is a strong attacking midfielder to be credible in central
    midfield, so that the suitability rule does not punish a natural playmaker.
11. As a manager, I want playing a player badly out of position to cost my team, so that selection
    matters.
12. As a manager, I want the Familiarity Tier (natural, competent, unfamiliar) to keep meaning what it
    meant, so that Overall Rating and the Tactics overview still read correctly.
13. As a manager, I want Overall Rating to stay the player's best rating among the cells he is natural
    in, so that values and comparisons do not shift for no reason.
14. As a manager, I want the squad, search and transfer tables to show the compact label in the
    position column, so that every list reads the same way.
15. As a manager, I want the position column to sort in pitch order of the player's best line and
    then his side, so that goalkeepers come first and strikers last.
16. As a manager, I want to filter by position and get every player who can play there (suitability 15
    or more in the chosen rows and sides), so that versatile players are not hidden.
17. As a manager, I want squad grouping by the player's best natural line, so that the squad reads by
    unit.
18. As a manager, I want the Free Role rating hidden, as CM hid it, so that finding a free spirit is
    something play reveals.
19. As a manager, I want raw positional ratings hidden everywhere, so that the game reads like CM
    rather than an editor.
20. As a manager, I want to set a retraining target (a line or a side) for a player, so that I can
    convert a winger into a wing-back over time.
21. As a manager, I want retraining to be gradual and faster for young and determined players, so
    that conversions are a real decision.
22. As a manager, I want a player's positions not to drift when I do not retrain him, so that my
    squad stays predictable.
23. As a manager starting a career, I want every club's squad to be able to field the common CM
    shapes, so that no club starts unable to play a back four or a back three.
24. As a manager, I want generated players to look like real footballers (full-backs on one flank,
    centre-backs central, wide forwards on the wings), so that the world is believable.
25. As a manager, I want some attacking players with a high hidden Free Role rating, so that the
    Free Role instruction has players who suit it.
26. As a manager scouting a club, I want its predicted shape named by template and row-count label,
    so that I can read how it plays.
27. As an AI club, I want to assess squad needs by line and side coverage, so that transfers fill real
    gaps.
28. As a match viewer, I want commentary, match ratings and statistics to know which phase a player
    was playing in, so that reports stay correct after the change.
29. As a player of an older save, I want the game to refuse it clearly, so that I am not left with a
    broken career.
30. As a developer, I want suitability, the label, tiers, ratings and generation to be pure functions
    in the shared package, so that they are testable and every surface agrees.

## Implementation Decisions

- **Representation.** Each player stores eight Line Ratings (GK, SW, D, DM, M, AM, F, WB) and three
  Side Ratings (R, L, C), independent, as CM 03/04 stored them. **Line × side, as CM stored it: eight
  1-20 Line Ratings (GK, SW, D, DM, M, AM, F, WB) and three 1-20 Side Ratings (R, L, C), persisted
  like Attributes but not Attributes, in one row per player replacing `player_positions`.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-29-players-store-cm-line-and-side-ratings.md).
- **Free Role.** A twelfth 1-20 rating stored with the lines, hidden from every screen, read only by
  the label's F-or-S rule, suitability where it applies, and the Free Role player instruction.
  **Free Role is a twelfth 1-20 positional rating, stored with the lines and hidden from every screen;
  the Free Role player instruction belongs to the formations-and-instructions effort and its effect
  scales with this rating.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-29-players-store-cm-line-and-side-ratings.md).
- **Scale and status.** All twelve are 1-20, the Attribute range, where 1 means cannot play there.
  They are persisted primitives changed only by retraining; they are not Attributes in the glossary
  sense. Suitability, Position Rating, Overall Rating, the Familiarity Tier and the label are
  read-time projections, never stored.
- **Storage.** `player_positions` is replaced by one row per player carrying the twelve ratings as
  columns, each checked to 1-20. The DDL change moves the schema version, so older saves are refused
  on open with the existing schema-mismatch error; there is no migration and no upgrade transformer,
  and save fixtures move to the new schema.
- **Slot vocabulary.** A slot is its own (row, column) type, not a Position: rows GK, SW, D, DM, M,
  AM, F (the same codes as the lines they are rated against; WB is a line, never a row), columns L,
  LC, C, RC, R, displayed as `D RC`, sorted in pitch order. **A slot is its own (row, column) type:
  rows GK, SW, D, DM, M, AM, F and columns L, LC, C, RC, R; Position Weights keyed by row and width
  (twelve tables, four new); phase by row.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-29-slots-are-row-column-cells-weighted-by-row-and-width.md).
- **Position Weights.** Twelve tables keyed by row and width (L and R wide; LC, C, RC central). GK,
  D wide, D central, DM central, M wide, M central, AM central and F central carry over today's GK,
  DL/DR, DC, DM, ML/MR, MC, AMC and ST weights. SW, DM wide, AM wide and F wide are new design values
  authored with this spec's first implementation ticket.
- **Phase.** Follows the row: GK, SW, D feed defence; DM, M feed midfield; AM, F feed attack. Runs
  and possession-dependent phase belong to the sibling effort.
- **Suitability.** `min(line for the row, side for the column)` on 1-20; LC and RC read the C side;
  D L/R and DM L/R read `max(line, WB)`; M reads `max(M, AM − 5)`; GK reads the GK line only. This is
  this game's rule, informed by CM 01/02, not a verified CM 03/04 rule. **suitability = min(line for
  the row, side for the column), with LC/RC reading C, wide D and DM reading max(line, WB), M reading
  max(M, AM − 5); Familiarity Tier derived (natural 18-20, competent 15-17, unfamiliar ≤14); Overall
  Rating unchanged; a match cost for poor suitability moves to formations-and-instructions ticket
  08.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-29-slot-suitability-min-of-line-and-side.md).
- **Familiarity Tier.** Derived from suitability: natural 18-20, competent 15-17, unfamiliar 14 or
  below, this game's thresholds. No longer stored.
- **Overall Rating.** The best Position Rating among cells where the player is Natural; Transfer
  Value keeps reading it.
- **Match cost.** Poor suitability costs in the match; its curve and wiring are built by the sibling
  effort's engine work. This spec exposes suitability as the input it reads.
- **Compact label.** CM Scout's reconstruction exactly: a line or side appears at 15 or above; GK ≥ 15
  renders plain `GK`; lines in the order SW, D, DM, M, AM, F-or-S joined by `/`; M only if DM and AM
  are both below 15; AM only if DM is below 15 and (F is below 15 or M is 15 or above); `F` when Left,
  Right, Free Role or AM is also 15 or above, otherwise `S`; WB never appears; sides after one space in
  R, L, C order with no separator. **CM Scout's reconstruction exactly: threshold 15, GK
  short-circuit, SW/D/DM/M/AM/F-or-S with its M and AM suppression, the F/S rule, no WB, sides in R-L-C
  order after a space.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-29-compact-position-label-follows-cm-scout.md).
- **Generation.** Players are drawn from ten archetypes (GK, centre-back, full-back, wing-back,
  defensive mid, central mid, wide mid, attacking mid, wide forward, striker), each fixing which lines
  reach natural (18-20) and competent (15-17) and drawing a side pattern (R, L, RL, C, RC, LC, RLC)
  with archetype-specific odds; Free Role correlates with AM, F and flair; WB is high for wing-backs
  and some full-backs. The odds are tuning constants, and generation stays deterministic under the
  world seed.
- **Squad demand.** About 25 per club: GK 3, centre-back 4, full-back 2+2 (a pair per side),
  defensive mid 2, central mid 3, wide mid 2, attacking mid 1, wide forward 2, striker 3. It replaces
  `SQUAD_COMPOSITION` and `ADJACENT_POSITIONS`; renumbered squad slots are a ruleset change.
- **Retraining.** One line-or-side target per player, set by the manager, rising through the weekly
  training tick at a rate that grows with youth and determination; nothing decays and nothing grows
  from match minutes. **Retraining only: one line-or-side target per player, rising through the
  weekly training tick, no decay, no growth from playing.** See
  [Agent Note](../../.agents/notes/proposed/feature/2026-09-29-positions-retrain-through-training-only.md).
- **Squad screens.** The position column shows the compact label, sorts by pitch order of the best
  line then side (R, L, C), groups by best natural line, and filters by "can play" (suitability 15 or
  more in any cell of the chosen rows and sides). Raw ratings are hidden everywhere; the Tactics
  screen shows per-cell suitability where Role Rating used to be. **The compact label as the column,
  sorted by pitch order of the best line then side; grouping by best natural line; filters match
  suitability ≥ 15; raw ratings hidden everywhere, with per-cell suitability on the Tactics screen.**
  See [Agent Note](../../.agents/notes/proposed/feature/2026-09-29-positional-ratings-stay-hidden.md).
- **Contracts over IPC.** Player views carry the compact label and, where a screen needs fit, derived
  suitability or tier; no contract carries a raw positional rating. Contract offers and the
  `PlayerSigned` event drop the positional designation entirely.
- **Other consumers.** Best XI fills cells by suitability-adjusted Position Rating; the Tactics
  overview counts derived tiers; transfers and AI squad needs use line and side coverage, with
  valuations on Overall Rating; scouting names a predicted shape by template and row-count label;
  match commentary, ratings and statistics read phase by row.
- **Transitional slot mapping.** Until the sibling effort replaces the Tactic, the Tactic's existing
  Position slots are rated through a pure mapping onto cells (DC → D C, DL → D L, DR → D R, DM → DM
  C, MC → M C, ML → M L, MR → M R, AMC → AM C, ST → F C, GK → GK). The formations-and-instructions
  spec deletes that mapping together with the `Position` type.
- **Glossary.** `CONTEXT.md`'s Position and Familiarity Tier entries are replaced, and Line Rating,
  Side Rating, Free Role Rating, Slot and Suitability are added, in the same change as the code.

## Testing Decisions

- **Good tests** exercise behaviour through a public seam: given ratings, the rule returns a
  suitability, tier or label; given a seed, generation returns squads with stated properties. No test
  reaches into a module's internals.
- **Seam 1, the shared positional rules (carries most of the weight).** Pure functions: suitability
  for each special case (LC/RC reading C, wide D and DM reading WB, M reading AM − 5, GK), tier
  thresholds, the label for every rule with the research's worked examples as a table-driven test,
  Position Rating by row and width, Overall Rating, and the archetype draws (distribution bounds,
  determinism under a seed). Prior art: the shared package's ratings, generation and Best XI tests.
- **Seam 2, a seeded save through the main process.** A seeded world's squads can each fill the
  common presets' shapes with competent or better players; squad, search and transfer views carry
  labels and suitability-based filters; no view or contract carries a raw positional rating; an
  older-schema save is refused with the schema-mismatch error. Prior art: the seeded-save world and
  club tests (import `createSave` from the seeded-save helper).
- **Seam 3, retraining over the weekly training tick.** Advanced with the existing boundary helpers,
  a player with a target gains only in that rating; one without keeps identical ratings through a
  season.
- **Screens, lightly.** The squad table's position column, sort and filter behaviour, in the existing
  squad table tests.

## Out of Scope

- Football Manager's six-label proficiency scale.
- Migrating existing saves.
- Growth of positional ratings from match minutes, and decay from disuse (unverified for CM 03/04).
- The staff "Free Roles" coaching preference.
- CM 03/04's missing attributes (Versatility, Off The Ball, Marking and others): a separate effort.
- The Tactic, its templates, instructions, runs and the match engine's suitability cost: owned by
  formations-and-instructions.

## Further Notes

- **Sequencing.** This spec ships first. The formations-and-instructions spec then replaces the
  Tactic's Position slots with cells and deletes the transitional mapping and the `Position` type.
- **Research.** Facts rest on
  [the positional research](../../docs/research/player-positional-model-cm0304-positional-fields.md);
  claims labelled inherited from CM 01/02 (the suitability special cases) are this game's choices,
  not verified CM 03/04 behaviour.
- **Shared worktree.** Parallel sessions share the worktree and the git index; implementation
  commits use `git commit --only -- <paths>`.
