import { continueSeededCareer, expect, goto, pressItemKey, test } from "./launchApp.js";
import { savesDir, seedBeforeSeasonEnd } from "./seedSaves.js";

test("News Inbox shows the heading, counts, view tabs, and category filters", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeSeasonEnd(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-season-end");

  await goto(page, "news");

  const main = page.getByRole("main", { name: "News Inbox" });
  await expect(main).toBeVisible();
  await expect(main.getByRole("heading", { name: "News", level: 1 })).toBeVisible();

  // Count line — unread count and total, e.g. "0 unread of N"
  await expect(main.getByText(/\d+ unread of \d+/)).toBeVisible();

  // View tabs
  const tablist = main.getByRole("tablist", { name: "Inbox view" });
  await expect(tablist).toBeVisible();
  for (const tab of ["All", "Unread", "Action required", "Flagged", "Archived"]) {
    await expect(tablist.getByRole("tab", { name: tab })).toBeVisible();
  }

  // Category filter buttons
  const categories = main.getByRole("group", { name: "Categories" });
  await expect(categories).toBeVisible();
  for (const category of ["Board", "Season", "Transfers", "Results", "Development"]) {
    await expect(categories.getByRole("button", { name: category, exact: true })).toBeVisible();
  }

  // Search input
  await expect(main.getByRole("searchbox", { name: "Search news" })).toBeVisible();

  // Bulk action buttons
  await expect(main.getByRole("button", { name: /Mark all read/ })).toBeVisible();
  await expect(main.getByRole("button", { name: /Archive all/ })).toBeVisible();

  // Message list
  const listbox = main.getByRole("listbox", { name: "Messages" });
  await expect(listbox).toBeVisible();

  const messages = listbox.getByRole("option");
  await expect(messages.first()).toBeVisible({ timeout: 10_000 });

  // Selecting the first message opens the message pane with a subject heading
  await messages.first().click();
  await expect(main.getByRole("heading", { level: 2 }).first()).toBeVisible();
  await expect(main.getByRole("button", { name: /Mark (read|unread)/ })).toBeVisible();
  await expect(main.getByRole("button", { name: /Flag|Unflag/ })).toBeVisible();
  await expect(main.getByRole("button", { name: /Archive|Restore/ })).toBeVisible();

  // No error alerts
  await expect(page.getByRole("alert")).toHaveCount(0);
});

/**
 * `g 6 i` is the keyboard gesture for News → Inbox. pressItemKey drives the
 * two-level prefix through the app's real keystroke pipeline, so a keyboard-only
 * player can reach the inbox without touching the mouse, and the focus lands on
 * the screen's region rather than on the sidebar.
 */
test("g 6 i reaches the News Inbox by keyboard with semantic focus", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeSeasonEnd(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-season-end");

  await pressItemKey(page, "news", "news-inbox");

  await expect(page.getByRole("heading", { name: "News", level: 1 })).toBeVisible();
  await expect(page.locator('[data-focus-id="news"]')).toBeFocused();
  await expect(page.getByText(/\d+ unread of \d+/)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("view tabs filter the message list and the first tab restores all messages", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeSeasonEnd(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-season-end");

  await goto(page, "news");
  const tablist = page.getByRole("tablist", { name: "Inbox view" });
  const messages = page.getByRole("listbox", { name: "Messages" }).getByRole("option");

  // Record the total count on the default All tab.
  await expect(messages.first()).toBeVisible({ timeout: 10_000 });
  const allCount = await messages.count();
  expect(allCount).toBeGreaterThan(0);

  // Flagged tab: narrows or stays at zero when none are flagged.
  await tablist.getByRole("tab", { name: "Flagged" }).click();
  await expect(page.getByRole("tab", { name: "Flagged" })).toHaveAttribute("aria-selected", "true");

  // Return to All restores every message — not only a filtered subset.
  await tablist.getByRole("tab", { name: "All" }).click();
  await expect(page.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
  await expect(messages).toHaveCount(allCount);

  // Archive a message, then the Archived tab shows it and All no longer does.
  const firstMessage = messages.first();
  await firstMessage.click();
  await page.getByRole("button", { name: /Archive/ }).click();
  await expect(firstMessage).not.toBeVisible({ timeout: 10_000 });
  await expect(messages).toHaveCount(allCount - 1);

  await tablist.getByRole("tab", { name: "Archived" }).click();
  await expect(page.getByRole("tab", { name: "Archived" })).toHaveAttribute("aria-selected", "true");

  await expect(page.getByRole("alert")).toHaveCount(0);
});