import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

/**
 * Contract Expiry (Screen 141) and Budget Review (Screen 145) are reached through the Recruitment
 * submenu, the same way Transfer History is (group-j ticket 08). `goto` clicks the navbar rather
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
 * Ten Recruitment entries are wider than the 1200px window the app opens at, so the last ones start
 * off-screen. A click from `goto` would pass either way, because Playwright scrolls the target into
 * view programmatically, and `overflow-hidden` on the career root still allows that. A user can
 * only reach them by scrolling the strip itself, so this test scrolls it with the wheel and checks
 * that Budget Review, the last entry, comes into view.
 */
test("the Recruitment submenu scrolls to its last entry at the default window width", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("button", { name: "Recruitment", exact: true })
    .click();
  const submenu = page.getByRole("navigation", { name: "Recruitment submenu" });
  const budgetReview = submenu.getByRole("button", { name: "Budget Review", exact: true });
  await expect(budgetReview).not.toBeInViewport();

  await submenu.hover({ position: { x: 20, y: 20 } });
  await page.mouse.wheel(2000, 0);
  await expect(budgetReview).toBeInViewport();
});
