# 17: the desktop e2e suite fails 4–5 specs at random, including player-search-scouting

Type: bug
Status: resolved

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

- [x] The ~850ms shape is named with evidence: one reproduction that fails deterministically, and
      either the shared precondition it points at is fixed or the shape is split into per-spec bugs
      — split into [18](18-two-unreproduced-e2e-failure-shapes.md); it has not reproduced since 09:53 on 2026-09-26
- [x] `player-search-scouting.spec.ts:91`'s navigation flake is named the same way — confirmed or
      refuted, with the `openPlayer` hypothesis tested rather than assumed
      — split into [18](18-two-unreproduced-e2e-failure-shapes.md) with its evidence; `openPlayer` found
      the player on every captured click, but no failing click was captured, so it stays open there
- [x] Five consecutive full `test:e2e` runs on a clean tree are green, or every remaining failure is
      filed as its own ticket with a named cause
- [x] No test is loosened, skipped, retried into green, or given a larger timeout to absorb a flake

## Comments

### 2026-09-26 — found while closing group-j ticket 09

Raised by the orchestrator during the ticket-09 gate. The ticket's own e2e was green 3/3 filtered and
in a full run; the red spec was `player-search-scouting.spec.ts`, which ticket 09 does not touch. The
clean-`HEAD` worktree runs above are what rule it out as this ticket's regression — recorded here
because that verification cost four full suite runs and should not be repeated from scratch.

## Answer

Resolved 2026-09-27. **The main cause is the Mac sleeping partway through a run.** An idle MacBook on
battery turns its display off and then enters idle system sleep. The app under test freezes, and
the spec in flight fails on waking, as a closed page, a `g`-prefix indicator that never clears, or a
fixture teardown past the 45s test timeout. A long sleep can also leave the rest of the run to the
12-minute global timeout, which shows up as a run of 18–23 minutes with specs that "did not run".

Evidence, lining each red run up against `pmset -g log`:

| Run | Window | Sleep inside it | Result |
|---|---|---|---|
| 2026-09-26 `wt1` | 10:23–10:26 | 10:25:11–10:26:06 | 2 failed |
| 2026-09-26 `wt2` | 10:26–10:31 | 10:28:28–10:30:52 | 2 failed |
| 2026-09-27 peer loop 2 | 07:11–07:29 | 07:12:35–07:29:35 | red, 18 min |
| 2026-09-27 baseline 1 | 09:11–09:14 | 09:12:19–09:13:25 | 2 failed (`journeys:112`, `:186`) |
| 2026-09-27 baseline 2 | 09:14–09:32 | 09:15:41–09:32:39 | 1 failed, 31 not run, 18 min |
| 2026-09-27 baseline 3 | 09:32–09:55 | darkwake 09:32:39, awake 09:36–09:38:56, asleep again 09:39:01 | 1 failed, 11 not run, 23 min |

The fix is in the harness, not in any spec. `e2e/globalSetup.ts` spawns `caffeinate -d -i -w <runner
pid>` on macOS, holding off both display sleep and idle system sleep for as long as the Playwright
runner lives. `-w` releases it even if the run is killed. It is wired through `globalSetup` in
`playwright.config.ts`. `pmset -g assertions` shows both assertions held during a run and gone
after it.

Verification: five consecutive full `pnpm --filter @cm-clone/desktop test:e2e` runs on a clean tree
at `042063c1` plus the fix, 10:18:48–10:32:04. Each run was 65 passed in 2.6m, with no sleep or
display-off in the power log for that window.

A renderer timer probe in a live e2e window measured 1–2ms of lateness on an 800ms `setTimeout`,
with `visibilityState` `visible`. So a visible window is not throttled. What throttling a covered but
awake window gets was not measured; the fix keeps the display on, so a run no longer depends on it.

The two shapes that match no sleep, the ~850ms failures and the Player Search click, are split into
[18](18-two-unreproduced-e2e-failure-shapes.md) with their evidence and a ready-made probe. Neither
has reproduced since 2026-09-26. Player Search also passed 25 of 25 repetitions under CPU load today.

This may also explain the undiagnosed `journeys.spec.ts:112` failure noted in the sidebar commit
(`74b61058`, 22:59 on 2026-09-26). The power log shows a sleep at 22:17–22:33 that evening, but that
run's exact window was not recorded, so the link is unconfirmed.
