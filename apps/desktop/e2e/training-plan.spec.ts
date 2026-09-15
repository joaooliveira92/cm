import { continueSeededCareer, expect, goto, pressPrefix, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * Individual Training Plan's reachable path (Screen 108, ticket 06): Training lands on Coaching
 * Assignments, "Workload and recovery" opens the workload list, and a row's "Training plan" button
 * opens that player's plan. A fresh save gives every player the None default, so None starts pressed;
 * choosing Technical and then None again goes through `setTrainingFocus` both ways, and each time the
 * refreshed read moves the pressed button and the summary card. `g b` returns to the workload list.
 */
test("a Workload and Recovery row opens the player's Training Plan, which sets and clears Training Focus", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "training");
  await page.getByRole("button", { name: "Workload and recovery", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Workload and Recovery", level: 1 })).toBeVisible();

  const firstRow = page.getByRole("list", { name: "Player workload" }).getByRole("listitem").first();
  const playerName = await firstRow.getAttribute("aria-label");
  expect(playerName).not.toBeNull();
  await firstRow.getByRole("button", { name: `${playerName} training plan`, exact: true }).click();

  await expect(page.getByRole("heading", { name: `${playerName} — Training Plan`, level: 1 })).toBeVisible();
  const picker = page.getByRole("group", { name: `${playerName} Training Focus` });
  const card = page.getByRole("region", { name: `${playerName} training plan` });

  await expect(picker.getByRole("button", { name: "None", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByText("Training Focus: None")).toBeVisible();

  await picker.getByRole("button", { name: "Technical", exact: true }).click();
  await expect(picker.getByRole("button", { name: "Technical", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByText("Training Focus: Technical")).toBeVisible();

  await picker.getByRole("button", { name: "None", exact: true }).click();
  await expect(picker.getByRole("button", { name: "None", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByText("Training Focus: None")).toBeVisible();

  await pressPrefix(page, "b");
  await expect(page.getByRole("heading", { name: "Workload and Recovery", level: 1 })).toBeVisible();
});
