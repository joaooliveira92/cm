import type { Page } from "@playwright/test";
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

// TODO(#01): Restore when a sacking seed is available. Requires ticket 01
// (Seed scenarios for wave-2 features) to produce a deterministic seed where
// the manager has been sacked (season concluded with missed board objectives).
// From a fresh seed, SaveSackedError is unreachable through the UI.
test.skip("sacking error smoke", () => {});