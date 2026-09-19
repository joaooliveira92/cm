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

- [ ] All four specs pass against the Training Overview hub as it exists
- [ ] Each still traverses the hub rather than deep-linking past it, and the ones that prove a
      journey still prove it
- [ ] `pnpm --filter @cm-clone/desktop test:e2e` is green — all 46
- [ ] `pnpm check:all` green

**Blocked by:** None

**Status:** ready-for-agent
