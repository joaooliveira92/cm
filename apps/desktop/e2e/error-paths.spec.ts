import type { Page } from "@playwright/test";
import { rmSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/** Navigate to a tab by clicking its button. */
const goto = async (window: Page, tab: string) => {
  await window.getByRole("button", { name: tab, exact: true }).click();
};

test("generic transfer failure — bidding above budget shows failed status", async ({ userDataDir, window }) => {
  await seedFresh(savesDir(userDataDir));
  await window.reload();
  await window.getByRole("button", { name: "Seed: fresh" }).click();
  await goto(window, "transfers");

  const market = window
    .getByRole("heading", { name: "Market", exact: true })
    .locator("xpath=ancestor::section");
  const firstRow = market.locator("tbody tr").first();
  await firstRow.locator("input").fill("999999999");
  await firstRow.getByRole("button", { name: "Bid" }).click();
  await expect(window.getByText(/Bid: failed\./)).toBeVisible();
});

test("InvalidTacticError shows specific hint text when players are duplicated", async ({ userDataDir, window }) => {
  await seedFresh(savesDir(userDataDir));
  await window.reload();
  await window.getByRole("button", { name: "Seed: fresh" }).click();
  await goto(window, "tactics");

  const rows = window.locator("tbody tr");
  await expect(rows).toHaveCount(11);

  // The frontend removes already-assigned players from each <select>'s options,
  // preventing duplicate selection through the standard UI. We dispatch native
  // change events to set the React state with a duplicate, then verify the
  // backend rejects it and the UI shows the specific hint text.
  await window.evaluate(() => {
    const selects = document.querySelectorAll<HTMLSelectElement>("tbody tr select");
    const firstReal = Array.from(selects[0].options).find((o) => o.value !== "");
    if (firstReal) {
      selects[0].value = firstReal.value;
      selects[0].dispatchEvent(new Event("change", { bubbles: true }));
      selects[1].value = firstReal.value;
      selects[1].dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  await window.getByRole("button", { name: "Save Tactic" }).click();
  await expect(
    window.getByText(/Failed to save tactic — check every slot has a unique player assigned/),
  ).toBeVisible();
});

test("sacking error smoke — skipped: depends on sacking seed from ticket 01", () => {
  // Ticket 01 (Seed scenarios for wave-2 features) is unresolved.
  // A sacking seed is needed to trigger SaveSackedError through the UI.
  // Once ticket 01 resolves, restore this test with:
  //   1. Create save via sacking seed
  //   2. Navigate to a mutating screen (tactics, transfers, match day)
  //   3. Attempt a mutation
  //   4. Assert the misleading generic error message appears
  // Fallback: from fresh seed, no sacking error is reachable.
});

test("loadSave silent no-op — clicking a stale save entry stays on landing screen", async ({ userDataDir, window }) => {
  const id = await seedFresh(savesDir(userDataDir));
  await window.reload();

  const button = window.getByRole("button", { name: "Seed: fresh" });
  await expect(button).toBeVisible();

  rmSync(path.join(savesDir(userDataDir), `${id}.sqlite`));

  await button.click();
  await expect(window.getByPlaceholder("Save name")).toBeVisible();
  await expect(window.getByRole("button", { name: "Seed: fresh" })).toBeVisible();
});