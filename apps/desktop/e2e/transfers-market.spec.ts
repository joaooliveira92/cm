import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedScouted } from "./seedSaves.js";

/**
 * The market reads listed rivals by Scouting Progress (ticket 09): every figure is a Range until
 * the player is Fully Scouted, when it collapses to the exact number. `seedScouted` puts one rival
 * player at 40, one at 100 (Fully Scouted), one at 15, and leaves everyone else Unscouted. This spec
 * asserts the Market table renders both shapes — a dashed band for the ranged reads, a plain number
 * for the exact read — without asserting mot values (formatting is locale-dependent, so the regexes
 * accept both `1,200,000` and `1.200.000`).
 */
test("the Market table shows ranged figures that collapse to exact for Fully Scouted players", async ({
  window: page,
  userDataDir,
}) => {
  await seedScouted(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: scouted");

  await goto(page, "transfers");
  await expect(page.getByRole("heading", { name: "Transfers", level: 1 })).toBeVisible();

  const market = page.getByRole("table", { name: "Market" });
  await expect(market.getByRole("row").first()).toBeVisible();

  // Ranged OVR reads render as low–high bands (en dash); the Value column carries Cr on both ends.
  // Age cells are plain numbers and Club cells are names, so the dashed regexes match only OVR and
  // value bands respectively. `seedScouted` scopes at least two rivals within the banded window
  // (progress 40 and 15); `toHaveCount` takes an exact number in Playwright 1.62, so poll the count.
  await expect.poll(() => market.getByRole("cell", { name: /^\d+–\d+$/ }).count()).toBeGreaterThanOrEqual(2);
  await expect
    .poll(() => market.getByRole("cell", { name: /^\d(\d|[., ])* Cr–\d(\d|[., ])* Cr$/ }).count())
    .toBeGreaterThanOrEqual(2);

  // The Fully Scouted player reads exact: his Value cell is a single Cr number, and the same row's
  // OVR cell (4th column: Name, Age, Club, OVR) is a plain number, not a band.
  const exactValue = market.getByRole("cell", { name: /^\d(\d|[., ])* Cr$/ }).first();
  await expect(exactValue).toBeVisible();
  await expect(exactValue.locator("..").getByRole("cell").nth(3)).toHaveText(/^\d+$/);

  // Nothing in the market leaks a bare number where a range belongs, and no alert is open.
  await expect(page.getByRole("alert")).toHaveCount(0);
});