import type { Page, TestInfo } from "@playwright/test";
import { assignFullTactic, continueSeededCareer, expect, goto, matchScore, openTacticsEditor, test } from "./launchApp.js";
import { savesDir, seedBeforeMatchday } from "./seedSaves.js";

/**
 * cm-style-commentary 14: the commentary bar on a real Match day, at a normal and a narrow window, with
 * screenshots saved for a human to review (test-results/…/match-day-*.png). The assertions are the
 * layout facts a screenshot would show broken: the bar and both choice rows on screen, nothing wider
 * than the window.
 */

const shoot = async (page: Page, testInfo: TestInfo, name: string): Promise<void> => {
  await page.screenshot({ path: testInfo.outputPath(`match-day-${name}.png`) });
};

/** Nothing on the page is wider than the window: no horizontal scroll. */
const fitsTheWindow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test("the commentary bar fits Match day at a normal and a narrow width", async ({ window: page, userDataDir }, testInfo) => {
  await seedBeforeMatchday(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-matchday");
  await goto(page, "tactics");
  await openTacticsEditor(page);
  await assignFullTactic(page);

  await goto(page, "match day");
  const start = page.getByRole("button", { name: "Play match" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();
  await expect(matchScore(page)).toBeVisible();

  const main = page.getByRole("main", { name: "Match day" });
  const speed = main.getByRole("group", { name: "Commentary speed" });
  const highlights = main.getByRole("group", { name: "Highlights" });
  await expect(speed).toBeVisible();
  await expect(highlights).toBeVisible();
  // Several lines in, so the bar and the log both have something to show.
  await expect(main.getByRole("log", { name: "Commentary" }).getByRole("listitem").nth(6)).toBeVisible({ timeout: 30_000 });

  for (const { name, width, height } of [
    { name: "normal", width: 1440, height: 900 },
    { name: "narrow", width: 1024, height: 720 },
  ]) {
    await page.setViewportSize({ width, height });
    await expect(speed).toBeInViewport();
    await expect(highlights).toBeInViewport();
    expect(await fitsTheWindow(page)).toBe(true);
    await shoot(page, testInfo, `live-${name}`);
  }

  // Fast at Key highlights: minor lines take no time, so full time comes quickly even on a loaded machine.
  await speed.getByRole("button", { name: "Fast" }).click();
  await highlights.getByRole("button", { name: "Key" }).click();
  await expect(main.getByRole("button", { name: "Accept result" })).toBeVisible({ timeout: 120_000 });
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await fitsTheWindow(page)).toBe(true);
  await shoot(page, testInfo, "full-time");
});
