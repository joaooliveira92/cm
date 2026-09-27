import { continueSeededCareer, pressPrimary, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

test("sidebar screenshot (throwaway)", async ({ window: page, userDataDir }) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/sidebar-expanded.png" });
  await page.locator('[data-nav-section="recruitment"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/sidebar-recruitment.png" });
  await pressPrimary(page, "b");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/sidebar-collapsed.png" });
});
