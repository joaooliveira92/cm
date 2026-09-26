import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * Club Finances (Screen 39) and Board Confidence (Screen 47), group-c ticket 08.
 *
 * The two halves of ticket 04's rule, side by side: Finances is club-scoped and its nav entry
 * resolves the own club, while Board Confidence stays save-scoped because a rival has no Board
 * Objective at all. Both are reached the way a player reaches them.
 */
test("the Club section's Finances entry resolves the manager's own club", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "club finances");

  const ownName =
    (await page.getByRole("banner").locator("span.truncate.text-lg.font-bold").textContent())?.trim() ?? "";
  await expect(page.getByRole("heading", { name: ownName, level: 1 })).toBeVisible();
  await expect(page.getByText("[Not your club]")).toHaveCount(0);
  await expect(page.getByText("Transfer Budget Remaining", { exact: true })).toBeVisible();
  await expect(page.getByText("WIP — Placeholder screen")).toHaveCount(0);
});

test("a league row opens a rival club's finances", async ({ window: page, userDataDir }) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "league table");
  const table = page.getByRole("main").getByRole("table");
  const ownName =
    (await page.getByRole("banner").locator("span.truncate.text-lg.font-bold").textContent())?.trim() ?? "";

  const rival = table
    .getByRole("button", { name: /— club finances$/ })
    .filter({ hasNotText: ownName })
    .first();
  await rival.click();

  // Budgets are not withheld from a rival: CONTEXT.md says a Club carries no hidden value of its
  // own, so there is no club-level fog for this screen to model.
  await expect(page.getByText("[Not your club]")).toBeVisible();
  await expect(page.getByText("Wage Budget", { exact: true })).toBeVisible();
});

test("Board Confidence shows the board's objective and names what is missing", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "board confidence");

  await expect(page.getByRole("heading", { name: "Board Confidence", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Board Objective" })).toBeVisible();
  await expect(page.getByText(/Finish between \d+ and \d+/)).toBeVisible();
  // The screen's name promises two things; it delivers one and says so.
  await expect(page.getByText("Supporter confidence is not modelled in this game.")).toBeVisible();
  await expect(page.getByText("WIP — Placeholder screen")).toHaveCount(0);
});
