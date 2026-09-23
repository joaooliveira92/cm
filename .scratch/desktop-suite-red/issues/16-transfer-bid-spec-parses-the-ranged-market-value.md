# 16: the transfer-bid e2e parses the ranged market Value as one number

**What to fix:** `apps/desktop/e2e/journeys.spec.ts:295` ("a transfer bid settles and the budget
reflects the spend (keyboard)") reads the market Value cell through `parseCr`, which strips
non-digits and concatenates what remains. Since ticket 09 (`70aa419f`, 2026-09-23) an Unscouted
rival's Value is a `low–high` band (Credits on both ends), so the parse yields the two bounds' digits
run together — a bid amount far above any budget. The bid never settles, "Bid: done." never appears,
and the outgoing-bids row and budget assertions drift with it. The test predates the ranged column.

Retarget it to the ranged shape: bid the band's upper bound — the amount a bid must beat to be
accepted (ticket 09's `transfers.test.ts` already bids `figureHigh(target.transferValue)`) — parse it
with a band-aware regex, and keep the settle + budget assertions against that figure. In a seed save
with no scouting rows every rival is ranged, so there is no exact row to fall back on.

**Blocked by:** None

**Status:** ready-for-agent

- [ ] The keyboard transfer-bid journey passes against the ranged market column
- [ ] It still fails if a bid does not settle, or the budget does not reflect the spend