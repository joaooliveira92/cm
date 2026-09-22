# gate-red-on-dev ticket 08 — warn before the rollover leaves the squad short

**Outcome:** resolved 2026-09-22. [Ticket](../../.scratch/gate-red-on-dev/issues/08-short-squad-advisory.md).
[Note](../../.agents/notes/implemented/feature/2026-09-21-a-youth-intake-is-the-squad-floor.md) promoted:
tickets 07 and 08 together ship it.

## Validation

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 0. Shared 494, contracts 181, game-engine 95, desktop 2187 passed. |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | 57 passed (2.3m); no journey reaches the condition without editing the save, so none asserts it |
| RPC surface | `ContractExpiryScreenView.squadSize` | roundtrip tests updated, a new one rejects negative and fractional values |

The implementator's own `check:all` was killed before its desktop step finished and is not counted. The
orchestrator also stopped one of its own runs to fold in review fixes; the run above is on the final tree.

## Review

APPROVE, static only (the gate was running). Folded in before the gate: the note's promotion; a new
`completeTransfer` invalidation rule so signing a Free Agent or answering a bid refreshes the squad reads
and this advisory; copy fixes (renew *through* the Contract Expiry screen, "raw players aged 16 to 18",
"Renew it" for one player); no non-null assertion in the rule.
