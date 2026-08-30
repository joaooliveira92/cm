import type { Page } from "@playwright/test";
import { dismissTeachingSplash, expect, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/** Seed a fresh save, reload, then continue it — landing on the Squad route,
 *  dismissing the first-run teaching splash so tab clicks are not intercepted. */
const enterCareer = async (page: Page, userDataDir: string) => {
  await seedFresh(savesDir(userDataDir));
  await page.reload();
  await page.getByRole("button", { name: "Seed: fresh" }).click();
  await expect(page.getByText(/players$/)).toBeVisible();
  await dismissTeachingSplash(page);
};

test("hash history survives a reload on the active route (AC-10)", async ({ window: page, userDataDir }) => {
  await enterCareer(page, userDataDir);

  await page.getByRole("button", { name: "transfers", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Transfers/ })).toBeVisible();
  const before = await page.evaluate(() => location.hash);
  expect(before).toMatch(/^#\/career\/.+\/transfers$/);

  await page.reload();
  await expect(page.getByRole("heading", { name: /Transfers/ })).toBeVisible();
  const after = await page.evaluate(() => location.hash);
  expect(after).toBe(before);
});

test("the career parent owns the persistent shell across every child route (AC-11)", async ({ window: page, userDataDir }) => {
  await enterCareer(page, userDataDir);

  const shell = page.locator("nav");
  await expect(shell).toBeVisible();
  await expect(shell).toContainText("Back to saves");

  const routes: ReadonlyArray<{
    readonly tab: string;
    readonly assert: () => Promise<unknown>;
  }> = [
    { tab: "tactics", assert: () => expect(page.getByRole("heading", { name: /Tactics/ })).toBeVisible() },
    { tab: "transfers", assert: () => expect(page.getByRole("heading", { name: /Transfers/ })).toBeVisible() },
    { tab: "league table", assert: () => expect(page.getByRole("heading", { name: "League Table" })).toBeVisible() },
    { tab: "fixtures", assert: () => expect(page.getByRole("heading", { name: "Fixtures" })).toBeVisible() },
    { tab: "season summary", assert: () => expect(page.getByRole("heading", { name: "Season Summary" })).toBeVisible() },
    { tab: "squad", assert: () => expect(page.getByText(/players$/)).toBeVisible() },
  ];

  for (const route of routes) {
    await page.getByRole("button", { name: route.tab, exact: true }).click();
    await route.assert();
    await expect(page.locator("nav")).toHaveCount(1);
    await expect(page.locator("nav")).toContainText("Back to saves");
  }
});

test("a well-formed-but-missing save stays on the career route with an error — never a loader redirect (AC-12)", async ({ window: page, userDataDir }) => {
  await seedFresh(savesDir(userDataDir));
  await page.reload();
  await expect(page.getByRole("button", { name: "Seed: fresh" })).toBeVisible();

  // Well-formed saveId (a UUID) that no save exists for — the career route must
  // mount and surface a failure through the seam (no loader, no redirect to the
  // save list; distinct from the malformed-parameter route error).
  const missingSaveId = crypto.randomUUID();
  await page.evaluate((id) => {
    location.hash = `#/career/${id}/squad`;
  }, missingSaveId);

  // The shell chrome stays mounted and the child renders an error paragraph —
  // the route did not loader-redirect us off the career branch. The shipped
  // blocking-error paragraph uses `text-red-300` (the Squad LoadError surface).
  await expect(page.locator("nav")).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to saves" })).toBeVisible();
  await expect(page.locator("p.text-red-300").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Championship Manager Clone" })).not.toBeVisible();
});

test("creation keeps beginCareer before Club Selection and returning discards it (AC-13)", async ({ window: page }) => {
  await page.getByRole("button", { name: "Start New Career" }).click();
  await expect(page.getByRole("heading", { name: "New Career" })).toBeVisible();

  await page.getByPlaceholder("My Career").fill("Keyboard Career");
  await page.getByRole("button", { name: "Next: Select Club" }).click();

  // Club Selection depends on the generated world + persisted economy, so
  // beginCareer ran before we arrived (clubs render from the provisional save).
  await expect(page.getByText("Board Objective").first()).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Championship Manager Clone" })).toBeVisible();
  // Leaving creation never leaks a provisional save into the continue list.
  await expect(page.getByText("No saves yet.")).toBeVisible();
});

test("reloading mid-creation redirects to step 1 (AC-13)", async ({ window: page }) => {
  await page.getByRole("button", { name: "Start New Career" }).click();
  await page.getByPlaceholder("My Career").fill("Reload Career");
  await page.getByRole("button", { name: "Next: Select Club" }).click();
  await expect(page.getByText("Board Objective").first()).toBeVisible();

  // The creation session is in-memory: a reload lands on step 2 with nothing
  // recoverable, so the flow redirects back to step 1.
  await page.reload();
  await expect(page.getByPlaceholder("My Career")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next: Select Club" })).toBeVisible();
});

test("a failed commit discards the provisional career and recovers to step 1 (AC-13)", async ({ window: page }) => {
  // NOTE: the renderer's commit path passes a placeholder club id
  // ("temp-club-id") that no real club matches, so commitCareer fails in main
  // — a pre-existing creation-UI gap (the read-only ClubSelectionScreen never
  // selected a club), carried over unchanged from App.tsx. This test proves the
  // router-stage session lifecycle handles that failure: idempotent discard of
  // the provisional save, then recovery to step 1 — not a crash or a dead end.
  await page.getByRole("button", { name: "Start New Career" }).click();
  await page.getByPlaceholder("My Career").fill("Commit Career");
  await page.getByRole("button", { name: "Next: Select Club" }).click();
  await expect(page.getByText("Board Objective").first()).toBeVisible();

  await page.getByRole("button", { name: "Next: Review" }).click();
  await expect(page.getByRole("heading", { name: "Review Career" })).toBeVisible();
  await page.getByRole("button", { name: "Create Career" }).click();

  // Failure path: the provisional career is discarded and the flow recovers to
  // step 1 (a fresh, empty creation session) with no crash.
  await expect(page.getByPlaceholder("My Career")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next: Select Club" })).toBeVisible();

  // Nothing leaked into the save list.
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Championship Manager Clone" })).toBeVisible();
  await expect(page.getByText("No saves yet.")).toBeVisible();
});

test("pointer nav does not force focus; keyboard nav focuses the destination (AC-15)", async ({ window: page, userDataDir }) => {
  await enterCareer(page, userDataDir);

  await page.getByRole("button", { name: "transfers", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Transfers/ })).toBeVisible();
  const afterPointer = await page.evaluate(
    () => document.activeElement?.getAttribute("data-focus-id") ?? null,
  );
  expect(afterPointer).not.toBe("transfers");

  const tacticsTab = page.getByRole("button", { name: "tactics", exact: true });
  await tacticsTab.focus();
  await tacticsTab.press("Enter");
  await expect(page.getByRole("heading", { name: /Tactics/ })).toBeVisible();
  const afterKeyboard = await page.evaluate(
    () => document.activeElement?.getAttribute("data-focus-id") ?? null,
  );
  expect(afterKeyboard).toBe("tactics");
});

test("Match Day arrival resumes a pending match instead of starting one (AC-15)", async ({ window: page, userDataDir }) => {
  await enterCareer(page, userDataDir);

  await page.getByRole("button", { name: "match day", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Match day" })).toBeVisible();
  const start = page.getByRole("button", { name: "Start match" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();
  await expect(page.getByRole("heading", { name: / - / })).toBeVisible();

  await page.getByRole("button", { name: "transfers", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Transfers/ })).toBeVisible();

  await page.getByRole("button", { name: "match day", exact: true }).click();
  // Resumed: the same live scoreboard, and no fresh match picker on arrival.
  await expect(page.getByRole("heading", { name: / - / })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start match" })).not.toBeVisible();
});