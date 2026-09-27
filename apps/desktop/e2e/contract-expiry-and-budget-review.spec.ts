import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * Contract Expiry (Screen 141) and Budget Review (Screen 145) are reached through the Recruitment
 * submenu, the same way Transfer History is (group-j ticket 08). `goto` clicks the sidebar rather
 * than typing a URL, so these fail if either entry goes missing. What each screen lists is proven in
 * `contract-expiry-screen.test.tsx` and the main-process tests (`contract-expiry.test.ts`,
 * `budget-review.test.ts`); here it is enough that the screen arrives, loads without an error, and
 * the submenu marks its entry as the current page.
 */
test("Recruitment opens Contract Expiry", async ({ window: page, userDataDir }) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "contract expiry");
  await expect(page.getByRole("heading", { name: "Contract Expiry", level: 1 })).toBeVisible();
  await expect(page.getByText("Loading expiring contracts...")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Recruitment submenu" }).getByRole("button", { name: "Contract Expiry", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("Recruitment opens Budget Review", async ({ window: page, userDataDir }) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "budget review");
  await expect(
    page.getByRole("heading", { name: "Transfer & Wage Budget Review", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Transfer Budget Remaining")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Recruitment submenu" }).getByRole("button", { name: "Budget Review", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

/**
 * Ten Recruitment entries were wider than the 1200px window the app opens at, so the last ones
 * started off-screen and a player could only reach them by scrolling the submenu strip sideways.
 * Stacking them vertically in the sidebar is what retired that gesture, so what is worth holding now
 * is the outcome the gesture existed to reach: the last entry is on screen as soon as the section
 * opens, at the size the app actually opens at.
 *
 * If a future section list outgrows the window this goes red. The sidebar scrolls, so nothing becomes
 * unreachable — but "the longest section no longer fits" is worth being told about rather than
 * discovering as a wheel gesture that quietly came back.
 */
test("the last Recruitment entry is on screen at the default window width", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await page.locator('[data-nav-section="recruitment"]').click();
  const budgetReview = page
    .getByRole("navigation", { name: "Recruitment submenu" })
    .getByRole("button", { name: "Budget Review", exact: true });
  await expect(budgetReview).toBeVisible();
  await expect(budgetReview).toBeInViewport();
});
