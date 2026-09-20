import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedBeforeSeasonEnd } from "./seedSaves.js";

/**
 * Competition Overview (Screen 161, group-l ticket 08) — and the first spec in this branch that
 * can *navigate* rather than address.
 *
 * Screens 162, 163 and 164 shipped with no entry point, so their specs open a route by URL and say
 * so. This page is what links them together, so the journey from it is real and is the thing worth
 * testing: three clicks, three screens, none of which was reachable from anywhere before.
 *
 * The way in is still by address, because what links to *this* page is the World section's
 * Competitions entry, and that is still a placeholder — group-l ticket 09.
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

  await goto(page, "league table");
  await page.evaluate(() => {
    location.hash = location.hash.replace(/\/league.*$/, "/competition/comp_eng_1/overview");
  });

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
