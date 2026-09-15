import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedConcluded } from "./seedSaves.js";

/**
 * Performance Report's path (Screen 113, ticket 07). No in-app control links to the player coach
 * report route yet, so the spec reaches a real own-club player through Workload and Recovery and
 * the Individual Training Plan (whose URL carries the player id) and then opens
 * `/player/$playerId/coach-report` by address, the way `router.spec.ts` opens a route directly.
 *
 * A concluded seed has run Player Development once, so the report shows one recorded Season. It is
 * the earliest one, so it reads as having no earlier Attributes to compare with.
 */
test("the Performance Report shows an own player's Training Focus and recorded development", async ({
  window: page,
  userDataDir,
}) => {
  await seedConcluded(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: concluded");

  await goto(page, "training");
  await page.getByRole("button", { name: "Workload and recovery", exact: true }).click();
  const firstRow = page.getByRole("list", { name: "Player workload" }).getByRole("listitem").first();
  const playerName = await firstRow.getAttribute("aria-label");
  expect(playerName).not.toBeNull();
  await firstRow.getByRole("button", { name: `${playerName} training plan`, exact: true }).click();
  await expect(page.getByRole("heading", { name: `${playerName} — Training Plan`, level: 1 })).toBeVisible();

  await page.evaluate(() => {
    location.hash = location.hash.replace(/\/training\/plan\/([^/?]+)/, "/player/$1/coach-report");
  });

  await expect(page.getByRole("heading", { name: `${playerName} — Performance Report`, level: 1 })).toBeVisible();
  await expect(
    page.getByRole("region", { name: `${playerName} training plan` }).getByText("Training Focus: None"),
  ).toBeVisible();

  const seasons = page.getByRole("list", { name: "Development by Season" });
  await expect(seasons.getByRole("heading", { level: 3 })).toHaveCount(1);
  await expect(seasons.getByText(/First recorded Season at your club/)).toBeVisible();
  await expect(page.getByText(/Placeholder/)).toHaveCount(0);
});
