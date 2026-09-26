# 17: the desktop e2e suite fails 4–5 specs at random, including player-search-scouting

Type: bug
Status: ready-for-agent

**Blocked by:** none.

## Symptom

`pnpm --filter @cm-clone/desktop test:e2e` is not green on a clean `dev`, and is not green on a
change. It fails a different handful of specs each run, so one green run proves nothing — the shape
[ticket 04](04-fulltime-spec-flakes.md) recorded for a single spec, at suite scale.

Observed 2026-09-26 at `edcea355` on a **clean `HEAD` worktree with no changes applied** (verified
with `git worktree add` at `edcea355`, `pnpm install --frozen-lockfile`, then four consecutive full
`test:e2e` runs):

| Run | Result |
|---|---|
| 1 | 4 failed / 58 passed — `club-squad`, `contract-expiry-and-budget-review`, `router:35` (hash history), `teaching-splash-dismiss` |
| 2 | 5 failed / 57 passed — `club-squad`, `error-paths`, `router:186` (pointer nav), `teaching-splash-dismiss`, +1 |
| 3 | 4 failed / 58 passed — `club-information`, `keyboard:33` (`g <position>`), `save-management:56` (stale save entry), `training-workload` |
| 4 | 4 failed / 58 passed — `app:41` (Tactics overview), `club-finances-and-board`, `player-search-scouting:91`, `training-workload` |

Two failure shapes, and they are probably two bugs:

1. **~850ms failures, uniform across unrelated specs** — runs 1–3. Every one dies just under 900ms,
   which is nowhere near a 5s assertion timeout. This looks like a shared precondition failing fast
   (save seeding, app launch, or a first-render race), not nine independent spec bugs.
2. **6.3s failures on a navigation assertion** — `player-search-scouting.spec.ts:91` in run 4, and
   the same spec on the ticket tree. `await expect(profile.getByRole("region", { name: "Physical" }))
   .toBeVisible()` after clicking a result's name: the click is delivered and the DOM never leaves
   Player Search. Unproven hypothesis, not to be assumed: `PlayerSearchScreen.openPlayer` may `return`
   silently when `playerIds.find(...)` misses, which would produce exactly this.

`player-search-scouting.spec.ts` passes 3/3 in isolation, so it is not a deterministic failure and no
amount of running it alone will find this.

## Why it matters

`pnpm check:all` excludes e2e (it needs OS-level setup), so a red e2e suite is invisible to the gate
and is only ever discovered while implementing a ticket — which is how this was found. Milestone M1's
exit criterion 4 requires `check:all` green **and** e2e green, and that criterion cannot be honestly
claimed while a clean `dev` fails its own suite at random. A suite whose failures move between runs
also cannot be used as evidence for any ticket that touches a screen.

## Acceptance criteria

- [ ] The ~850ms shape is named with evidence: one reproduction that fails deterministically, and
      either the shared precondition it points at is fixed or the shape is split into per-spec bugs
- [ ] `player-search-scouting.spec.ts:91`'s navigation flake is named the same way — confirmed or
      refuted, with the `openPlayer` hypothesis tested rather than assumed
- [ ] Five consecutive full `test:e2e` runs on a clean tree are green, or every remaining failure is
      filed as its own ticket with a named cause
- [ ] No test is loosened, skipped, retried into green, or given a larger timeout to absorb a flake

## Comments

### 2026-09-26 — found while closing group-j ticket 09

Raised by the orchestrator during the ticket-09 gate. The ticket's own e2e was green 3/3 filtered and
in a full run; the red spec was `player-search-scouting.spec.ts`, which ticket 09 does not touch. The
clean-`HEAD` worktree runs above are what rule it out as this ticket's regression — recorded here
because that verification cost four full suite runs and should not be repeated from scratch.
