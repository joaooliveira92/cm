import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";

const mainPath = path.join(import.meta.dirname, "../dist/main/index.js");

const launchApp = (userDataDir: string) =>
  electron.launch({
    args: [mainPath, `--user-data-dir=${userDataDir}`],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "" },
  });

let userDataDir: string;
let app: ElectronApplication;
let window: Page;

test.beforeEach(async () => {
  userDataDir = mkdtempSync(path.join(tmpdir(), "cm-clone-e2e-"));
  app = await launchApp(userDataDir);
  window = await app.firstWindow();
});

test.afterEach(async () => {
  await app.close();
  rmSync(userDataDir, { recursive: true, force: true });
});

test("creating a career loads the squad screen", async () => {
  await expect(window.getByText(/main process says: pong/)).toBeVisible();

  await window.getByPlaceholder("Save name").fill("Test Career");
  await window.getByRole("button", { name: "Create" }).click();

  await window.getByRole("button", { name: "Test Career" }).click();

  await expect(window.getByText(/players$/)).toBeVisible();
});

test("a save persists across app restarts", async () => {
  await window.getByPlaceholder("Save name").fill("Persisted Career");
  await window.getByRole("button", { name: "Create" }).click();
  await expect(window.getByRole("button", { name: "Persisted Career" })).toBeVisible();

  await app.close();
  app = await launchApp(userDataDir);
  window = await app.firstWindow();

  await window.getByRole("button", { name: "Persisted Career" }).click();
  await expect(window.getByText(/players$/)).toBeVisible();
});
