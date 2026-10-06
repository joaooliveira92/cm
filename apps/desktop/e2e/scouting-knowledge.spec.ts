import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedScouted } from "./seedSaves.js";

/**
 * Scouting Knowledge's reachable path (Screen 126, group-i ticket 05): the Recruitment submenu opens
 * what the club has scouted. The seeded save has scouted two rival Clubs (two Players at 40 and 100
 * on one, one Player at 15 on the other), so the Club view lists exactly those two Clubs with their
 * counts and Knowledge Confidence, and the Player view lists exactly those three Players. The empty
 * no-scouting state is proven in `scouting-knowledge-screen.test.tsx` and the main-process test.
 */
test("Recruitment opens Scouting Knowledge with the scouted Clubs and Players", async ({
  window: page,
  userDataDir,
}) => {
  await seedScouted(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: scouted");

  await goto(page, "scouting knowledge");
  await expect(page.getByRole("heading", { name: "Scouting Knowledge", level: 1 })).toBeVisible();

  const summary = page.getByRole("region", { name: "Scouting coverage" });
  await expect(summary).toContainText("Clubs with scouted Players2");
  await expect(summary).toContainText("Players scouted3");
  await expect(summary).toContainText("Fully Scouted1");
  await expect(summary).toContainText("Knowledge Confidence");

  const clubs = page.getByRole("table", { name: "Scouted Clubs" });
  const clubRows = clubs.getByRole("row");
  // Header plus exactly the two scouted Clubs.
  await expect(clubRows).toHaveCount(3);
  await expect(clubs.getByRole("cell", { name: /^2 of \d+$/ })).toHaveCount(1);
  await expect(clubs.getByRole("cell", { name: /^1 of \d+$/ })).toHaveCount(1);
  await expect(clubs.getByRole("cell", { name: "Low", exact: true })).toHaveCount(2);

  await page.getByRole("tab", { name: "Players" }).click();
  const players = page.getByRole("table", { name: "Scouted Players" });
  await expect(players.getByRole("row")).toHaveCount(4);
  await expect(players.getByRole("cell", { name: "40%", exact: true })).toHaveCount(1);
  await expect(players.getByRole("cell", { name: "Fully Scouted", exact: true })).toHaveCount(1);
  await expect(players.getByRole("cell", { name: "15%", exact: true })).toHaveCount(1);
  await expect(players.getByRole("columnheader")).toHaveText(["Player", "Club", "Scouting Progress"]);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
