import { rmSync } from "node:fs";
import path from "node:path";
import { dismissTeachingSplash, expect, saveEntry, test } from "./launchApp.js";
import { fillPersonalDetails } from "./fillPersonalDetails.js";
import { savesDir, seedFresh, seedNamed } from "./seedSaves.js";

// NOTE: these specs stay click-driven (creation/save-management are mouse-first
// surfaces per the e2e strategy note). Two of them were re-targeted from the
// stage-2-era landing DOM ("Save name" input + Create button), which shipped
// away with the router: creation now lives on `/create/step-1`. The
// duplicate-name case seeds two real saves rather than driving the whole
// creation flow twice, which is a journeys.spec.ts concern.

test("a whitespace first name blocks creation, and leaving produces no save and no crash", async ({ window }) => {
  await window.getByRole("button", { name: "Start New Career" }).click();

  // Step 1 is Active Leagues — the personal details live on step 2, behind it.
  const continueLeagues = window.getByRole("button", { name: /^Continue/ });
  await expect(continueLeagues).toBeEnabled({ timeout: 30_000 });
  await continueLeagues.click();

  const nameInput = window.getByPlaceholder("Your first name");
  await expect(nameInput).toBeVisible();
  const next = window.getByRole("button", { name: "Next: Manager Identity" });

  // The rest of the personal details, so the only thing the probe varies is the first name.
  await fillPersonalDetails(window);

  // Whitespace-only first name: the creation step cannot proceed — no save is produced.
  await nameInput.fill("   ");
  await expect(next).toBeDisabled();

  // A real name completes the panel and unblocks the next step (the creation step validates before commit).
  await nameInput.fill("Test");
  await expect(next).toBeEnabled();

  // Leaving creation never leaks a provisional save into the load list. A world is already
  // being built underneath the manager step, so leaving goes through the discard confirmation.
  await window.getByRole("button", { name: "Cancel" }).click();
  await window
    .getByRole("dialog", { name: "Discard this career?" })
    .getByRole("button", { name: "Discard" })
    .click();
  await window.getByRole("button", { name: "Load Career" }).click();
  // The claim is that the list stayed empty: the discarded career leaked no save card.
  const loadScreen = window.getByRole("main", { name: "Load Career" });
  await expect(loadScreen.getByRole("button", { name: "Start New Career" })).toBeVisible();
  await expect(loadScreen.getByRole("listitem")).toHaveCount(0);
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

test("Save opens a dialog pre-filled with the save's name, and confirms the edited one", async ({ userDataDir, window }) => {
  await seedFresh(savesDir(userDataDir));
  await window.reload();

  await window.getByRole("button", { name: "Load Career" }).click();
  await saveEntry(window, "Seed: fresh").click();
  await expect(window.getByText(/players$/)).toBeVisible({ timeout: 30_000 });
  await dismissTeachingSplash(window);

  await window.getByRole("button", { name: "Save", exact: true }).click();
  const dialog = window.getByRole("dialog", { name: "Save game" });
  const nameInput = dialog.getByLabel("Save name");
  await expect(nameInput).toHaveValue("Seed: fresh");

  await nameInput.fill("Renamed Career");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  // The chrome reads the name back from the save, so this is the write landing, not local state.
  await expect(window.getByText("Renamed Career")).toBeVisible();
});
