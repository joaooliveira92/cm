import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * Club Fixtures (Screen 40) and Club Transfers (Screen 42), group-c ticket 07.
 *
 * Reached from a league-table row, which is the entry point a club-scoped surface needs: it already
 * names a club. Each control is selected by its own label — the row now carries five, so taking the
 * first button would exercise Club Staff and pass for the wrong reason.
 */
test("a league row opens that club's fixtures and its transfers", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "league table");
  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();

  const table = page.getByRole("main").getByRole("table");
  const ownName =
    (await page.getByRole("banner").locator("span.truncate.text-lg.font-bold").textContent())?.trim() ?? "";

  const rivalFixtures = table
    .getByRole("button", { name: /— club fixtures$/ })
    .filter({ hasNotText: ownName })
    .first();
  await expect(rivalFixtures).toBeVisible();
  await rivalFixtures.click();

  // A club in a league has fixtures, and a fresh save has played none of them — so the shared
  // list's "Unplayed" wording is what proves the list rendered rather than an empty state.
  await expect(page.getByText("[Not your club]")).toBeVisible();
  await expect(page.getByText("Unplayed").first()).toBeVisible();

  // Back to the table for the second surface, the way a player would.
  await goto(page, "league table");
  const rivalTransfers = table
    .getByRole("button", { name: /— club transfers$/ })
    .filter({ hasNotText: ownName })
    .first();
  await rivalTransfers.click();

  // A fresh career has played no Transfer Window, so the empty state is the correct answer here —
  // and it is a sentence, not a blank page.
  await expect(page.getByRole("heading", { name: /^(?!Club Transfers$).+/, level: 1 })).toBeVisible();
  await expect(page.getByText("This club has completed no transfer yet.")).toBeVisible();
});
