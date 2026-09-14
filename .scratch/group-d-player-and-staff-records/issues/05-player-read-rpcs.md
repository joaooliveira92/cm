# 05: Player read RPCs — getPlayerProfile and getPlayerContract

**What to build:** Two new `@effect/rpc` read endpoints that return player identity and contract data. These are the data foundation for screens 50 (Player Profile) and 56 (Player Contract).

- `getPlayerProfile(saveId, playerId)` → `PlayerProfileView` containing: name, age, nationality, positions with Familiarity Tier, key attribute summary (top 3 per category), current club, current contract expiry, Overall Rating, Transfer Value, injury status icon
- `getPlayerContract(saveId, playerId)` → `PlayerContractView` containing: wage (per-season Credits), length, expiry date, signing date, clubId

Both declared in `packages/contracts/src/rpc.ts` with schemas in `packages/contracts/src/schemas/`. Main-process handlers read from the save's SQLite. Renderer atoms for reactivity on save key.

**Decisions:**

- Screens 50 (Profile) and 56 (Contract) are in scope per ticket 04.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `getPlayerProfile` declared in RPC contract with `PlayerProfileView` schema
- [ ] `getPlayerContract` declared in RPC contract with `PlayerContractView` schema
- [ ] Main-process handlers for both, reading from save SQLite
- [ ] Renderer atoms for both
- [ ] Roundtrip tests in `packages/contracts/test/`
- [ ] `pnpm check:all` passes