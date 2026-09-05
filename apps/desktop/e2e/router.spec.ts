import type { Page } from "@playwright/test";
import { enterCareer, expect, goto, matchScore, saveEntry, test, type Screen } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/** Clear the League and Nation stage, which gates world generation: the creation flow opens on
 *  scope selection, and the manager step is only reachable once a snapshot exists. */
const advanceThroughLeagues = async (page: Page) => {
  const button = page.getByRole("button", { name: /^Continue/ });
  await expect(button).toBeEnabled({ timeout: 30_000 });
  await button.click();
  await expect(page.getByPlaceholder("My Career")).toBeVisible();
};

test("hash history survives a reload on the active route (AC-10)", async ({ window: page, userDataDir }) => {
  await enterCareer(page, userDataDir);

  await goto(page, "transfers");
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

  // The shell is the primary navbar plus the persistent back-to-saves control. Both are owned by
  // the career parent, so both must survive every child route without remounting.
  const primaryNav = page.getByRole("navigation", { name: "Primary navigation" });
  const backToSaves = page.getByRole("button", { name: "Back to saves" });
  await expect(primaryNav).toBeVisible();
  await expect(backToSaves).toBeVisible();

  const routes: ReadonlyArray<{
    readonly screen: Screen;
    readonly assert: () => Promise<unknown>;
  }> = [
    { screen: "tactics", assert: () => expect(page.getByRole("heading", { name: /Tactics/ })).toBeVisible() },
    { screen: "transfers", assert: () => expect(page.getByRole("heading", { name: /Transfers/ })).toBeVisible() },
    { screen: "league table", assert: () => expect(page.getByRole("heading", { name: "League Table" })).toBeVisible() },
    { screen: "fixtures", assert: () => expect(page.getByRole("heading", { name: "Fixtures" })).toBeVisible() },
    { screen: "season summary", assert: () => expect(page.getByRole("heading", { name: "Season Summary" })).toBeVisible() },
    { screen: "squad", assert: () => expect(page.getByText(/players$/)).toBeVisible() },
  ];

  for (const route of routes) {
    await goto(page, route.screen);
    await route.assert();
    // Exactly one of each: a second would mean the child mounted its own shell.
    await expect(primaryNav).toHaveCount(1);
    await expect(backToSaves).toHaveCount(1);
  }
});

test("a well-formed-but-missing save stays on the career route with an error — never a loader redirect (AC-12)", async ({ window: page, userDataDir }) => {
  await seedFresh(savesDir(userDataDir));
  await page.reload();
  await page.getByRole("button", { name: "Load Career" }).click();
  await expect(saveEntry(page, "Seed: fresh")).toBeVisible();

  // Well-formed saveId (a UUID) that no save exists for — the career route must
  // mount and surface a failure through the seam (no loader, no redirect to the
  // save list; distinct from the malformed-parameter route error).
  const missingSaveId = crypto.randomUUID();
  await page.evaluate((id) => {
    location.hash = `#/career/${id}/squad`;
  }, missingSaveId);

  // The shell chrome stays mounted and the child surfaces the failure — the route did not
  // loader-redirect us off the career branch. Asserted by role rather than by the old
  // `p.text-red-300` class, which the design-token pass replaced; the blocking-error surfaces all
  // carry `role="alert"`, which is the contract worth holding anyway.
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to saves" })).toBeVisible();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Championship Manager Clone" })).not.toBeVisible();
});

test("creation keeps beginCareer before Club Selection and returning discards it (AC-13)", async ({ window: page }) => {
  await page.getByRole("button", { name: "Start New Career" }).click();
  await expect(page.getByRole("heading", { name: "New Career" })).toBeVisible();

  await advanceThroughLeagues(page);
  await page.getByPlaceholder("My Career").fill("Keyboard Career");
  await page.getByRole("button", { name: "Next: Manager Identity" }).click();
  await page.getByRole("button", { name: "Next: Select Club" }).click();

  // Club Selection depends on the generated world + persisted economy, so
  // beginCareer ran before we arrived (the rail's options render from the provisional save).
  await expect(page.getByRole("table", { name: "Clubs" })).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Championship Manager Clone" })).toBeVisible();
  // Leaving creation never leaks a provisional save into the load list.
  await page.getByRole("button", { name: "Load Career" }).click();
  await expect(page.getByText("No saves yet.", { exact: true })).toBeVisible();
});

