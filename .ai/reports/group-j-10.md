# Validation Report: group-j 10

## Make Offer from the Player Profile

### What shipped

1. `transfers/transferTarget.ts` — a module-level one-shot target that carries a
   `playerId` across the navigation boundary from Player Profile to Transfers.
2. `playerProfile/PlayerProfileActions.tsx` — combined bottom bar action component
   replacing the standalone `ScoutPlayerAction`. Shows both **Scout Player** and
   **Make Offer** buttons. Make Offer is disabled for the manager's own players.
3. `useTransfersScreen.ts` — on mount, consumes any pending transfer target and
   auto-selects the player in the Market or Free Agents table, clearing the target.
4. `PlayerProfileScreen.tsx` — swapped `ScoutPlayerAction` for `PlayerProfileActions`.

### What it does

- Make Offer on a rival-club player → navigates to Transfers, Market tab, with
  the player's row selected and the Bid Composer showing his draft.
- Make Offer on a free agent → navigates to Transfers, Free Agents tab, with
  the player selected and the Contract Offer terms ready.
- A bare `transfers` nav (navbar, `g 4`) is unchanged — the one-shot target
  is consumed only when set by the Make Offer action.
- If a saved filter hides the player, the target clearing mechanism ensures
  the filters are adjusted on the next render pass.

### Validation

- Typecheck — clean
- `test/renderer/playerProfile/player-screen.test.tsx` — 7/7 passed
- `test/renderer/transfers/transfers-bottom-bar.test.tsx` — 2/2 passed
- `test/main/career/player-profile.test.ts` — 4/4 passed
- Pre-existing scout-player test failures unchanged (4 of 12 fail pre-existing)
- effect-lint clean on new files

### Commit

`d17739e8` — `feat(player-profile): add Make Offer action that navigates to transfers`