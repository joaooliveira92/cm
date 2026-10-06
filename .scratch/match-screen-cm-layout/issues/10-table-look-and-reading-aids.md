# Table look and reading aids

Type: grilling
Status: resolved
Blocked by: 02, 05

## Question

CM's tables are dense, abbreviated and colour-coded (yellow numbers, dimmed unused players, a
highlighted selected row, card glyphs). This repo already has a dense data-grid look shared across
tables (commit `f709ee0d`), `DataTable`/`TablePanel` owning focus and sorting, and lint rules banning
numeric font sizes and colour-only meaning. How do the Home/Away Stats and Form tables look and read?

## Answer

**Both tables are `DataTable` instances in the shared dense look; no new table component and no CM
skin.**

- **Component.** `MatchPlayerStatsScreen` and the Form tab render through `renderer/table/DataTable.tsx`
  with the shared dense data-grid styling, so roving focus, keyboard sort and row actions behave as in
  every other table. Columns are sortable; the default order is squad order (stats) or newest first
  (Form), restored by a "Squad order" / "Date" sort.
- **Abbreviations.** Column headers use CM's abbreviations; each header carries its full name as the
  accessible name and tooltip (Key → "Key passes", Off → "Offsides", Fou → "Fouls committed",
  She → "Shots", Sat → "Shots on target", Sav → "Saves", Con → "Condition", Rat → "Match Rating",
  Inf. → "Substitution"). The glossary lives as one constant beside the column list, not in each screen.
- **Rating colour.** `MatchRatingsView` has no rating colours today. One `ratingTone` helper beside the
  column glossary maps a rating to a theme token in three bands (below 6.0 muted, 6.0–7.4 default,
  7.5 and above highlight), and the Rat column, the Form tab and `MatchRatingsView` all use it, so a
  7.8 looks the same on every tab. The number is always printed, so colour is never the only signal.
- **Rows.** Unused substitutes and "Not selected"/"Unused substitute"/"No player record" rows use the
  muted text token; the captain gets "(c)"; card glyphs are icon plus visually hidden text ("Booked",
  "Sent off"). Focus is the existing focus ring, not a CM-style blue row fill.
- **Numbers.** Tabular numerals; integers right-aligned; empty cells for players who did not play,
  never `0` ([02](02-per-player-columns-the-stream-backs.md)).
- **Type scale.** Text is sized by the `--text-*` roles; `TableCell` owns its size role, so no
  `className` size is passed (the `effect-lint` rules already enforce both).

No Agent Note: styling choices on existing primitives.
