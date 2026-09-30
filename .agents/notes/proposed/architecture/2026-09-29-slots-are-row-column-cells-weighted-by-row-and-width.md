# Agent Note: Slots are row-column cells, weighted by row and width

Status: proposed

## Problem

Tactic slots become cells on CM 03/04's tactics grid (see
[A Tactic is a Tactic Template plus players](2026-09-29-tactic-templates-and-grid-cell-slots.md)).
The cells need names, and the game-design tables keyed by the old ten Positions (Position Weights,
phase membership) need a key that covers every cell without authoring 31 tables.

## Proposal

- **Slot type.** A slot is its own type, a (row, column) pair, not a Position. Rows: GK, SW, D, DM,
  M, AM, F, the same codes as the Line Ratings they are rated against (WB is a line, never a row).
  Columns: L, LC, C, RC, R. Displayed as `D RC`, `AM L`; sorted in pitch order.
- **Position Weights** are keyed by (row, width), where L and R are wide and LC, C, RC are central:
  twelve tables. GK, D wide, D central, DM central, M wide, M central, AM central and F central carry
  over today's GK, DL/DR, DC, DM, ML/MR, MC, AMC and ST weights. SW, DM wide, AM wide and F wide are
  new and authored as design values in the spec.
- **Phase** follows the row: GK, SW, D → defence; DM, M → midfield; AM, F → attack. Whether a run
  shifts part of a contribution to another phase is the formations effort's engine-mapping decision.

## Alternatives considered

- **Weights per cell (31 tables).** Rejected: LC, C and RC of one row ask the same of a player, and
  L and R mirror each other.
- **Weights per row only.** Rejected: a full-back and a centre-back need different attributes.
- **Keep Position as the slot type.** Rejected by the Tactic domain model: it cannot tell two
  centre-backs apart or express wide DM, AM and F cells.

## Acceptance criteria

- Every one of the 31 cells resolves to exactly one weights table and one phase.
- No slot is typed as a Position.

## Risks

- The four new weight tables are unvalidated design values until balance testing.
