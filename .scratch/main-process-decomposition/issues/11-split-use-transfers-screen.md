# 11: Split `renderer/transfers/useTransfersScreen.ts` (717 lines)

Type: task
Status: resolved

> Added 2026-09-05 by a follow-up folder-organization pass. The original audit swept the main
> process, `contracts`, `shared` and `game-engine`; it never looked at the renderer's hooks. This
> is now the largest source file in the repo that is allowed to be split.

**What to build:** `useTransfersScreen` is a single ~560-line hook body holding five separable
concerns, already marked by `// ---` banner comments:

| Target | Concern |
|---|---|
| `transfers/useBidDraft.ts` | the single Bid draft (`draftState`, `setDraft`, `updateDraft`) plus the counter-offer trio (`counters`, `counterAmount`, `counterError`, `amountInputRef`) and the clear-on-unavailable lifecycle |
| `transfers/useTransferCommands.ts` | `run`, `submitBid`, `submitSign`, `onBid`, `onSignFreeAgent`, `onRespondToBid`, `onRespondAsBidder` and the four `useAtomSet` mutation handles, plus `status`/`bidAlert` |
| `transfers/useTransferTables.ts` | `useTableDataFor`, the latest-order refs, `applyFilters` wiring, and the six `…For` table handlers (`onSortChangeFor`, `onToggleSelectionFor`, `onActiveChangeFor`, `onBookmarkChangeFor`, `onRowPrimaryFor`) |
| `transfers/useTransfersScreen.ts` | assembly only: composes the three hooks and returns the existing `TransfersScreenValue` |

The four public interfaces (`TransfersScreenState`, `TransfersScreenActions`, `TransfersScreenMeta`,
`TransfersScreenValue`) and `SelectedPlayer`/`CounterState` stay exported from
`useTransfersScreen.ts` so no consumer changes.

## Constraints

- **This is a move, not a redesign.** The hook's render-order and ref-write ordering is
  load-bearing: several refs are written *after* the TanStack instances derive their row ids each
  render. Extracting a block must not change when it runs relative to its neighbours. Hooks called
  in a nested custom hook still run in source order, so keep the call order in the assembly
  identical to the order the blocks appear in today.
- The `state`/`actions`/`meta` context convention is the repo's established shape
  (`docs/hercules/component-audit.md`). Do not flatten it.
- `test/transfers.test.ts`, `test/table-bid-draft.test.ts`, `test/transfers-dialog-keyboard.test.tsx`
  and `test/incoming-bids.test.ts` cover this surface. Run them, not just typecheck.

**Blocked by:** 07 (same directory tree; do 07 first or in the same pass).

Landed as `tableIds.ts` (5), `useBidDraft.ts` (145), `useTransferCommands.ts` (293),
`useTransferTables.ts` (310), `useTransferPaletteActions.ts` (119) and a 370-line assembly.
Two files beyond the table above: `tableIds.ts` holds the `MARKET`/`FREE` constants all three
hooks need, and `useTransferPaletteActions.ts` carries the palette sort/filter registration --
leaving it in `useTransferTables.ts` put that file at 413 lines.

The single action-registration effect became two effects (commands, then palette) registered in
the same order; both are keyed on `saveId` and unregister in full.

- [x] No file in `renderer/transfers/` exceeds 400 lines.
- [x] `TransfersScreen.tsx` and `TransfersProvider.tsx` import the same symbols from the same path.
      Neither file changed.
- [x] The four transfers specs pass with the same test count (60).
- [ ] `pnpm check:all` is green at this commit. *Ran `typecheck`, `lint`, `effect-lint`,
  `verify-md-links` and the four named specs; the full `test` gate is the orchestrator's.*
