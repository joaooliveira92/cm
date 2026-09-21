# 08: Warn before the coming rollover leaves the squad short

**What to build:** a Continue readiness advisory, not a Readiness Blocker, shown when the human club's
squad minus its players in their last contracted year (`contracts.years_remaining = 1`) is below 16.
It names how many players are leaving and links to the Contract Expiry screen, where they can still be
renewed.

**Decision:** [a Youth Intake is the squad floor](../../../.agents/notes/proposed/feature/2026-09-21-a-youth-intake-is-the-squad-floor.md),
which makes the warning part of the answer to
[decision request 01](../decision-request-01-squad-decay-has-no-floor.md).

**Files:** the Continue readiness advisories (`apps/desktop/src/main/` readiness read, renderer
`chrome/ContinueOutstanding.tsx`), tests beside the existing advisory tests.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] The advisory shows when the squad minus last-year players is below 16, and not otherwise
- [ ] Its sentence names how many players are leaving; it links to the Contract Expiry screen
- [ ] Renewing enough of them clears it on the next read
- [ ] It never blocks Continue; `pnpm check:all` green
