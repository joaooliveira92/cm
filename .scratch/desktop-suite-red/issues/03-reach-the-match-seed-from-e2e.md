# 03: Let the e2e suite pin a match seed

Type: task
Status: ready-for-agent

**What to build:** two small bridges so Playwright can drive a match with a known seed.

[Ticket 02](02-injury-spec-is-wall-clock-seeded.md) added `MatchSeedSource` and killed the unit
suite's flake, but e2e cannot reach it. The Playwright process seeds saves by importing `src`
directly, while the *match* is started by the separate Electron main process over RPC — so
`Effect.provideService` in the test process provides to the wrong process.

| Bridge | Where |
|---|---|
| boot-time env var → `provideService(MatchSeedSource, ...)` | the Electron main process entry |
| pin the world seed | `apps/desktop/e2e/seedSaves.ts` — `seedFresh` still goes through `createSave`'s random draw |

Both are mechanical now that the seam exists.

## Why it is worth doing

[`2026-08-28-match-day-structural-extension.md`](../../../.agents/notes/implemented/testing/2026-08-28-match-day-structural-extension.md)
skipped force-off e2e coverage entirely — the orange injury prompt, the shorthanded banner and the
bring-off button are all unreachable from a seeded save — and recorded that the decision should be
revisited "if a future deterministic match seed becomes available". It now is, but only inside the
unit suite. These two bridges are what make that note's follow-up actionable, so do them before
reopening the force-off question.

Note the note's other warning still stands: the original rejection was partly about the *reliability
contract* (`timeout: 30_000`, `retries: 2`), not only about reachability. A pinned seed removes the
flakiness objection; it does not by itself make the test fast.

**Blocked by:** none. 02 is resolved.

- [ ] The main process reads a match seed from the environment at boot and provides it, with the
      production default untouched when the variable is absent.
- [ ] `e2e/seedSaves.ts` seeds from a pinned world seed.
- [ ] One e2e spec drives a match to a known injury without a retry loop.
- [ ] `pnpm check:all` is green, and the e2e suite passes.
