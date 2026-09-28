import { continueSeededCareer, expect, test } from "./launchApp.js";
import { savesDir, seedRenewable } from "./seedSaves.js";

/**
 * Contract Renewal's path (Screen 140, group-j ticket 04): the real-UI route through the squad —
 * a player's name in the Squad position list opens their player screen (commit 9cbf743e), whose
 * Information tab is the Player Contract screen. No URL typing and no address-bar reach: the clicks
 * are exactly the ones a manager makes.
 *
 * `seedRenewable` stands every own-club Contract in its last year and the fresh save keeps the
 * Transfer Window open (pre-season), so a renewal is legal with no played Matchday. The spec picks
 * a different length, renews, and sees the contract re-read with it — the refresh after success.
 * That no action shows for another club's Player is proven in `player-contract-screen.test.tsx`.
 */
test("the Player Contract screen renews an own-club Player's Contract for a chosen length", async ({
  window: page,
  userDataDir,
}) => {
  await seedRenewable(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: renewable");

  // The career opens on the two-column position list; each row's name button opens the player.
  const firstRow = page.locator("li:has(button[data-focus-id])").first();
  const nameButton = firstRow.locator("button[data-focus-id]");
  const [last, first] = (await nameButton.innerText()).trim().split(", ");
  const playerName = `${first} ${last}`;
  expect(playerName.length).toBeGreaterThan(0);
  await nameButton.click();
  await expect(page.getByRole("main", { name: playerName })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Player sections" })
    .getByRole("button", { name: "Information", exact: true })
    .click();

  const main = page.getByRole("main", { name: playerName });
  await expect(main.getByText("1 year")).toBeVisible();

  const renewal = main.getByRole("region", { name: "Renew contract" });
  await expect(renewal).toBeVisible();
  await renewal.getByRole("combobox", { name: "Contract length" }).click();
  await page.getByRole("listbox").getByRole("option", { name: "5 years", exact: true }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await renewal.getByRole("button", { name: "Renew", exact: true }).click();

  // The renewal re-read the contract: length and expiry rows refresh together. The row assertions
  // are scoped to the Contract Details panel because the same strings also sit in the hidden Base
  // UI select nodes that stay in the DOM after the popup closes.
  const details = main.getByRole("region", { name: "Contract Details" });
  await expect(details.getByText("5 years", { exact: true })).toBeVisible();
  await expect(details.getByText("Season 6", { exact: true })).toBeVisible();
  await expect(renewal.getByRole("alert")).toHaveCount(0);
});