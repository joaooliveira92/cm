# 02: a Contract view on the Squad table: wage, Contract end, Transfer Value

**What to build:** a "Contract" column preset on the owned Squad table. Beside the base columns it
shows each player's Contract wage, the date their Contract ends and their Transfer Value. This is the
instruction's §9 "Contract View", minus the columns that rest on no model.

**Decisions:** from [01](01-reconcile-the-loose-squad-instruction.md).

- The data exists; the wire does not carry it. `SquadPlayerView`
  (`packages/contracts/src/schemas/squad.ts`) gains `contractWage`, `contractExpiryDate` and
  `transferValue`. The own club reads them exact. Values come from the `contracts` row that
  `PlayerContractView` already reads (`apps/desktop/src/main/career/player.ts`), and from
  `transferValue` in `packages/shared/src/rules/ratings.ts`.
- "Asking Price" is shown as **Transfer Value** (CONTEXT: avoid "price"). There is no asking-price
  model.
- Squad Status and Offer Options are **not** built: there is no model for either.
- A player with no active Contract (mid-expiry-sweep, see `db/schema.ts`) reads `null` for both
  Contract fields and shows `—`, never `0`.
- The columns join `SQUAD_PERSONAL_COLUMN_IDS`' neighbours in `table/features/visibility.ts`, and
  its doc comment ("there is no wage, contract or asking-price column here") is updated in the same
  change.

**Blocked by:** None.

**Status:** resolved

## Work

- Contract and main: the three fields on `SquadPlayerView`, filled in `apps/desktop/src/main/club/squad.ts`
  from one read of the club's `contracts`. Do not issue a query per player.
- Renderer: `SquadRow` carries them (`table/squad/squadColumns.tsx`), and a column def for each. Wage
  and Transfer Value sort numerically and format with `formatCredits`. Contract end sorts by date,
  not by the formatted string, and formats at the cell.
- `SQUAD_PRESETS` gains `{ id: "contract", label: "Contract", visibleColumnIds: [...SQUAD_BASE_COLUMN_IDS, "wage", "contractEnds", "transferValue"] }`,
  so it appears in the View selector automatically (`SQUAD_VIEWS`).
- The per-column show/hide sheet lists the three new columns.

## Tests

- Contracts: `SquadPlayerView` round-trips with the three fields, including both `null` Contract fields.
- Main: `getSquad` returns each player's own Contract wage and expiry and a Transfer Value equal to
  `transferValue(...)` for that player, and issues one contracts read.
- Renderer: the Contract preset shows the three columns, Wage sorts numerically (9,000 before
  10,000), Contract end sorts by date across a year boundary, and a missing Contract shows `—`.

## Acceptance criteria

- [x] View → Contract shows Wage, Contract ends and Transfer Value for every owned player.
- [x] All three sort correctly by value, and none reads a formatted string to compare.
- [x] Rival rosters are unchanged; this is the owned `SquadPlayerView` only.
- [x] `pnpm check:all` is green, and the Squad e2e specs pass.

## Answer

Built as specified, alongside the View catalogue's move to CM's names (Traditional, General Info,
Contract, Physical, Mental, Goalkeeping, Defensive, Attacking). The contract row joins the squad
read's existing player query, so there is no extra query, per player or otherwise. The model has no
expiry date, only `years_remaining`, which `SeasonConcluded` decrements before freeing the player at
zero. So Contract ends is derived: `seasonEndDate` (31 May) of Season current + `years_remaining` - 1,
the latest that Season can conclude. The first cut used the eve of the next Season's start. That
date lies in the gap the calendar skips at the rollover, two months after the player has left. A
test that plays a Season to its rollover now pins the fix. Selection and Statistics are held; see the Agent Note
`2026-09-07-squad-view-selector-and-position-list.md`.
