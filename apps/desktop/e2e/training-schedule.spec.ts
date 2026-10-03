import { continueSeededCareer, expect, goto, pressPrefix, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

test("the Training Schedule screen opens from the hub, shows session rows with type and intensity selectors, and g b returns", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "training");
  await expect(page.getByRole("heading", { name: "Training Overview", level: 1 })).toBeVisible();

  // "Plan training" opens the schedule from the Training Schedule card.
  await page.getByRole("button", { name: "Plan training" }).click();

  const main = page.getByRole("main", { name: "Training Schedule" });
  await expect(main).toBeVisible();
  await expect(main.getByRole("heading", { name: "Training Schedule", level: 1 })).toBeVisible();

  // The fixture line names the next opponent.
  await expect(main.getByText(/Planning for .+ \((home|away)\), .+/)).toBeVisible();

  // Template buttons: Normal, Pre-season, Taper, Intense, Custom.
  for (const template of ["Normal", "Pre-season", "Taper", "Intense", "Custom"]) {
    await expect(main.getByRole("button", { name: template, exact: true })).toBeVisible();
  }

  // Five session rows, each with type and intensity selectors.
  const sessions = main.getByRole("list", { name: "Sessions" });
  await expect(sessions).toBeVisible();
  const rows = sessions.getByRole("listitem");
  expect(await rows.count()).toBe(5);

  // Each row has a type and an intensity combobox.
  for (let i = 0; i < 5; i++) {
    await expect(rows.nth(i).getByRole("combobox", { name: `Session ${i + 1} type` })).toBeVisible();
    await expect(rows.nth(i).getByRole("combobox", { name: `Session ${i + 1} intensity` })).toBeVisible();
  }

  // Bottom bar renders Save and Reset buttons (delegation is in the bar too).
  await expect(main.getByRole("button", { name: "Save Schedule" })).toBeVisible();

  // No alert on screen.
  await expect(page.getByRole("alert")).toHaveCount(0);

  // g b returns to the Training Overview hub.
  await pressPrefix(page, "b");
  await expect(page.getByRole("heading", { name: "Training Overview", level: 1 })).toBeVisible();
});