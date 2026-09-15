import { defineConfig } from "@playwright/test";

/**
 * Timeout budget for the Electron e2e suite.
 *
 * Every wait here has an explicit ceiling, because the failure mode this suite
 * actually hits is a hang, not an assertion. Without `actionTimeout` a `.click()`
 * on a control that never appears blocks until the whole test budget is gone, so
 * a one-line staleness costs the same wall clock as a genuinely wedged renderer
 * and neither reports where it stopped. The ceilings are layered so the innermost
 * one always fires first and names the step that failed:
 *
 *   expect (5s) < action (10s) < navigation (15s) < test (45s) < suite (12m)
 *
 * A test that legitimately needs longer — a match engine spinning up, the
 * teaching splash on first run — passes its own `{ timeout }` at the call site,
 * which is a local, readable exception rather than a raised global floor.
 *
 * The teardown ceiling lives in `e2e/launchApp.ts`: Playwright's worker teardown
 * has no timeout of its own, so a wedged renderer stalls the worker for a further
 * 30s after the test has already failed.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 45_000,
  globalTimeout: 12 * 60_000,
  expect: { timeout: 5_000 },
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  retries: process.env.CI ? 2 : 0,
});
