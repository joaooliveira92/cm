import { continueSeededCareer, expect, goto, pressItemKey, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

test("the Manager Profile shows the manager's name, archetype, Current Club, Philosophy pillars, and Personal Details", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "manager");

  const main = page.getByRole("main", { name: "Manager Overview" });
  await expect(main).toBeVisible();

  // The manager name is the h1 and also the avatar's label.
  const heading = main.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  const managerName = (await heading.textContent())?.trim() ?? "";
  expect(managerName.length).toBeGreaterThan(0);
  await expect(main.getByRole("img", { name: managerName })).toBeVisible();

  // Active badge
  await expect(main.getByText("Active")).toBeVisible();

  // Archetype label — one of Professor, Motivator, Sergeant, Academy Head, Custom Manager
  const archetype = main.getByText(/^(Professor|Motivator|Sergeant|Academy Head|Custom Manager)$/);
  await expect(archetype).toBeVisible();

  // Current Club card
  await expect(main.getByText("Current Club")).toBeVisible();
  await expect(main.getByText(/^Season \d+$/)).toBeVisible();
  await expect(main.getByText(/Tenure: \d+ seasons?/)).toBeVisible();

  // Management Philosophy card with all four pillars
  await expect(main.getByText("Management Philosophy")).toBeVisible();
  for (const pillar of ["Tactical Acumen", "Influence", "Regimen", "Technical Coaching"]) {
    await expect(main.getByText(pillar)).toBeVisible();
  }

  // Personal Details card
  await expect(main.getByText("Personal Details")).toBeVisible();
  await expect(main.getByText("Nationality")).toBeVisible();
  await expect(main.getByText("Preferred Formation")).toBeVisible();

  // Career Record card
  await expect(main.getByText("Career Record")).toBeVisible();
  for (const label of ["Played", "Won", "Drawn", "Lost", "Goals For", "Goals Against"]) {
    await expect(main.getByText(label)).toBeVisible();
  }

  // Trophies Won card
  await expect(main.getByText("Trophies Won")).toBeVisible();
  await expect(main.getByText("None yet.")).toBeVisible();

  // Retire Manager button
  await expect(main.getByRole("button", { name: "Retire Manager" })).toBeVisible();

  await expect(page.getByRole("alert")).toHaveCount(0);
});

/**
 * `g 7 q` reaches the Manager Profile by the two-level prefix through the Club
 * section. Manager is the Club section's first item (q), default destination,
 * so the keyboard gesture navigates to the screen and the router lands focus on
 * the Manager region.
 */
test("g 7 q reaches the Manager Profile by keyboard with semantic focus", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await pressItemKey(page, "club", "club-manager");

  await expect(page.getByRole("heading", { name: "Manager Overview", level: 1 })).toBeVisible();
  await expect(page.locator('[data-focus-id="manager"]')).toBeFocused();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a fresh career record shows zero matches played", async ({ window: page, userDataDir }) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "manager");

  const main = page.getByRole("main", { name: "Manager Overview" });
  // Career Record card: zero counts across the board on a fresh seed.
  const record = main.getByText("Career Record");
  await expect(record).toBeVisible();

  // The card sits within the main region — heading 2 or a region label identifies it.
  await expect(main.getByText(/Played:\s*0/)).toBeVisible();
  await expect(main.getByText(/Won:\s*0/)).toBeVisible();
  await expect(main.getByText(/Drawn:\s*0/)).toBeVisible();
  await expect(main.getByText(/Lost:\s*0/)).toBeVisible();
  await expect(main.getByText(/Goals For:\s*0/)).toBeVisible();
  await expect(main.getByText(/Goals Against:\s*0/)).toBeVisible();

  await expect(page.getByRole("alert")).toHaveCount(0);
});