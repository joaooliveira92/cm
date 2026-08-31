import type { Page } from "@playwright/test";
import { dismissTeachingSplash, expect, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/** Navigate to a tab by clicking its button. */
const goto = async (window: Page, tab: string) => {
  await window.getByRole("button", { name: tab, exact: true }).click();
};

/** Seed, continue, and dismiss the first-run teaching splash. */
const enterCareer = async (window: Page, userDataDir: string) => {
  await seedFresh(savesDir(userDataDir));
  await window.reload();
  await window.getByRole("button", { name: "Seed: fresh" }).click();
  await dismissTeachingSplash(window);
};

test("generic transfer failure — bidding above budget shows failed status", async ({ userDataDir, window }) => {
  await enterCareer(window, userDataDir);
  await goto(window, "transfers");

  // AC-29: bid entry lives in the contextual Actions region, not in the table
  // rows — select the first Market player (its name control), which mounts the
  // region, then bid an unaffordable amount.
  const market = window
    .getByRole("heading", { name: "Market", exact: true })
    .locator("xpath=ancestor::section");
  const firstRow = market.locator("tbody tr").first();
  await firstRow.locator("td").first().locator("button").click();

  const region = window.getByRole("region", { name: "Place bid" });
  await region.getByPlaceholder("Amount").fill("999999999");
  await region.getByRole("button", { name: "Bid" }).click();
  await expect(window.getByText(/Bid: failed\./)).toBeVisible();
});

test("InvalidTacticError shows specific hint text when players are duplicated", async ({ userDataDir, window }) => {
  await enterCareer(window, userDataDir);
  await goto(window, "tactics");

  const rows = window.locator("tbody tr");
  await expect(rows).toHaveCount(11);

  // The frontend removes already-assigned players from each <select>'s options,
  // preventing duplicate selection through the standard UI. We re-add the
  // option and dispatch native change events to set the React state with a
  // duplicate, then verify the backend rejects it and the UI shows the
  // specific hint text.
  await window.evaluate(() => {
    const selects = document.querySelectorAll<HTMLSelectElement>("tbody tr select");
    const firstReal = Array.from(selects[0].options).find((o) => o.value !== "");
    if (firstReal) {
      selects[0].value = firstReal.value;
      selects[0].dispatchEvent(new Event("change", { bubbles: true }));
      const option = document.createElement("option");
      option.value = firstReal.value;
      option.textContent = "Duplicate";
      selects[1].appendChild(option);
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
// From a fresh seed, SaveArchivedError is unreachable through the UI by sacking. (Retirement
// reaches the same error from Manager Profile, but that is a different, deliberate path.)
test.skip("sacking error smoke", () => {});