import { continueSeededCareer, expect, goto, pressPrefix, pressItemKey, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * The Club → Staff nav entry reaches the roster (group-c ticket 02).
 *
 * Reached through the navbar rather than by address, because the navbar is the subject: the entry
 * pointed at a WIP placeholder while `ClubStaffScreen` rendered the same roster one route away, and
 * a spec that addressed `club/$clubId/staff` directly would have passed throughout.
 *
 * A fresh seed gives the manager's own club its generated Staff, so the roster is the own club's —
 * which is the part the resolver adds. Every club has Staff of both kinds at every Simulation Depth,
 * so the departments are populated without the seed arranging anything.
 */
test("the Club section's Staff entry opens the manager's own club staff roster with all four departments", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "club staff");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("WIP — Placeholder screen")).toHaveCount(0);

  // All four departments render, proving the roster resolved the full staff set.
  for (const department of ["Executive", "Coaching", "Recruitment", "Medical"]) {
    await expect(page.getByRole("heading", { name: department, level: 2 })).toBeVisible();
  }

  // The manager's own club is never marked.
  await expect(page.getByText("[Not your club]")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

/**
 * `g 7 r` reaches Club Staff by the two-level prefix through the Club section.
 * Staff is the Club section's fourth item (r), so the keyboard gesture navigates to the screen
 * and the router lands focus on the Club Staff region.
 */
test("g 7 r reaches Club Staff by keyboard with semantic focus", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await pressItemKey(page, "club", "club-staff");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator('[data-focus-id="clubStaff"]')).toBeFocused();
  await expect(page.getByRole("heading", { name: "Coaching", level: 2 })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

/**
 * `g b` from Club Staff returns through real history to the previous screen.
 * The previous screen is the default career arrival (Squad), which is the same landing
 * the Club section's entry point came from.
 */
test("g b from Club Staff returns to the previous screen", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "club staff");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await pressPrefix(page, "b");
  await expect(page.getByText(/players$/)).toBeVisible();
  await expect(page.locator('[data-focus-id="squad"]')).toBeFocused();
});