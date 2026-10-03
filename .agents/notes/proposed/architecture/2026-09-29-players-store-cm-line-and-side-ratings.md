# Agent Note: Players store CM 03/04's line and side ratings

Status: proposed

## Problem

A player's positional ability was stored as one Familiarity Tier (natural, competent, unfamiliar)
per Position from a ten-value set, in `player_positions`. Championship Manager 03/04, which this
game clones, stored something different: independent ratings per positional line and per side, from
which slot suitability and the compact label (`D/DM RC`, `AM/F RC`) are derived. It also stored a
hidden Free Role rating. The representation has to be chosen before slots, suitability or labels can
be specified. The facts come from the
[positional research](../../../../docs/research/player-positional-model-cm0304-positional-fields.md).

## Proposal

- **Line Ratings.** Eight independent 1-20 ratings per player: GK, SW, D, DM, M, AM, F, WB.
- **Side Ratings.** Three independent 1-20 ratings per player: R, L, C.
- **Free Role Rating.** A twelfth 1-20 rating stored with them and hidden from every screen, as CM
  hid it. Only rules read it: the label's F-or-S choice, slot suitability where the suitability rule
  uses it, and the size of the Free Role player instruction's effect.
- **Wing Back** is stored although no label shows it, because suitability for the wide D and DM
  cells reads it.
- **Scale.** 1-20, the Attribute range; 1 means cannot play there. CM's editor allowed 0; this game
  does not.
- **Status.** Persisted primitives, like Attributes and Potential Ability, changed only by Player
  Development or retraining. They are not Attributes in the glossary's sense (not skills). Slot
  suitability, Position Rating, Overall Rating and the label remain read-time projections, as
  [Player ratings are derived projections](2026-08-29-player-ratings-are-derived-projections.md)
  requires.
- **Storage.** `player_positions` is replaced by one row per player carrying the twelve ratings as
  columns, each checked to 1-20. Older saves are refused by the schema version, as the effort already
  decided.

## Relationship to existing notes

Extends [Player ratings are derived projections](2026-08-29-player-ratings-are-derived-projections.md):
its persisted set grows by the positional ratings; its derived set is unchanged. Familiarity Tier's
fate is decided separately with the suitability rule.

## Alternatives considered

- **One rating per pitch cell.** Rejected: CM never stored it, and labels would stop forming a clean
  line-by-side grid.
- **A row per (player, rating).** Rejected: every player always has all twelve, so rows only add
  joins and a completeness check.
- **Show the Free Role rating.** Rejected: CM hid it, and showing it would reveal what scouting and
  play are meant to uncover.
- **Drop Wing Back because labels ignore it.** Rejected: the wide D and DM cells then have nothing to
  fit against, and the 5-3-2 family's wing-backs stand in DM R/L.

## Acceptance criteria

- Every player has exactly twelve positional ratings in 1-20, and `player_positions` is gone.
- No screen shows the Free Role rating.
- The glossary's Position and Familiarity Tier entries are replaced when the code ships.

## Risks

- Generation must produce plausible line and side ratings, which is harder than one Natural Position;
  it is still open on the map.
- Every Position consumer moves at once; the positional map's consumer ticket owns that inventory.
