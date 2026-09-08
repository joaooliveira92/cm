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

  // Each row now carries one control per club surface, so the club-staff control is selected by
  // name rather than by being the row's only button — otherwise `.first()` can land on a
  // `Scout report` control and this test silently exercises the wrong screen.
  const rivalRow = table
    .getByRole("button", { name: /— club staff$/ })
    .filter({ hasNotText: ownName })
    .first();
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
    .getByRole("button", { name: `${ownName} — club staff`, exact: true });
  await expect(ownRow).toBeVisible();
  await ownRow.click();

  await expect(page.getByRole("heading", { name: /Club Staff/ })).toBeVisible();
  await expect(page.getByText("[Not your club]")).toHaveCount(0);
});

test("the league table row reaches both club surfaces, not one at the other's expense", async ({
  window: page,
  userDataDir,
}) => {
  // The regression this guards: the club-staff control once replaced the scout report's only entry
  // point, and the unit test protecting it was renamed onto the new behaviour, so nothing failed.
  // Driving both from the same row through the real shell is what makes that loud.
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "league table");
  const table = page.getByRole("main").getByRole("table");

  const staffControl = table.getByRole("button", { name: /— club staff$/ }).first();
  const clubName = (await staffControl.textContent())!.trim();
  await staffControl.click();
  await expect(page.getByRole("heading", { name: /Club Staff/ })).toBeVisible();

  await pressPrefix(page, "b");
  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();

  await table.getByRole("button", { name: `${clubName} — scout report`, exact: true }).click();
  // On the ready state the `<h1>` is the club's name and "Team Scout Report" is the line beneath
  // it; on loading and error it is the heading. Asserting the text covers the screen either way.
  await expect(page.getByText("Team Scout Report").first()).toBeVisible();
});
