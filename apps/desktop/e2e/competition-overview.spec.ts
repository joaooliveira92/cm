import { continueSeededCareer, expect, goto, pressItemKey, test } from "./launchApp.js";
import { savesDir, seedBeforeSeasonEnd } from "./seedSaves.js";

/**
 * Competition Overview (Screen 161) and the whole branch behind it, navigated end to end
 * (group-l tickets 08 and 10).
 *
 * **Nothing here is addressed by URL.** World → Competitions → a row → Overview → three screens.
 * Every one of Screens 161–164 shipped with no entry point and was reachable only by typing a
 * route; this journey is what ticket 10 bought, and asserting it is the only way to notice if an
 * entry point breaks again.
 *
 * `seedBeforeSeasonEnd` so the counts are interesting: deep into the season, with football played
 * and the conclusion still ahead.
 */
test("a competition's overview links to its table, fixtures and results", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeSeasonEnd(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-season-end");

  await goto(page, "competitions");
  await expect(page.getByRole("main", { name: "Competitions" })).toBeVisible();

  // The browse list's row control names its competition, so the click is on a named thing rather
  // than on whichever button happens to come first.
  await page.getByRole("button", { name: /— overview$/ }).first().click();

  await expect(page.getByRole("main", { name: "Competition Overview" })).toBeVisible();
  await expect(page.getByText("WIP — Placeholder screen")).toHaveCount(0);

  // The page names the competition rather than repeating a raw id, which is the whole reason it
  // has a read of its own.
  const overview = page.getByRole("main", { name: "Competition Overview" });
  const heading = overview.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).not.toHaveText(/^comp_/);
  // Scoped to the screen and exact: the persistent shell's identity band also reads "Played:".
  await expect(overview.getByText("Played", { exact: true })).toBeVisible();

  const sections = page.getByRole("navigation", { name: "Competition sections" });

  await sections.getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("main", { name: "Competition Table" })).toBeVisible();
  await page.goBack();

  await sections.getByRole("button", { name: "Fixtures" }).click();
  await expect(page.getByRole("main", { name: "Competition Fixtures" })).toBeVisible();
  await page.goBack();

  await sections.getByRole("button", { name: "Results" }).click();
  await expect(page.getByRole("main", { name: "Competition Results" })).toBeVisible();
});

/**
 * `g 8 q` reaches the Competitions browse list by keyboard through the World
 * section. Competitions is the World section's first (and only) item, so the
 * two-level prefix gesture navigates to the screen and the router lands focus.
 */
test("g 8 q reaches Competitions by keyboard with semantic focus", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeSeasonEnd(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-season-end");

  await pressItemKey(page, "world", "world-competitions");

  await expect(page.getByRole("main", { name: "Competitions" })).toBeVisible();
  await expect(page.locator('[data-focus-id="competitions"]')).toBeFocused();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

/**
 * The Competitions browse list shows at least one competition row on a
 * before-season-end seed, and each row's heading names the competition rather
 * than a raw id. The browse list is the gate to the overview and competition
 * sub-screens, so it must render real data, not a placeholder.
 */
test("the Competitions browse list shows at least one competition with a readable name", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeSeasonEnd(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-season-end");

  await goto(page, "competitions");
  const browse = page.getByRole("list", { name: "Competition browse" });
  await expect(browse).toBeVisible();

  const rows = browse.getByRole("listitem");
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);

  // Each row is headed by the competition's display name, never a raw comp_ id.
  await Promise.all(
    (await rows.all()).map((row) =>
      expect(row.getByRole("heading", { level: 2 })).not.toHaveText(/^comp_/),
    ),
  );

  // Every competition row has an overview link.
  const overviewLinks = page.getByRole("button", { name: /— overview$/ });
  await expect(overviewLinks).toHaveCount(count);

  await expect(page.getByRole("alert")).toHaveCount(0);
});
