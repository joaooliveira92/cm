import { enterCareer, expect, goto, test } from "./launchApp.js";

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

// Two error paths are deliberately not asserted here, because neither is reachable through the
// shipped UI — an e2e test for either could only be a lie about what a player can do:
//
//   InvalidTacticError (duplicate players). `TacticsScreen` filters players already assigned
//   elsewhere out of every other slot's options, so no sequence of clicks produces a duplicate.
//   The spec that used to stand here injected an <option> into a native <select> with
//   `page.evaluate`; that DOM no longer exists (the selects are the vendored Base UI primitive),
//   and the rejection it was reaching for is already asserted at the seam that can trigger it —
//   `test/tactics.test.ts`, "changeTactics rejects a Tactic that assigns the same player twice".
//
//   SaveArchivedError by sacking. From a fresh seed the manager cannot be sacked through the UI;
//   it needs a deterministic seed where the season concluded with missed board objectives, which
//   ticket 01 (Seed scenarios for wave-2 features) has not produced. Retirement reaches the same
//   error from Manager Profile, but that is a different, deliberate path.
//
// Both used to sit here as empty `test.skip(...)` stubs, which reported as skipped tests forever
// while asserting nothing and hiding that the coverage lives elsewhere.
