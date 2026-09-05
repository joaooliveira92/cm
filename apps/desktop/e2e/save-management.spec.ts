import { rmSync } from "node:fs";
import path from "node:path";
import { expect, saveEntry, test } from "./launchApp.js";
import { savesDir, seedFresh, seedNamed } from "./seedSaves.js";

// NOTE: these specs stay click-driven (creation/save-management are mouse-first
// surfaces per the e2e strategy note). Two of them were re-targeted from the
// stage-2-era landing DOM ("Save name" input + Create button), which shipped
// away with the router: creation now lives on `/create/step-1`. The
// duplicate-name case seeds two real saves rather than driving the whole
// creation flow twice, which is a journeys.spec.ts concern.

test("creating a save with a whitespace name produces no save and no crash", async ({ window }) => {
  await window.getByRole("button", { name: "Start New Career" }).click();

  // Step 1 is Active Leagues — the naming field lives on step 2, behind it.
  const continueLeagues = window.getByRole("button", { name: /^Continue/ });
  await expect(continueLeagues).toBeEnabled({ timeout: 30_000 });
  await continueLeagues.click();

  const nameInput = window.getByPlaceholder("My Career");
  await expect(nameInput).toBeVisible();
  const next = window.getByRole("button", { name: "Next: Manager Identity" });

  // Whitespace-only name: the creation step cannot proceed — no save is produced.
  await nameInput.fill("   ");
  await expect(next).toBeDisabled();

  // A real name unblocks the next step (the creation step validates before commit).
  await nameInput.fill("Empty-name career");
  await expect(next).toBeEnabled();

  // Leaving creation never leaks a provisional save into the load list.
  await window.getByRole("button", { name: "Cancel" }).click();
  await window.getByRole("button", { name: "Load Career" }).click();
  // `exact` disambiguates the empty *list item* from the empty-state paragraph beneath it
  // ("No saves yet. Start a new career…"); the claim here is that the list stayed empty.
  await expect(window.getByText("No saves yet.", { exact: true })).toBeVisible();
});

test("duplicate save names are allowed and both appear in the load list", async ({ userDataDir, window }) => {
  await seedNamed(savesDir(userDataDir), "Duplicate Career");
  await seedNamed(savesDir(userDataDir), "Duplicate Career");
  await window.reload();

  await window.getByRole("button", { name: "Load Career" }).click();
  await expect(saveEntry(window, "Duplicate Career")).toHaveCount(2);
});

test("clicking a stale save entry (file deleted) is a silent no-op — stays on load screen", async ({ userDataDir, window }) => {
  const id = await seedFresh(savesDir(userDataDir));
  await window.reload();

  await window.getByRole("button", { name: "Load Career" }).click();
  const entry = saveEntry(window, "Seed: fresh");
  await expect(entry).toBeVisible();

  rmSync(path.join(savesDir(userDataDir), `${id}.sqlite`));

  await entry.click();
  await expect(window.getByRole("heading", { name: "Load Career" })).toBeVisible();
  await expect(entry).toBeVisible();
});