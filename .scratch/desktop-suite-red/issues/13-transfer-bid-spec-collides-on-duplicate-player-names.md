# 13: The transfer bid journey breaks when two generated Players share a name

**What to fix:** `journeys.spec.ts` "a transfer bid settles and the budget reflects the spend"
(around :206) finds its Market row with `getByRole("button", { name: playerName, exact: true })`.
World generation is random, so a world can contain two Players with the same display name, for
example "Daniel Brown". The locator then matches several buttons, and Playwright's strict mode
fails the test. It passed in some ticket 03 and 07 runs and failed in others, and the difference is
the world, not the code. Observed once as a strict-mode violation during ticket 08. Confirm it
against a page snapshot.

Scope the locator to the chosen row, not the name alone. A pinned world seed
([ticket 03](03-reach-the-match-seed-from-e2e.md)) would hide this, but a real career can have
namesakes too.

**Blocked by:** None

**Status:** ready-for-agent

- [ ] The spec selects the Player it bid on even when another Player in the world shares the name
