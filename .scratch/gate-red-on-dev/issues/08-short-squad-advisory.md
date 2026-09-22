# 08: Warn before the coming rollover leaves the squad short

**What to build:** a Continue readiness advisory, not a Readiness Blocker, shown when the human club's
squad minus its players in their last contracted year (`contracts.years_remaining = 1`) is below 16.
It names how many players are leaving and links to the Contract Expiry screen, where they can still be
renewed.

**Decision:** [a Youth Intake is the squad floor](../../../.agents/notes/implemented/feature/2026-09-21-a-youth-intake-is-the-squad-floor.md),
which makes the warning part of the answer to
[decision request 01](../decision-request-01-squad-decay-has-no-floor.md).

**Files:** the Continue readiness advisories (`apps/desktop/src/main/` readiness read, renderer
`chrome/ContinueOutstanding.tsx`), tests beside the existing advisory tests.

**Blocked by:** 07

**Status:** resolved

- [x] The advisory shows when the squad minus last-year players is below 16, and not otherwise
- [x] Its sentence names how many players are leaving; it links to the Contract Expiry screen
- [x] Renewing enough of them clears it on the next read
- [x] It never blocks Continue; `pnpm check:all` green

## Answer

Resolved 2026-09-22. `assessContinueReadiness` gains the advisory `squad-short-at-rollover`: when the human
club's squad minus its players in their last contracted year (`years_remaining = 1`, the Contract Expiry
list's own predicate) is below `SQUAD_FLOOR`, Continue's outstanding band says how many are leaving and links
to the Contract Expiry screen; the Tactics Overview lists it too. It is shown all Season and never blocks
Continue. Silent when nobody is leaving: the Youth Intake tops the squad up and there is nothing to renew.
The fact comes from the Contract Expiry read (`ContractExpiryScreenView.squadSize`, new).

Review: APPROVE. The orchestrator folded in its mediums: the note is promoted (07 and 08 both shipped), and
signing a Free Agent or answering a bid now invalidates the squad key (`INVALIDATION_RULES.completeTransfer`),
so a transfer refreshes the advisory without waiting for Continue. The copy lows are fixed too (renewal
happens through the Contract Expiry screen, not on it; "raw players aged 16 to 18"; no non-null assertion).

Visible consequence: starting Contracts run one to three years, so roughly a third of new careers show the
advisory from the first day. Left (lows): the Contract Expiry screen does not show the `squadSize` it now
carries; three seeded saves were added to `contract-expiry.test.ts`.
Report: [gate-red-on-dev-ticket-08](../../../.ai/reports/gate-red-on-dev-ticket-08.md).
