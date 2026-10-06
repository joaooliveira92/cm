# 12: Four training e2e specs describe a Training screen that no longer exists

Found 2026-09-19 while running e2e for
[group-d ticket 09](../../group-d-player-and-staff-records/issues/09-cull-the-player-placeholders.md).
Not caused by it: stashing that ticket's changes and re-running gave an identical 42 passed / 4
failed.

## The failures

All four begin by navigating to Training and asserting a `Coaching Assignments` heading at level 1:

- `e2e/development-centre.spec.ts`
- `e2e/performance-report.spec.ts`
- `e2e/training-plan.spec.ts`
- `e2e/training-workload.spec.ts`

```
Locator: getByRole('heading', { name: 'Coaching Assignments', level: 1 })
Error: element(s) not found
```

## What the page actually is

From the Playwright snapshot — the app is fine, the specs are stale. [Ticket 09](09-training-overview.md)
turned Training into an **Overview hub**:

- a tab strip: Overview, Schedules, Players, Coaches, Assignments, Reports, Options
- `main "Training Overview"` with `heading "Training Overview" [level=1]`
- preview regions — Coaching Staff, Workload and Recovery, Training Plans — each with a button
  into the detail screen: *View coaching assignments*, *View workload details*, and a per-player
  *Training plan* button

So `Coaching Assignments` is still reachable; it is one click further in, behind *View coaching
assignments*, and it is no longer what Training lands on. The specs assert the old landing.

## What to do

Re-point the four specs at the hub, not at the screen Training used to be. Each needs its opening
navigation to go through the Overview hub's affordance rather than assuming the destination.

Resist the shortcut of deep-linking straight to the detail route to make the red go away: three of
these four specs exist to prove the *journey* — that a Workload row opens a player's Training Plan,
that the Development Centre opens a player's development. A spec that jumps past the hub stops
testing the thing it was written for, and the hub is exactly what changed.

## Why this matters beyond four red specs

M1's [exit criterion 4](../../../.ai/MILESTONES.md) is `pnpm check:all` green **and**
`pnpm --filter @cm-clone/desktop test:e2e` green. The milestone cannot close while these fail.

It also matches a standing caveat: the e2e suite drifts against UI redesigns, so a red Playwright run
is worth a page snapshot before it is worth a bisect. That is how this was diagnosed in minutes, and
it is why the ticket carries the snapshot rather than a stack trace.

## Acceptance

- [x] All four specs pass against the Training Overview hub as it exists
- [x] Each still traverses the hub rather than deep-linking past it, and the ones that prove a
      journey still prove it
- [x] `pnpm --filter @cm-clone/desktop test:e2e` is green — all 46
- [x] `pnpm check:all` green

**Blocked by:** None

**Status:** resolved

## Answer

**e2e is green — 46 passed, 1.6m.** No test was skipped, deep-linked past, or loosened.

The fix was one line of entry per spec, plus the doc comments that described the old shape. The
labels had moved, not the behaviour:

| Spec | Was | Now |
|---|---|---|
| `training-workload` | land on `Coaching Assignments` h1, click "Workload and recovery" | land on `Training Overview` h1, click "View workload and recovery details" |
| `training-plan` | click "Workload and recovery" | click "View workload and recovery details" |
| `development-centre` | click "Player development" | click "View full development centre" |
| `performance-report` | click "Workload and recovery" | click "View workload and recovery details" |

`training-workload`'s closing `g b` also had to move. It asserted a return to `Coaching Assignments`,
because that is what Training used to land on; `g b` is history-back, so it now returns to the hub.
That assertion was the only one that was *wrong* rather than merely stale — the other three failed
at the entry and never reached their real subject.

Each spec still enters through the hub. Addressing the workload or development routes directly would
have been a shorter diff and would have made these specs blind to exactly the kind of change that
broke them: three of the four exist to prove a journey, and the journey is what moved.

### Worth keeping

The diagnosis cost minutes because the Playwright page snapshot was read before anything else. The
snapshot showed a working Training Overview with a tab strip and three preview regions — an app that
had moved on, not an app that was broken. A bisect would have found the same commit an hour later.

These four had been red long enough that `pnpm check:all` being green was being reported as the gate
passing. It was: `check:all` does not include e2e. M1 exit criterion 4 asks for both, which is what
makes this a milestone blocker rather than a maintenance chore.
