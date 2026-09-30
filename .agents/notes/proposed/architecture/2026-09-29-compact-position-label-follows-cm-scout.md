# Agent Note: The compact position label follows CM Scout's reconstruction

Status: proposed

## Problem

Players show a compact label such as `D/DM RC` or `AM/F RC`, derived from their positional
ratings. CM 03/04's own rendering code is not available; CM Scout's reconstruction is, and it matches
all 224 in-game CM 03/04 labels transcribed in contemporary guides (see the
[positional research](../../../../docs/research/player-positional-model-cm0304-positional-fields.md)). Its suppression rules look like bugs, so they need recording.

## Proposal

The label is a read-time projection in `packages/shared`, rendered by this rule:

- A line or side appears at 15 or above.
- GK ≥ 15 renders plain `GK`, ignoring other lines and sides.
- Lines in the order SW, D, DM, M, AM, F-or-S, joined by `/`.
- M appears only if DM < 15 and AM < 15.
- AM appears only if DM < 15 and (F < 15 or M ≥ 15).
- The F line renders `F` when Left, Right, Free Role or AM is also ≥ 15, otherwise `S`.
- WB never appears.
- Sides follow one space, in R, L, C order with no separator: `D RC`, `AM RLC`.

The research's worked examples become the rule's tests.

## Alternatives considered

- **A "cleaner" label showing every qualifying line, WB included.** Rejected: it would not match
  what CM 03/04 players saw, and the suppression rules are observed behaviour, not bugs to fix.
- **Store the label.** Rejected: it is a projection of ratings, and ratings change.

## Acceptance criteria

- One function renders every label in the app, and its tests include the research's examples.

## Risks

- The label is lossy: `D/M R` does not say the player can play both D R and M R. Suitability, not
  the label, decides fit.
