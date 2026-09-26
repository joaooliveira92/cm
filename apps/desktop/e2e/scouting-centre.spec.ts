import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedScouted } from "./seedSaves.js";

/**
 * Scouting Centre's reachable path (Screen 118, group-i ticket 06): the Recruitment submenu opens the
 * Centre, which lists the club's Scouts without actions and summarises coverage. The seeded save has
 * scouted three Players across two rival Clubs, one of them Fully Scouted. Its two links open Scouting
 * Assignment and Scouting Knowledge. The no-Scouts and nothing-scouted empty states are proven in
 * `scouting-centre-screen.test.tsx`.
 */
test("Recruitment opens the Scouting Centre with the Scout roster and coverage, and it links to both sub-screens", async ({
  window: page,
  userDataDir,
}) => {
  await seedScouted(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: scouted");

  await goto(page, "scouting");
  await expect(page.getByRole("heading", { name: "Scouting Centre", level: 1 })).toBeVisible();

  const list = page.getByRole("list", { name: "Scouts" });
  await expect(list).toBeVisible();
  const rows = list.getByRole("listitem");
  expect(await rows.count()).toBeGreaterThan(0);
  await expect(rows.first().getByText(/^Quality \d+$/)).toBeVisible();
  await expect(list.getByRole("button")).toHaveCount(0);

  const summary = page.getByRole("region", { name: "Scouting coverage" });
  await expect(summary).toContainText("Clubs with scouted Players2");
  await expect(summary).toContainText("Players scouted3");
  await expect(summary).toContainText("Fully Scouted1");
  await expect(page.getByRole("alert")).toHaveCount(0);

  const main = page.getByRole("main", { name: "Scouting Centre" });
  await main.getByRole("button", { name: "Scouting Assignment", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Scouting Assignment", level: 1 })).toBeVisible();

  await goto(page, "scouting");
  await expect(page.getByRole("heading", { name: "Scouting Centre", level: 1 })).toBeVisible();
  await main.getByRole("button", { name: "Scouting Knowledge", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Scouting Knowledge", level: 1 })).toBeVisible();
  await expect(page.getByRole("table", { name: "Scouted Clubs" })).toBeVisible();
});
