# 07: Transfer History screen (Screen 146)

**What to build:** A read-only screen of transfers into and out of the manager's club from `player_transfers`: date, Player name, from Club, to Club, fee, newest first. New read-only RPC. Decide whether it fills the `club/$clubId/transfers` stub for the manager's club or takes its own route, and record the choice.

**Decisions:**

- Group J v1 scope: see [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md).
- **Own route, not the club stub.** Transfer History sits at `career/$saveId/transfer-history`, and the
  `clubTransfersDetail` stub on `club/$clubId/transfers` is left alone. That stub is parameterised by
  `clubId` while this screen is own-club only, so filling it would mean either reading any club's
  transfers (out of Group J v1 scope, and it prejudges Group I's decision request 01) or ignoring a
  route parameter the URL still carries. It also matches the shape tickets 05 and 06 shipped. The
  tradeoff: when the club-scoped Transfers Detail screen is eventually built, two screens will read
  `player_transfers` over nearly the same query — the reader already takes a `clubId`, so the
  duplication would be in the view, not the read. See
  [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-15-transfer-history-takes-its-own-career-route.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] New read returns the manager's club's transfers newest first, with an RPC roundtrip test and an empty case
- [x] Screen lists date, Player, from Club, to Club and fee
- [x] A Free Agent signing (no from Club) reads correctly
