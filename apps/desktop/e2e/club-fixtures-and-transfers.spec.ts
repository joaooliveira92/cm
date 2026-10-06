import { continueSeededCareer, expect, goto, pressPrefix, pressItemKey, test } from "./launchApp.js";
import { openClubSurface } from "./leagueRow.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * Club Fixtures (Screen 40) and Club Transfers (Screen 42), group-c ticket 07.
 *
 * Reached from a league-table row, which is the entry point a club-scoped surface needs: it already
 * names a club. Each control is selected by its own label — the row now carries five, so taking the
 * first button would exercise Club Staff and pass for the wrong reason.
 */
test("a league row opens that club's fixtures with Unplayed fixtures visible", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "league table");
  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();

  const table = page.getByRole("main").getByRole("table");
  const ownName =
    (await page.getByRole("banner").locator("span.truncate.text-title").textContent())?.trim() ?? "";

  await expect(table).toBeVisible();
  await openClubSurface(page, { not: ownName }, "club fixtures");

  // A club in a league has fixtures, and a fresh save has played none of them — so the shared
  // list's "Unplayed" wording is what proves the list rendered rather than an empty state.
  await expect(page.getByText("[Not your club]")).toBeVisible();
  await expect(page.getByText("Unplayed").first()).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a league row opens that club's transfers showing the empty state on a fresh save", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "league table");
  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();

  const ownName =
    (await page.getByRole("banner").locator("span.truncate.text-title").textContent())?.trim() ?? "";

  await openClubSurface(page, { not: ownName }, "club transfers");

  // A fresh career has played no Transfer Window, so the empty state is the correct answer here —
  // and it is a sentence, not a blank page. The heading is the club's name, never "Club Transfers".
  await expect(page.getByText("[Not your club]")).toBeVisible();
  await expect(page.getByText("This club has completed no transfer yet.")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

/**
 * `g b` from Club Fixtures returns through real history to the League Table.
 */
test("g b from a club surface returns to the League Table", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "league table");
  const ownName =
    (await page.getByRole("banner").locator("span.truncate.text-title").textContent())?.trim() ?? "";

  await openClubSurface(page, { not: ownName }, "club fixtures");
  await expect(page.getByText("[Not your club]")).toBeVisible();

  await pressPrefix(page, "b");
  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();
});

/**
 * `g 5 q` reaches the League Table by keyboard through the Analysis section.
 */
test("g 5 q reaches the League Table by keyboard with semantic focus", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await pressItemKey(page, "analysis", "analysis-league");

  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();
  await expect(page.locator('[data-focus-id="league"]')).toBeFocused();
  await expect(page.getByRole("alert")).toHaveCount(0);
});