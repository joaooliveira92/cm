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

test("assigning a tactic on the Tactics screen persists across a reload", async () => {
  await window.getByPlaceholder("Save name").fill("Tactics Career");
  await window.getByRole("button", { name: "Create" }).click();
  await window.getByRole("button", { name: "Tactics Career" }).click();
  await expect(window.getByText(/players$/)).toBeVisible();

  await window.getByRole("button", { name: "tactics", exact: true }).click();
  await expect(window.getByRole("heading", { name: /Tactics/ })).toBeVisible();

  const rows = window.locator("tbody tr");
  await expect(rows).toHaveCount(11);

  for (let i = 0; i < 11; i++) {
    const select = rows.nth(i).locator("select");
    const options = await select.locator("option").all();
    // options[0] is "Unassigned"; pick a distinct real player per slot to avoid duplicate-player rejection.
    const optionValue = await options[i + 1].getAttribute("value");
    await select.selectOption(optionValue!);
  }

  await window.getByRole("button", { name: "Save Tactic" }).click();
  await expect(window.getByText("Saved.")).toBeVisible();

  await window.getByRole("button", { name: "squad", exact: true }).click();
  await window.getByRole("button", { name: "tactics", exact: true }).click();

  const reloadedRows = window.locator("tbody tr");
  await expect(reloadedRows).toHaveCount(11);
  await expect(reloadedRows.first().locator("select")).not.toHaveValue("");
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
