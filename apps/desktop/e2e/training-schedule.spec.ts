import { continueSeededCareer, expect, goto, pressPrefix, pressSectionKey, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * Training Schedule's reachable path (Screen 107, ticket 06): the Training Overview hub opens the
 * Schedule through its "Plan training" button. The g b back assertion returns through real history
 * to the Training Overview hub.
 */
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

  // Bottom bar renders Save and Reset buttons.
  await expect(main.getByRole("button", { name: "Save Schedule" })).toBeVisible();
  await expect(main.getByRole("button", { name: "Reset", exact: true })).toBeVisible();

  // No alert on screen.
  await expect(page.getByRole("alert")).toHaveCount(0);

  // g b returns to the Training Overview hub.
  await pressPrefix(page, "b");
  await expect(page.getByRole("heading", { name: "Training Overview", level: 1 })).toBeVisible();
});

/**
 * `g 3` reaches the Training Overview hub by keyboard, and "Plan training" opens the Schedule
 * from it — the same path a keyboard-first player takes.
 */
test("g 3 then Plan training opens the Training Schedule by keyboard", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await pressSectionKey(page, "training");
  await expect(page.getByRole("heading", { name: "Training Overview", level: 1 })).toBeVisible();
  await expect(page.locator('[data-focus-id="training"]')).toBeFocused();

  await page.getByRole("button", { name: "Plan training" }).click();
  await expect(page.getByRole("heading", { name: "Training Schedule", level: 1 })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});