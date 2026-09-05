import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test as base } from "@playwright/test";
import type { ElectronApplication, Locator, Page } from "@playwright/test";
import { savesDir, seedFresh } from "./seedSaves.js";

const mainPath = path.join(import.meta.dirname, "../dist/main/index.js");

export const launchApp = (userDataDir: string) =>
  electron.launch({
    args: [mainPath, `--user-data-dir=${userDataDir}`],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "" },
  });

/**
 * How long a well-behaved app gets to shut itself down before it is killed.
 *
 * `app.close()` waits on the renderer, so a wedged one never resolves and
 * Playwright's worker teardown — which has no timeout of its own — stalls for a
 * further 30s per test and then fails the *worker*, burying the real failure
 * under "Worker teardown timeout". A test that already failed must not also cost
 * the run half a minute of silence.
 */
const CLOSE_TIMEOUT_MS = 5_000;

/** Close the app, or kill it if it will not go. */
export const closeOrKill = async (app: ElectronApplication): Promise<void> => {
  const pid = app.process().pid;
  let timer: NodeJS.Timeout | undefined;
  const closed = await Promise.race([
    app.close().then(
      () => true,
      () => false,
    ),
    new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), CLOSE_TIMEOUT_MS);
    }),
  ]);
  if (timer !== undefined) clearTimeout(timer);
  if (closed || pid === undefined) return;

  // SIGKILL rather than SIGTERM: the app is already not answering, and a
  // surviving Electron process holds the temp userDataDir the fixture is about
  // to remove.
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Already gone between the race and the kill — nothing to clean up.
  }
};

export interface LaunchFixtures {
  userDataDir: string;
  app: ElectronApplication;
  window: Page;
}

/**
 * "Primary" is Cmd on macOS and Ctrl elsewhere — the same decision the app's
 * keystroke normalizer makes (`src/renderer/keymap/keystroke.ts`). The e2e
 * suite must press the modifier the running platform actually treats as
 * Primary, or `Primary+K`/`Primary+/` never fire.
 */
export const PRIMARY_KEY = process.platform === "darwin" ? "Meta" : "Control";

/** Press a Primary-modifier chord, e.g. pressPrimary(page, "K") = Cmd+K / Ctrl+K. */
export const pressPrimary = async (page: Page, key: string): Promise<void> => {
  await page.keyboard.press(`${PRIMARY_KEY}+${key}`);
};

/** Press the `g <key>` navigation prefix sequence as two keystrokes. */
export const pressPrefix = async (page: Page, key: string): Promise<void> => {
  await page.keyboard.press("g");
  await page.keyboard.press(key);
};

/**
 * Dismiss the one-shot teaching splash (AC-26). The splash is shipped, intended
 * first-run UI shown on the first load of a career screen (per-userDataDir
 * localStorage); a career driver dismisses it exactly as a player does — the
 * autofocused "Got it" button. Without this, the modal backdrop intercepts the
 * pointer on everything beneath it.
 */
export const dismissTeachingSplash = async (page: Page): Promise<void> => {
  const gotIt = page.getByRole("button", { name: "Got it" });
  await expect(gotIt).toBeVisible({ timeout: 15_000 });
  await gotIt.click();
  await expect(gotIt).not.toBeVisible();
};

/** Seed a fresh career, reload, open Load Career, continue it (landing on the Squad route), and
 *  dismiss the first-run teaching splash — the shared career entry the
 *  keyboard coverage specs and the click suite's career drivers use. */
export const enterCareer = async (page: Page, userDataDir: string): Promise<void> => {
  await seedFresh(savesDir(userDataDir));
  await page.reload();
  await page.getByRole("button", { name: "Load Career" }).click();
  await page.getByRole("button", { name: "Seed: fresh" }).click();
  await expect(page.getByText(/players$/)).toBeVisible();
  await dismissTeachingSplash(page);
};

/** Assign a distinct real player to each of the 11 tactic slots and save — the minimum valid Tactic
 *  (11 unique players), required before the Match Day control panel will render. */
export const assignFullTactic = async (rows: Locator) => {
  await expect(rows).toHaveCount(11);
  for (let i = 0; i < 11; i++) {
    const select = rows.nth(i).locator("select");
    const options = await select.locator("option").all();
    // options[0] is "Unassigned"; pick a distinct real player per slot to avoid duplicate-player rejection.
    const optionValue = await options[i + 1]!.getAttribute("value");
    await select.selectOption(optionValue!);
  }
  await rows.page().getByRole("button", { name: "Save Tactic" }).click();
  await expect(rows.page().getByText("Saved.")).toBeVisible();
};

export const test = base.extend<LaunchFixtures>({
  // Playwright 1.62 requires the fixture arg to be a destructuring pattern, even when empty.
  // oxlint-disable-next-line no-empty-pattern
  userDataDir: async ({}, use) => {
    const dir = mkdtempSync(path.join(tmpdir(), "cm-clone-e2e-"));
    await use(dir);
    rmSync(dir, { recursive: true, force: true });
  },
  app: async ({ userDataDir }, use) => {
    const app = await launchApp(userDataDir);
    await use(app);
    await closeOrKill(app);
  },
  window: async ({ app }, use) => {
    const page = await app.firstWindow();
    await use(page);
  },
});

export { expect };