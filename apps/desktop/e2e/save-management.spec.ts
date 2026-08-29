import { rmSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

test("creating a save with an empty name produces no save and no crash", async ({ window }) => {
  const input = window.getByPlaceholder("Save name");
  const create = window.getByRole("button", { name: "Create" });

  await input.fill("   ");
  await create.click();
  await expect(window.getByText("No saves yet.")).toBeVisible();

  await input.fill("Empty-name career");
  await create.click();
  await expect(window.getByRole("button", { name: "Empty-name career" })).toBeVisible();
});

test("duplicate save names are allowed and both appear in the continue list", async ({ window }) => {
  const input = window.getByPlaceholder("Save name");
  const create = window.getByRole("button", { name: "Create" });

  await input.fill("Duplicate Career");
  await create.click();
  await expect(window.getByRole("button", { name: "Duplicate Career" })).toBeVisible();

  await input.fill("Duplicate Career");
  await create.click();

  const buttons = window.getByRole("button", { name: "Duplicate Career" });
  await expect(buttons).toHaveCount(2);
});

test("clicking a stale save entry (file deleted) is a silent no-op — stays on landing screen", async ({ window }) => {
  const id = await seedFresh(savesDir(userDataDir));
  await window.reload();

  const button = window.getByRole("button", { name: "Seed: fresh" });
  await expect(button).toBeVisible();

  rmSync(path.join(savesDir(userDataDir), `${id}.sqlite`));

  await button.click();
  await expect(window.getByPlaceholder("Save name")).toBeVisible();
  await expect(window.getByRole("button", { name: "Seed: fresh" })).toBeVisible();
});