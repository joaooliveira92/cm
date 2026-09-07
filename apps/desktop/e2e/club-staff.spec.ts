import { continueSeededCareer, expect, goto, pressPrefix, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * The Club Staff screen's reachable path (screen 38): the league table row names a club, so it
 * is the entry point into that club's staff page; `g b` returns the way the entry point came in.
 *
 * The only non-deterministic input is which club is the user's own — the save pins it, so the
 * spec reads it off the chrome's identity band to tell a rival row from the user's own.
 */
test("a league row opens that club's staff page and g b returns to the league", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "league table");
  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();

  // The league table's one real table; the manager's own club is named in the identity band.
  const table = page.getByRole("main").getByRole("table");
  const ownName = (await page.getByRole("banner").locator("span.truncate.text-lg.font-bold").textContent())?.trim() ?? "";

  const rivalRow = table.getByRole("button").filter({ hasNotText: ownName }).first();
  await expect(rivalRow).toBeVisible();
  const clickedName = (await rivalRow.textContent())!.trim();
  await rivalRow.click();

  // The staff page: a club header naming the club, four department headings, and — because the
  // clicked club is not the user's — the foreign marker, all rendered, never a redirect.
  await expect(page.getByRole("heading", { name: /Club Staff/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: new RegExp(`^${clickedName}`) })).toBeVisible();
  await expect(page.getByText("[Not your club]")).toBeVisible();
  await Promise.all(
    ["Executive", "Coaching", "Recruitment", "Medical"].map((department) =>
      expect(page.getByRole("heading", { name: department })).toBeVisible(),
    ),
  );

  // g b returns through real history to the page the entry point came from.
  await pressPrefix(page, "b");
  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();
});

test("the user's own club row shows no [Not your club] marker", async ({ window: page, userDataDir }) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "league table");
  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();

  const ownName = (await page.getByRole("banner").locator("span.truncate.text-lg.font-bold").textContent())?.trim() ?? "";
  expect(ownName.length).toBeGreaterThan(0);

  const ownRow = page
    .getByRole("main")
    .getByRole("table")
    .getByRole("button", { name: ownName, exact: true });
  await expect(ownRow).toBeVisible();
  await ownRow.click();

  await expect(page.getByRole("heading", { name: /Club Staff/ })).toBeVisible();
  await expect(page.getByText("[Not your club]")).toHaveCount(0);
});