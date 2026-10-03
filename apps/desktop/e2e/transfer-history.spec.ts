import { continueSeededCareer, expect, goto, pressItemKey, test } from "./launchApp.js";
import { savesDir, seedFresh, seedTransferred } from "./seedSaves.js";

/**
 * Transfer History's reachable path (Screen 146, group-j ticket 07): the Recruitment submenu opens
 * what the manager's club has bought and sold. The seeded save has three transfers the club took
 * part in — one in, one out, one **Free Agent** signing — plus one between two rivals that the
 * screen must exclude. The empty no-transfer state is proven in `transfer-history-screen.test.tsx`
 * and the main-process test.
 */
test("Recruitment opens Transfer History with the club's transfers newest first", async ({
  window: page,
  userDataDir,
}) => {
  await seedTransferred(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: transferred");

  await goto(page, "transfer history");
  await expect(page.getByRole("heading", { name: "Transfer History", level: 1 })).toBeVisible();

  const table = page.getByRole("table", { name: "Transfer History" });
  await expect(table.getByRole("columnheader")).toHaveText(["Date", "Player", "From", "To", "Fee"]);

  // Header plus exactly the three transfers the manager's club took part in: the rival-to-rival
  // move is not this club's business and must not appear.
  const rows = table.getByRole("row");
  await expect(rows).toHaveCount(4);

  // Newest first: the '2026-08-20' purchase, then the '2026-07-02' sale, then the '2026-07-01'
  // Free Agent signing.
  await expect(rows.nth(1).getByRole("cell").first()).toHaveText("20 Aug 2026");
  await expect(rows.nth(2).getByRole("cell").first()).toHaveText("2 Jul 2026");
  await expect(rows.nth(3).getByRole("cell").first()).toHaveText("1 Jul 2026");

  // The Free Agent signing: no selling Club, and a Credits 0 fee.
  const freeAgentRow = rows.nth(3);
  await expect(freeAgentRow.getByRole("cell").nth(2)).toHaveText("Free Agent");
  await expect(freeAgentRow.getByRole("cell").nth(4)).toHaveText("0 Credits");

  // The purchase carries a real selling Club and a real fee.
  await expect(rows.nth(1).getByRole("cell").nth(4)).toHaveText("3,000,000 Credits");
  await expect(rows.nth(1).getByRole("cell").nth(2)).not.toHaveText("Free Agent");

  await expect(page.getByRole("alert")).toHaveCount(0);
});

/**
 * A fresh career has no transfer history. The screen renders the heading and the
 * empty-state sentence rather than a blank page or an error.
 */
test("a fresh career shows no transfer history with the empty state sentence", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  await goto(page, "transfer history");
  await expect(page.getByRole("heading", { name: "Transfer History", level: 1 })).toBeVisible();
  await expect(page.getByText("This club has completed no transfer yet.")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

/**
 * `g 4 w` reaches Transfer History by the two-level prefix through the
 * Recruitment section. Transfer History is the second Recruitment item (w),
 * so the keyboard gesture navigates to the screen and the router lands focus.
 */
test("g 4 w reaches Transfer History by keyboard with semantic focus", async ({
  window: page,
  userDataDir,
}) => {
  await seedTransferred(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: transferred");

  await pressItemKey(page, "recruitment", "recruitment-transfer-history");

  await expect(page.getByRole("heading", { name: "Transfer History", level: 1 })).toBeVisible();
  await expect(page.locator('[data-focus-id="transferHistory"]')).toBeFocused();
  await expect(page.getByRole("table", { name: "Transfer History" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
