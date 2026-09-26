import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * Scouting Assignment's reachable path (Screen 121, ticket 04): the Recruitment submenu opens the
 * roster of the club's Scouts. A fresh save has no assignments, so every Scout reads free and has
 * nothing to end, and the Club picker offers the League Table's Clubs without the manager's own.
 * Choosing an unscouted Club and pressing Assign points the Scout at it (the command carries the id
 * from `ClubNotScoutedError.currentReportId`, so this also proves typed errors survive IPC), and
 * End assignment frees the Scout again.
 */
test("Recruitment opens Scouting Assignment, lists Scouts and rival Clubs, assigns a Scout to a Club and ends it", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "scouting assignment");
  await expect(page.getByRole("heading", { name: "Scouting Assignment", level: 1 })).toBeVisible();

  const list = page.getByRole("list", { name: "Scouts" });
  await expect(list).toBeVisible();
  const rows = list.getByRole("listitem");
  expect(await rows.count()).toBeGreaterThan(0);
  const first = rows.first();
  await expect(first.getByText(/^Quality \d+$/)).toBeVisible();
  await expect(first.getByText("No assignment")).toBeVisible();
  await expect(list.getByRole("button", { name: /assignment$/ })).toHaveCount(0);

  await page.getByRole("combobox", { name: "Club to scout" }).click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  const options = listbox.getByRole("option");
  // Option 0 is the "Choose a club" placeholder; the rest are the League Table's other Clubs. That the
  // manager's own club is left out is proven in `scouting-assignment-screen.test.tsx`.
  await expect(options.first()).toHaveText("Choose a club");
  expect(await options.count()).toBeGreaterThan(1);
  const clubName = (await options.nth(1).innerText()).trim();
  await page.keyboard.press("Escape");
  await expect(listbox).toHaveCount(0);

  await page.getByRole("combobox", { name: "Club to scout" }).click();
  await listbox.getByRole("option", { name: clubName, exact: true }).click();
  await expect(listbox).toHaveCount(0);
  const scoutName = (await first.getAttribute("aria-label")) ?? "";
  expect(scoutName.length).toBeGreaterThan(0);
  const scout = list.getByRole("listitem", { name: scoutName, exact: true });

  await scout.getByRole("button", { name: `Assign ${scoutName} to ${clubName}` }).click();
  await expect(scout.getByText(`Club: ${clubName}`, { exact: true })).toBeVisible();
  await expect(scout.getByText("Watching this club")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);

  await scout.getByRole("button", { name: `End ${scoutName}'s assignment` }).click();
  await expect(scout.getByText("No assignment")).toBeVisible();
  await expect(scout.getByText(`Club: ${clubName}`, { exact: true })).toHaveCount(0);
  await expect(scout.getByRole("button", { name: `End ${scoutName}'s assignment` })).toHaveCount(0);
});
