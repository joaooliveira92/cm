# Issue: Seed scenarios for wave-2 features

Type: grilling
Status: resolved

## Answer

**Three separate seeds, all based on `fresh` (pre-season, matchday 0, window open):**

### `seedWithFreeAgent`
1. `createSeedSave` → get `save.id`
2. Free 2 AI-club players: `UPDATE players SET club_id = NULL WHERE id = ?; DELETE FROM contracts WHERE player_id = ?`
3. Inflate user wage budget: `UPDATE club_budgets SET wage_budget = 10000000 WHERE club_id = <userClubId>`
- **UI guarantee:** Transfers screen shows `freeAgents` with ≥1 entry (clubId === null), Sign button rendered, sign succeeds.

### `seedWithIncomingBid`
1. `createSeedSave` → get `save.id`
2. Pick user's first player, pick an AI club
3. `INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number) VALUES (?, ?, <userClubId>, <aiClubId>, <amount>, NULL, 'pending', 1)`
4. `UPDATE club_budgets SET transfer_budget_remaining = 100000000, wage_budget = 1000000 WHERE club_id = <aiClubId>`
- **UI guarantee:** Transfers screen shows `incomingBids` with ≥1 entry (status === "pending"), Accept/Counter/Reject buttons rendered.

### `seedWithCounteredBid`
1. `createSeedSave` → get `save.id`
2. Pick an AI-club market player, compute transferValue
3. `placeBid(savesDir, save.id, target.id, Math.round(transferValue * 0.9))` → returns `status: "countered"`, `counterAmount: transferValue`
4. Don't respond — leave bid at countered
- **Alternative (direct INSERT, avoids RPC during seed):** `INSERT INTO bids (...) VALUES (?, <targetPlayerId>, <aiClubId>, <userClubId>, <lowAmount>, <transferValue>, 'countered', 1)` + inflate user budget
- **UI guarantee:** Transfers screen shows `outgoingBids` with ≥1 entry (status === "countered"), Accept counter / Withdraw buttons rendered, accept succeeds.

**Recommendation:** Three separate seeds over one combined — simpler to reason about, no coupling between scenarios.