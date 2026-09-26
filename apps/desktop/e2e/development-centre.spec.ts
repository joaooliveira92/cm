import { continueSeededCareer, expect, goto, pressPrefix, test } from "./launchApp.js";
import { savesDir, seedConcluded } from "./seedSaves.js";

/**
 * Player Development Centre's reachable path (Screen 114, ticket 08): Training lands on the Training
 * Overview hub, whose Development preview offers "View development centre" into the squad-wide list. A concluded seed has run Player
 * Development once, so every row's newest recorded Season is the first one and reads as having no
 * comparison yet, and every player carries the None default. A row's "Development" button opens that
 * player's Player Development screen; `g b` returns to the list.
 */
test("the Player Development Centre lists the squad with Training Focus and development, and opens a player's development", async ({
  window: page,
  userDataDir,
}) => {
  await seedConcluded(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: concluded");

  await goto(page, "training");
  await page.getByRole("button", { name: "View full development centre" }).click();
  await expect(page.getByRole("heading", { name: "Player Development Centre", level: 1 })).toBeVisible();

  const rows = page.getByRole("list", { name: "Squad development" }).getByRole("listitem");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(1);

  const firstRow = rows.first();
  const playerName = await firstRow.getAttribute("aria-label");
  expect(playerName).not.toBeNull();
  await expect(firstRow.getByText("Training Focus: None")).toBeVisible();
  await expect(firstRow.getByText(/^No comparison yet: Season \d+ is the first recorded at your club\.$/)).toBeVisible();

  await firstRow.getByRole("button", { name: `${playerName} development`, exact: true }).click();
  await expect(page.getByRole("heading", { name: `${playerName} — Development`, level: 1 })).toBeVisible();

  await pressPrefix(page, "b");
  await expect(page.getByRole("heading", { name: "Player Development Centre", level: 1 })).toBeVisible();
});
