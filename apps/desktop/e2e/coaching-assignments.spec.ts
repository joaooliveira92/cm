import { continueSeededCareer, expect, goto, pressItemKey, pressPrefix, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

test("Training opens Coaching Assignments, lists coaching staff with quality and department, and links to sub-surfaces", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "coaching");

  const main = page.getByRole("main", { name: "Coaching Assignments" });
  await expect(main).toBeVisible();
  await expect(main.getByRole("heading", { name: "Coaching Assignments", level: 1 })).toBeVisible();

  // Sub-heading
  await expect(main.getByText(/Your club.s coaching staff and their quality ratings/)).toBeVisible();

  // Coaching staff list
  const list = main.getByRole("list", { name: "Coaching staff" });
  await expect(list).toBeVisible();
  const staff = list.getByRole("listitem");
  await expect(staff.first()).toBeVisible();
  const count = await staff.count();
  expect(count).toBeGreaterThan(0);

  // Each coach card has a quality badge and department text
  const firstCard = staff.first();
  await expect(firstCard.getByText(/^[A-Z][a-z]+ [A-Z][a-z]+$/)).toBeVisible();
  await expect(firstCard.getByText(/\d+\/20/)).toBeVisible();
  await expect(firstCard.getByText("Coaching")).toBeVisible();

  // Links to Workload and Player development surfaces
  await expect(main.getByRole("button", { name: "Workload and recovery" })).toBeVisible();
  await expect(main.getByRole("button", { name: "Player development" })).toBeVisible();

  await expect(page.getByRole("alert")).toHaveCount(0);

  // g b returns to the Training Overview hub
  await pressPrefix(page, "b");
  await expect(page.getByRole("heading", { name: "Training Overview", level: 1 })).toBeVisible();
});

/**
 * `g 3 w` reaches Coaching Assignments by the two-level prefix through the
 * Training section. The sidebar's Coaching item maps to position key `w` as the
 * second item (after Overview at `q`), so the keyboard gesture navigates to the
 * screen and the router lands focus on the Coaching region.
 */
test("g 3 w reaches Coaching Assignments by keyboard with semantic focus", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await pressItemKey(page, "training", "training-coaching");

  await expect(page.getByRole("heading", { name: "Coaching Assignments", level: 1 })).toBeVisible();
  await expect(page.locator('[data-focus-id="coaching"]')).toBeFocused();
  await expect(page.getByText(/coaching staff and their quality ratings/)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

/**
 * The Coaching page's action buttons link to Workload and Player Development
 * through the Training hub. Each button is reachable by keyboard — Tab to it,
 * Enter to follow it — and the destination renders the expected heading.
 * The hub is the authority that resolves the route, so both links assert the hub
 * loads and hands off to the destination, not just that the destination renders
 * in isolation.
 */
test("the Coaching page's action links navigate to Workload and Player Development", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "coaching");
  const main = page.getByRole("main", { name: "Coaching Assignments" });

  await main.getByRole("button", { name: "Workload and recovery" }).focus();
  await expect(main.getByRole("button", { name: "Workload and recovery" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Workload and Recovery", level: 1 })).toBeVisible();
  await pressPrefix(page, "b");

  await main.getByRole("button", { name: "Player development" }).focus();
  await expect(main.getByRole("button", { name: "Player development" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "View full development centre" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});