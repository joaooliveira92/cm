import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test as base } from "@playwright/test";
import type { ElectronApplication, Locator, Page } from "@playwright/test";

const mainPath = path.join(import.meta.dirname, "../dist/main/index.js");

export const launchApp = (userDataDir: string) =>
  electron.launch({
    args: [mainPath, `--user-data-dir=${userDataDir}`],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "" },
  });

export interface LaunchFixtures {
  userDataDir: string;
  app: ElectronApplication;
  window: Page;
}

/** Assign a distinct real player to each of the 11 tactic slots and save — the minimum valid Tactic
 *  (11 unique players), required before the Match Day control panel will render. */
export const assignFullTactic = async (rows: Locator) => {
  await expect(rows).toHaveCount(11);
  for (let i = 0; i < 11; i++) {
    const select = rows.nth(i).locator("select");
    const options = await select.locator("option").all();
    // options[0] is "Unassigned"; pick a distinct real player per slot to avoid duplicate-player rejection.
    const optionValue = await options[i + 1].getAttribute("value");
    await select.selectOption(optionValue!);
  }
  await rows.page().getByRole("button", { name: "Save Tactic" }).click();
  await expect(rows.page().getByText("Saved.")).toBeVisible();
};

export const test = base.extend<LaunchFixtures>({
  userDataDir: async (_fixtures, use) => {
    const dir = mkdtempSync(path.join(tmpdir(), "cm-clone-e2e-"));
    await use(dir);
    rmSync(dir, { recursive: true, force: true });
  },
  app: async ({ userDataDir }, use) => {
    const app = await launchApp(userDataDir);
    await use(app);
    await app.close();
  },
  window: async ({ app }, use) => {
    const page = await app.firstWindow();
    await use(page);
  },
});

export { expect };