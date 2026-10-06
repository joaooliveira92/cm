import { continueSeededCareer, expect, goto, pressPrefix, test } from "./launchApp.js";
import { openClubSurface } from "./leagueRow.js";
import { savesDir, seedScouted } from "./seedSaves.js";

test("a league row opens a rival's Team Scout Report with scout byline, knowledge, freshness, tabs, and g b returns", async ({
  window: page,
  userDataDir,
}) => {
  const dir = savesDir(userDataDir);
  await seedScouted(dir);
  await continueSeededCareer(page, "Seed: scouted");

  await goto(page, "league table");
  await expect(page.getByRole("heading", { name: "League Table", level: 1 })).toBeVisible();

  // Open scout report for a rival club (not the manager's own).
  const ownName =
    (await page.getByRole("banner").locator("span.truncate.text-title").textContent())?.trim() ?? "";
  const clickedName = await openClubSurface(page, { not: ownName }, "scout report");

  // The report heading is the club's name, with "Team Scout Report" beneath.
  await expect(page.getByRole("heading", { name: clickedName, level: 1 })).toBeVisible();
  await expect(page.getByText("Team Scout Report")).toBeVisible();

  // Metadata: Scout byline, Updated, Knowledge, Freshness.
  await expect(page.getByText("Scout")).toBeVisible();
  await expect(page.getByText(/Compiled from player scouting|^\w+ \w+$/)).toBeVisible();
  await expect(page.getByText("Updated")).toBeVisible();
  await expect(page.getByText("Knowledge")).toBeVisible();
  await expect(page.getByText("Freshness")).toBeVisible();

  // Report tabs
  const tabs = page.getByRole("tablist", { name: "Report sections" });
  for (const tab of ["Squad", "Tactical View", "Previous Reports", "Assign Scout"]) {
    await expect(tabs.getByRole("tab", { name: tab })).toBeVisible();
  }

  // The Squad tab (default) lists key players.
  const squadTab = page.getByRole("tabpanel", { name: "Squad" });
  await expect(squadTab.getByRole("listitem").first()).toBeVisible({ timeout: 10_000 });

  // Report finds: Strengths and Weaknesses panels.
  await expect(page.getByText("Strengths")).toBeVisible();
  await expect(page.getByText("Weaknesses")).toBeVisible();

  // No alert on screen.
  await expect(page.getByRole("alert")).toHaveCount(0);

  // g b returns to the League Table.
  await pressPrefix(page, "b");
  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();
});