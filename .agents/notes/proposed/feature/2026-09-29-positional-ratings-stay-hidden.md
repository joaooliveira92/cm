# Agent Note: Raw positional ratings stay hidden; screens show labels and fit

Status: proposed

## Problem

Players carry twelve 1-20 positional ratings. Screens could show them directly, as Football
Manager's position pitch does, or show what CM 03/04 showed: the compact label, with the raw numbers
visible only in the pre-game editor.

## Proposal

No screen shows raw Line, Side or Free Role Ratings. Squad, search and transfer screens show the
compact label: the column sorts by pitch order of the player's best line and then side (R, L, C),
grouping uses the best natural line, and a position filter matches "can play" (suitability ≥ 15 in
any cell of the chosen rows and sides). The Tactics screen shows per-cell suitability as a fit
indicator where Role Rating used to be.

## Alternatives considered

- **Show the ratings.** Rejected: not CM 03/04, and the label plus fit indicator already answer
  "can he play there?".
- **Filter by label text.** Rejected: the label is lossy; suitability is the real test.

## Acceptance criteria

- No contract, view model or screen exposes a raw positional rating.
- Position filters agree with the suitability rule.

## Risks

- Experienced FM players may expect a position pitch; the fit indicator is the answer.
