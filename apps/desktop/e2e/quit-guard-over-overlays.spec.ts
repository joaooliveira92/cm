import { expect, saveEntry, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * Regression (group-a-reconciliation ticket 20): the Quit dialog used to paint
 * *under* any overlay the router had open.
 *
 * `QuitGuard` renders before `<RouterProvider>` and used to share `MODAL_SCRIM`
 * (`z-40`) with every router-rendered overlay, so at equal z-index the
 * later-painted overlay won on DOM order. Pressing Cmd+Q during the first-run
 * teaching splash showed only a second, darker scrim; the splash card
 * (`w-[28rem]`) is wider than the dialog (`max-w-sm`) and swallowed every click
 * meant for Cancel or Quit.
 *
 * The splash is the first player-visible case — it is on screen the first time
 * anyone opens a career — so it is the one this test drives. `click()` is the
 * assertion that matters: Playwright's actionability check fails when another
 * element intercepts the pointer, which is exactly the old bug, and which
 * `toBeVisible()` alone would not catch (the dialog was always "visible", just
 * covered).
 */
test("the Quit dialog is topmost and clickable while the teaching splash is open", async ({ app, userDataDir, window: page }) => {
  await seedFresh(savesDir(userDataDir));
  await page.reload();

  await page.getByRole("button", { name: "Load Career" }).click();
  await saveEntry(page, "Seed: fresh").click();

  // Deliberately *not* dismissed: the splash is the overlay under test.
  const splash = page.getByRole("dialog", { name: "Playing a new career" });
  await expect(splash).toBeVisible({ timeout: 20_000 });

  // The real quit path. `before-quit` cancels the quit and asks the renderer to
  // show the dialog, so this resolves rather than ending the app.
  await app.evaluate(({ app: electronApp }) => {
    electronApp.quit();
  });

  const quitDialog = page.getByRole("dialog", { name: "Quit" });
  await expect(quitDialog).toBeVisible();
  await expect(quitDialog.getByText("Are you sure you want to close cm-clone?")).toBeVisible();

  // Both buttons must receive the pointer. Hover the destructive one rather
  // than clicking it — a click would end the app mid-test — and then click
  // Cancel for real. Both run the same hit-target check against the splash.
  await quitDialog.getByRole("button", { name: "Quit" }).hover({ timeout: 5_000 });
  await quitDialog.getByRole("button", { name: "Cancel" }).click({ timeout: 5_000 });

  // Cancel dismissed the dialog and left the app (and the splash under it) alone.
  await expect(quitDialog).toHaveCount(0);
  await expect(splash).toBeVisible();
});
