import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * Club General Information (Screen 34, group-c ticket 06), by both of its paths.
 *
 * Two specs because there are two ways in and only one screen behind them — which is the point of
 * [the club-scoped rule](../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md).
 * Before this the two paths had two placeholders, both labelled "Club Information".
 */
test("the Club section's Information entry opens the manager's own club", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "club information");

  // The manager's own club is named in the identity band; the screen's h1 is that club's name,
  // which is how the resolver proves it resolved rather than guessed.
  const ownName =
    (await page.getByRole("banner").locator("span.truncate.text-lg.font-bold").textContent())?.trim() ?? "";
  expect(ownName.length).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: ownName, level: 1 })).toBeVisible();

  // The manager's own club is never marked.
  await expect(page.getByText("[Not your club]")).toHaveCount(0);
  await expect(page.getByText("WIP — Placeholder screen")).toHaveCount(0);
});

test("a league row opens that club's information, marked as not the manager's", async ({
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

  // Selected by its own label: the row carries one control per club surface, so picking the
  // row's first button would exercise Staff instead and pass for the wrong reason.
  const rivalRow = table
    .getByRole("button", { name: /— club information$/ })
    .filter({ hasNotText: ownName })
    .first();
  await expect(rivalRow).toBeVisible();
  await rivalRow.click();

  await expect(page.getByText("[Not your club]")).toBeVisible();
  // The ground is the field Screen 46's facilities fold into, and the one thing here that is not
  // also on the staff page — so it is what proves this is Information and not a near neighbour.
  await expect(page.getByText("Ground")).toBeVisible();
  await expect(page.getByText("Capacity")).toBeVisible();
});
