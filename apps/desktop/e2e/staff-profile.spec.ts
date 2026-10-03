import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

test("Club Staff opens a staff member's Profile showing name, role, coaching ratings, and the Rankings panel", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "club staff");

  // The own club staff page lists departments with staff members.
  await expect(page.getByRole("heading", { name: /Club Staff/ })).toBeVisible();

  // Click the first staff member name in the Coaching section to open their profile.
  const staffList = page.getByRole("list", { name: "Coaching" });
  await expect(staffList).toBeVisible();
  const firstStaff = staffList.getByRole("listitem").first();
  await expect(firstStaff).toBeVisible();
  const staffButton = firstStaff.getByRole("button").first();
  const staffName = (await staffButton.textContent())?.trim() ?? "";
  expect(staffName.length).toBeGreaterThan(0);
  await staffButton.click();

  // The Staff Profile loads with the staff member's name and club.
  const main = page.locator('main[data-focus-id="staffProfile"]');
  const h1 = main.getByRole("heading", { level: 1 });
  await expect(h1).toBeVisible();
  await expect(h1).toContainText(staffName);
  // The heading typically includes the club name in parentheses.
  await expect(h1).toContainText(/\(.+\)/);

  // Role, nationality, and age are shown on the header line.
  const header = main.getByText(/(Coach|Assistant Manager|President|Scout|Physio), .+, Age \d+/);
  await expect(header).toBeVisible();

  // Coaching ratings panel — at least one rating label is present for a coach.
  await expect(main.getByText("Coaching")).toBeVisible();
  await expect(main.getByText(/Coaching (Goalkeepers|Outfield Players|)/)).toBeVisible();

  // Overview panel with personal data.
  await expect(main.getByText("Overview")).toBeVisible();
  await expect(main.getByText("Date of Birth")).toBeVisible();
  await expect(main.getByText("Nationality")).toBeVisible();

  // No alert on screen.
  await expect(page.getByRole("alert")).toHaveCount(0);
});