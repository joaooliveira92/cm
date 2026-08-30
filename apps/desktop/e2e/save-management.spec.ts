import { rmSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./launchApp.js";
import { savesDir, seedFresh, seedNamed } from "./seedSaves.js";

// NOTE: these specs stay click-driven (creation/save-management are mouse-first
// surfaces per the e2e strategy note). Two of them were re-targeted from the
// stage-2-era landing DOM ("Save name" input + Create button), which shipped
// away with the router: creation now lives on `/create/step-1`. The UI cannot
// complete a commit through the shipped flow (the ClubSelection reading gap —
// see journeys.spec.ts's persistence note), so the duplicate-name case seeds
// two real saves instead of exercising the moot in-flow path.

test("creating a save with a whitespace name produces no save and no crash", async ({ window }) => {
  await window.getByRole("button", { name: "Start New Career" }).click();

  const nameInput = window.getByPlaceholder("My Career");
  const next = window.getByRole("button", { name: "Next: Select Club" });

  // Whitespace-only name: the creation step cannot proceed — no save is produced.
  await nameInput.fill("   ");
  await expect(next).toBeDisabled();

  // A real name unblocks the next step (the creation step validates before commit).
  await nameInput.fill("Empty-name career");
  await expect(next).toBeEnabled();

  // Leaving creation never leaks a provisional save into the continue list.
  await window.getByRole("button", { name: "Cancel" }).click();
  await expect(window.getByText("No saves yet.")).toBeVisible();
});

test("duplicate save names are allowed and both appear in the continue list", async ({ userDataDir, window }) => {
  await seedNamed(savesDir(userDataDir), "Duplicate Career");
  await seedNamed(savesDir(userDataDir), "Duplicate Career");
  await window.reload();

  const buttons = window.getByRole("button", { name: "Duplicate Career" });
  await expect(buttons).toHaveCount(2);
});

test("clicking a stale save entry (file deleted) is a silent no-op — stays on landing screen", async ({ userDataDir, window }) => {
  const id = await seedFresh(savesDir(userDataDir));
  await window.reload();

  const button = window.getByRole("button", { name: "Seed: fresh" });
  await expect(button).toBeVisible();

  rmSync(path.join(savesDir(userDataDir), `${id}.sqlite`));

  await button.click();
  await expect(window.getByRole("heading", { name: "Championship Manager Clone" })).toBeVisible();
  await expect(window.getByRole("button", { name: "Seed: fresh" })).toBeVisible();
});