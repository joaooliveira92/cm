# Map: player-positional-model

Label: wayfinder:map

## Destination

A **spec**, at `spec.md` in this effort's own directory, for a Championship Manager 03/04-faithful
player positional model: the positional lines and sides a player is rated in, how a tactical slot's
suitability is derived from them, the compact CM label (`D/WB L`, `AM/F RC`), what becomes of the
Familiarity Tier, and how each current `Position` consumer maps onto the result. Plus the
reconciliation the change needs: `CONTEXT.md`'s Position and Familiarity Tier entries, and a
successor Agent Note.

Plan-only. The map is done when nothing is left to decide and the spec can be handed to
`/to-spec` → `/to-tickets` → `/implement`.

## Notes

- **Classification.** This is a new domain concept *and* a save-format change: `player_positions`
  and `tactic_slots` both carry a check constraint over the ten-value `POSITIONS`
  (`apps/desktop/src/main/db/schema.ts`). It runs through the full chain for that reason, not
  because of its size.
- **Research before representation.** The working hypothesis is that CM stored a 1-20 rating per
  positional line and per side, independently, and derived a slot's fit from the pair. It is a
  hypothesis recalled from the CM 01/02 editor, not a verified fact about CM 03/04, and no ticket
  settles the representation before
  [the CM 03/04 editor research](issues/01-cm-0304-editor-positional-fields.md) resolves.
- **Football Manager vocabulary is not CM.** The six-label scale (natural, accomplished, competent,
  unconvincing, awkward, ineffectual) is FM's. Research findings must say which facts are verified
  for CM 03/04, which are inherited from CM 01/02, and which arrived later in FM.
- **Tactical slots and player ratings are separate concepts.** Today one `Position` type serves
  both: a formation's slot and what a player can play. The spec may keep one vocabulary for both, but
  must say so deliberately rather than by default.
- **Skills every session should consult**: `grilling` and `domain-modeling` by default; `research`
  for ticket 01; `effect-code` for any session that reads source to answer a ticket.
- **Sequencing.** The tactics reshaping work that touched `tactics.ts`, `bestXi.ts`,
  `pitchLayout.ts` and the tactics contracts landed as `b749ee47` (2026-09-28) and the worktree is
  clean, so this effort no longer waits on it. Implementation tickets cut from the spec must still
  be sequenced behind any in-flight change to those files at the time they are cut.

### The current model (2026-09-28)

- **`Position`** (`packages/shared/src/rules/positions.ts`): ten values, `GK DC DL DR DM MC ML MR
  AMC ST`. No sweeper, no wing-back, no wide DM or wide AM, and `ST` rather than CM's `F`.
- **`FamiliarityTier`**: `natural | competent | unfamiliar`, stored per (player, Position) in
  `player_positions`. Generation writes one Natural primary plus sometimes one Competent adjacent
  Position (`ADJACENT_POSITIONS`); nothing writes `unfamiliar`, which is the reading for a Position
  the player has no row for.
- **No match-engine penalty exists.** A slot's contribution is the occupant's Position Rating for
  that slot's Position, computed from Attributes alone. Familiarity is read only by Overall Rating
  (strongest Natural Position) and the Tactics overview's tier counts (`tacticsSummary.ts`).

### Known `Position` consumers

Ticket 06 classifies each of these by what it actually needs (a tactical slot, a positional line, a
side, a derived suitability, a display label, or a broad category).

