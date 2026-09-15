import { continueSeededCareer, expect, goto, pressPrefix, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * Workload and Recovery's reachable path (Screen 112, ticket 05): the Training section lands on
 * Coaching Assignments, whose "Workload and recovery" button opens the workload sub-surface. A
 * fresh save sits at Season start, so every ledger row is at full Condition — each player reads
 * Active with no injury this Season. `g b` returns the way the button came in.
 */
test("the Training screen opens Workload and Recovery, one Condition gauge per player, and g b returns", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "training");
  await expect(page.getByRole("heading", { name: "Coaching Assignments", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Workload and recovery", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Workload and Recovery", level: 1 })).toBeVisible();
  const list = page.getByRole("list", { name: "Player workload" });
  await expect(list).toBeVisible();

  const rows = list.getByRole("listitem");
  const meters = list.getByRole("meter");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);
  await expect(meters).toHaveCount(rowCount);
  await expect(meters.first()).toHaveAttribute("aria-valuenow", "100");
  await expect(rows.first().getByText("Active", { exact: true })).toBeVisible();
  await expect(rows.first().getByText("No injury this Season")).toBeVisible();

  await pressPrefix(page, "b");
  await expect(page.getByRole("heading", { name: "Coaching Assignments", level: 1 })).toBeVisible();
});
