import { expect, launchApp, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

test("debug v16 — render driver probe", async ({ userDataDir }) => {
  await seedFresh(savesDir(userDataDir));
  const app = await launchApp(userDataDir);
  const page = await app.firstWindow();
  page.on("console", (msg) => console.log(`[renderer-grep] ${msg.text()}`));

  await page.getByRole("button", { name: "Load Career" }).click();
  await page.getByRole("button", { name: "Seed: fresh" }).click();
  await expect(page.getByRole("button", { name: "Got it" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Got it" }).dispatchEvent("click");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  console.log("[debug] on squad; waiting 4s for render patterns");
  await new Promise((resolve) => setTimeout(resolve, 4000));
  console.log("[debug] done");
  await app.close();
});