| Consumer | Where | Reads today |
| --- | --- | --- |
| `POSITION_WEIGHTS` | `shared/rules/positions.ts`, via `ratings.ts` | Position → Attribute weights for Position Rating |
| `ADJACENT_POSITIONS` | `shared/rules/positions.ts`, via `generation.ts` | which second Position a generated player may cover |
| `PHASE_POSITIONS` | `shared/rules/positions.ts`, via `game-engine/match/tactical-modifiers.ts` | which slots feed Attack, Midfield, Defense |
| `POSITION_ROLES` | `shared/rules/tactics.ts` | the one v1 Role per Position |
| `FORMATION_SLOTS` | `shared/rules/tactics.ts` | the five templates' slot Positions |
| Best XI | `shared/rules/bestXi.ts` | filling slots from a squad |
| Overall Rating | `shared/rules/ratings.ts` | strongest Natural Position; feeds Transfer Value |
| Generation | `shared/rules/generation.ts`, `main/world/worldGeneration.ts` | `SQUAD_COMPOSITION`, primary + adjacent |
| Storage | `player_positions`, `tactic_slots` in `db/schema.ts` | ten-value check constraints |
| Contracts | `contracts/schemas/{squad,clubSquad,tactics,transfers,match}.ts` | `Position` literal unions over IPC |
| Tactics overview | `shared/rules/tacticsSummary.ts`, `main/club/tacticsOverview.ts` | familiarity tier counts |
| Pitch layout | `renderer/tactics/pitchLayout.ts`, `FormationPitch.tsx` | where each slot Position is drawn |
| Squad, search, filters | `renderer/squad/*`, `renderer/table/*`, `renderer/transfers/TransferFilterBar.tsx`, `main/transfers/playerSearch.ts` | position column, grouping, filtering |
| Transfers and AI | `main/transfers/{ai,bids,economics,contractOffer,playerComparison}.ts`, `main/club/aiClubs.ts` | squad needs, valuations by Position |
| Scouting | `shared/rules/teamScoutReport.ts`, `main/club/teamScoutReport.ts` | predicted shape |
| Match | `game-engine/match/commentary.ts`, `shared/rules/matchRating.ts`, `main/match/statistics.ts` | phase of a player's slot |

## Decisions so far

<!-- one line per closed ticket: gist, then link to the ticket file -->

- [Does this effort migrate existing saves?](issues/02-does-this-effort-migrate-saves.md): no;
  older saves are refused by the DDL-hashed schema version under the disposable-saves policy, with no
  upgrade transformer or migration infrastructure, and fixtures move to the new schema.

- [What the CM 03/04 editor stores about a player's positions](issues/01-cm-0304-editor-positional-fields.md):
  independent 0-20 ratings for nine lines and three sides, no per-cell value; slot fit from line and
  side is unverified for CM 03/04 (CM 01/02 has per-slot special cases).
- [The canonical positional representation](issues/03-canonical-positional-representation.md):
  eight Line Ratings and three Side Ratings, 1-20, persisted in one row per player.
- [Free Role](issues/04-free-role.md): a hidden twelfth 1-20 rating; the instruction lives in
  formations-and-instructions.

## Not yet specified

- **Development and training.** Whether line and side ratings move over a career (training toward a
  new position, familiarity loss from disuse), and if so whether that belongs to Player Development
  at Season conclusion or to the Training Schedule. Depends on the representation and on what CM
  03/04 actually did.
- **Generation.** How a generated player's line and side ratings are distributed, and what replaces
  `ADJACENT_POSITIONS` and `SQUAD_COMPOSITION`. Depends on the representation and the line set.
- **A mismatch mechanic, revisited once the model is specified.** Nothing today penalises an
  out-of-position player beyond their Attributes rating poorly against the slot's weights, and the
  spec does not add one (see **Out of scope**). Once the model is settled, whether to open a
  separate game-design decision on a suitability multiplier for Position Rating or Phase Strength
  is worth revisiting. It would touch the match-engine boundary that [Role Rating outside the match engine](../../.agents/notes/implemented/architecture/2026-08-27-role-rating-outside-match-engine.md)
  guards.
- **The screens.** Pitch layout for any new slots (SW, WB, wide DM and AM), the squad position
  column and its filters. Settled once the slot vocabulary and label rules are.

## Out of scope

- **Football Manager's six-label proficiency scale.** Not CM 03/04, and the glossary already
  avoids "Proficiency". Returns only if the destination changes from CM fidelity to FM fidelity.
- **Migrating existing saves.** A heuristic conversion from Position and Familiarity Tier rows,
  with versioned upgrade steps and before/after fixtures. Ruled out by
  [ticket 02](issues/02-does-this-effort-migrate-saves.md) under the disposable-saves policy;
  returns only with the general upgrade path, at the first player-facing release.
- **A match-engine mismatch penalty as compatibility work.** None exists today, and the new model
  must not add one silently. Ticket 07 covers suitability, the Familiarity Tier mapping, Overall
  Rating and the Tactics overview only. A penalty is a separate game-design decision, taken after
  the positional model is specified.
