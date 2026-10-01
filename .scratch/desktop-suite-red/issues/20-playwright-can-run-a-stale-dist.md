# 20: Playwright can run a stale `dist/` and report green

Type: bug
Status: resolved

**Blocked by:** none.

## Symptom

Found 2026-09-29 while building [squad-instructions 04](../../squad-instructions/issues/04-sort-control-for-the-position-list.md).
A mutation was made to `cycleSort` and the e2e run against it **passed**. The mutation had never been
compiled: the test was exercising the previous build. The same trap invalidated a reviewer's own
evidence in the same sprint — it ran `pnpm exec playwright test e2e/app.spec.ts -g "Sort control"`,
reported "1 passed", and withdrew the number once the cause was found.

The failure mode is the dangerous shape: green e2e over code that is not the code under review.

## Cause

`apps/desktop/package.json` wires `"pretest:e2e": "pnpm build"` and `"test:e2e": "playwright test"`.
pnpm lifecycle hooks fire for the **named script**, not for the binary, so any direct invocation —
`pnpm exec playwright test`, `npx playwright test`,
`pnpm --filter @cm-clone/desktop exec playwright test` — skips the build entirely. The app under test
is the prebuilt artifact: `e2e/launchApp.ts:15` launches `../dist/main/index.js`. There is no dev
server and no build inside the run, so the suite tests whatever was last built.

The documented command in [.ai/ORCHESTRATION.md](../../../.ai/ORCHESTRATION.md) is correct and does
build. The trap is not that the right command is undocumented — it is that **the wrong command is
silently accepted** and produces a plausible green run.

## Why this is a ticket and not a doc line

The documentation already names the right command, so a note would restate it. What is missing is a
check: nothing makes a stale bundle loud, and a false green is precisely the signal a gate exists to
produce. The e2e suite is outside `check:all` (it needs OS-level setup), so there is no second gate
covering this.

## Acceptance criteria

- [ ] `e2e/globalSetup.ts` compares the newest mtime under `apps/desktop/src/` against the oldest
      under `apps/desktop/dist/`, and fails with a message naming
      `pnpm --filter @cm-clone/desktop test:e2e` when the sources are newer
- [ ] It runs before any test, so a stale bundle costs milliseconds rather than a false green
- [ ] A spec covers both branches
- [ ] `pnpm check:all` and a full `test:e2e` are green

## Also

`e2e/playwright.config.ts`'s docstring should carry one line, since the config is where a reader
looks and it already holds the suite's failure-mode philosophy: the suite runs the prebuilt
`dist/main/index.js` (`e2e/launchApp.ts`), and only `pnpm --filter @cm-clone/desktop test:e2e` builds
it first — `pretest:e2e` fires for the script name, not the binary. Invoking `playwright` directly
tests the last build, so a mutation that was never compiled passes green. Run the script.

## Known cost

Past e2e figures recorded in [.ai/SPRINT-PLAN.md](../../../.ai/SPRINT-PLAN.md) and the reports under
`.ai/reports/` are **unverifiable** rather than proven wrong — each depends on which command produced
it. No claim is made that they were wrong.
