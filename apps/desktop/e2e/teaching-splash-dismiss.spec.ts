import { expect, launchApp, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * Regression: dismissing the teaching splash from a *trusted* input (a real
 * click, Enter, or Escape) used to hang the renderer — `gotIt.click()` never
 * returned because React's synchronous discrete commit, tearing the autofocused
 * splash down inside the trusted event's flush, wedged the main thread in a
 * tight loop. Dismissal is now deferred one macrotask; this test drives the
 * real click and asserts the click resolves, the dialog is gone, and the
 * renderer is still responsive afterwards.
 */
test("dismissing the teaching splash from a real click resolves and does not wedge the renderer", async ({ userDataDir }) => {
  await seedFresh(savesDir(userDataDir));
  const app = await launchApp(userDataDir);
  const page = await app.firstWindow();

  await page.getByRole("button", { name: "Load Career" }).click();
  await page.getByRole("button", { name: "Seed: fresh" }).click();
  const gotIt = page.getByRole("button", { name: "Got it" });
  await expect(gotIt).toBeVisible({ timeout: 20_000 });

  // The old behaviour: `click()` stayed pending until the test timed out while
  // the renderer burned CPU. Bound it so a regression fails fast instead.
  const clickOutcome = await Promise.race([
    gotIt.click().then(
      () => "resolved" as const,
      (error: Error) => `rejected: ${error.message}` as const,
    ),
    new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 8_000)),
  ]);
  expect(clickOutcome, "gotIt.click() must resolve — the renderer wedged").toBe("resolved");

  await expect(page.getByRole("dialog", { name: /Playing a new career/i })).toHaveCount(0);
  // The renderer answered a request; it is not blocked.
  await expect(page.evaluate(() => "alive")).resolves.toBe("alive");
  await app.close();
});