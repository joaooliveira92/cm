# 18: Contract offers and PlayerSigned drop the positional designation

**What to build:** A contract offer no longer names a Role or Position: the offer screen shows
length and wage only, the free-agent signing command takes no Role, and the `PlayerSigned` event
payload carries no role, for both the manager's and the AI's signings. CM 03/04 contracts named no
playing position, and Positions are being replaced.

Seam: the contract-offer read, the signing command and the event builder. The signing command's
typed failure for an unheld Role disappears, since there is no Role to check; its other failures are
unchanged.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The offer screen shows no position or role, and signing a free agent works end to end.
- [ ] `PlayerSigned` events from both producers have the same payload shape with no role.
- [ ] The error union no longer contains the unheld-Role failure, and renderer error mapping is updated.
- [ ] `pnpm check:all` is green, and the transfers e2e specs pass.