test("reloading mid-creation redirects to step 1 (AC-13)", async ({ window: page }) => {
  await page.getByRole("button", { name: "Start New Career" }).click();
  await advanceThroughLeagues(page);
  await page.getByPlaceholder("My Career").fill("Reload Career");
  await page.getByRole("button", { name: "Next: Manager Identity" }).click();
  await page.getByRole("button", { name: "Next: Select Club" }).click();
  await expect(page.getByRole("table", { name: "Clubs" })).toBeVisible();

  // The creation session is in-memory: a reload lands on step 2 with nothing recoverable — not
  // even the league scope generation is gated on — so the flow redirects to the front of it.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Active Leagues" })).toBeVisible();
});

test("the flow never advances past the club decision (AC-13)", async ({ window: page }) => {
  // This test used to prove recovery from a commit that always failed: the renderer shipped a
  // placeholder club id no club matched. The club-selection effort wired the real selection, so
  // the reachable session fact here is the gate — Continue is closed until a club is picked, and
  // the commit-failure recovery path is exercised at the seam that can still trigger it
  // (`test/create-flow-club-selection.test.tsx`).
  await page.getByRole("button", { name: "Start New Career" }).click();
  await advanceThroughLeagues(page);
  await page.getByPlaceholder("My Career").fill("Gated Career");
  await page.getByRole("button", { name: "Next: Manager Identity" }).click();
  await page.getByRole("button", { name: "Next: Select Club" }).click();
  await expect(page.getByRole("table", { name: "Clubs" })).toBeVisible();

  // The gate itself is the disabled control. The "Choose a club to continue." reason is no longer
  // asserted: `useCreateSession` only sets it when an advance is *attempted*, and the button being
  // disabled means it never can be — so the copy is unreachable from this flow and asserting it
  // would be testing a string no player sees.
  const next = page.getByRole("button", { name: "Next: Review" });
  await expect(next).toBeDisabled();

  await page
    .getByRole("table", { name: "Clubs" })
    .getByRole("row")
    .filter({ has: page.locator('[role="cell"]') })
    .first()
    .click();
  await expect(next).toBeEnabled();

  // Nothing leaked into the save list: no career is committed by picking.
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Championship Manager Clone" })).toBeVisible();
  await page.getByRole("button", { name: "Load Career" }).click();
  await expect(page.getByText("No saves yet.", { exact: true })).toBeVisible();
});

test("pointer nav does not force focus; keyboard nav focuses the destination (AC-15)", async ({ window: page, userDataDir }) => {
  await enterCareer(page, userDataDir);

  await goto(page, "transfers");
  await expect(page.getByRole("heading", { name: /Transfers/ })).toBeVisible();
  const afterPointer = await page.evaluate(
    () => document.activeElement?.getAttribute("data-focus-id") ?? null,
  );
  expect(afterPointer).not.toBe("transfers");

  const tacticsTab = page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("button", { name: "Tactics", exact: true });
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

  await goto(page, "match day");
  await expect(page.getByRole("heading", { name: "Match day" })).toBeVisible();
  const start = page.getByRole("button", { name: "Start match" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();
  await expect(matchScore(page)).toBeVisible();

  await goto(page, "transfers");
  await expect(page.getByRole("heading", { name: /Transfers/ })).toBeVisible();

  await goto(page, "match day");
  // Resumed: the same live scoreboard, and no fresh match picker on arrival.
  await expect(matchScore(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Start match" })).not.toBeVisible();
});