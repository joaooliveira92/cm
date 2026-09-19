import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
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
test("the Club section's Staff entry opens the manager's own club staff roster", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "club staff");

  // The roster's own heading, not the resolver's: reaching this proves the hand-off happened.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("WIP — Placeholder screen")).toHaveCount(0);

  // Coaching is the department the Training screen already proves is populated on a fresh seed.
  await expect(page.getByRole("heading", { name: "Coaching", level: 2 })).toBeVisible();
});
