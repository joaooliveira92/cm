/**
 * The five mandated keyboard coverages — stage 7 (e2e conversion):
 *
 *  1. `g <key>` screen navigation (with `g b` back)
 *  2. the command palette (Primary+K; filter; Enter dispatches; Escape closes)
 *  3. the Squad grid (row-oriented roving, Space selection, sortable headers)
 *  4. the Match Day two-step substitution — lives in `journeys.spec.ts`
 *     (the converted level-3 substitution journey, AC-33)
 *  5. Escape layering (topmost transient layer only)
 *
 * Authoring rule from the e2e strategy note: `toBeFocused()` (auto-retrying) on
 * role/text locators plus ARIA states. No `data-testid` is asserted anywhere —
 * the focus-position assertions use the production `data-focus-id` semantic
 * target the router's focus coordinator already owns (the same identity the
 * AC-15 router spec asserts), never a test hook.
 */
import {
  assignFullTactic,
  continueSeededCareer,
  enterCareer,
  expect,
  pressPrefix,
  pressPrimary,
  test,
} from "./launchApp.js";
import { savesDir, seedBeforeMatchday } from "./seedSaves.js";

test("g <key> navigation reaches the career screens and g b goes back (AC-18)", async ({
  window: page,
  userDataDir,
}) => {
  await enterCareer(page, userDataDir); // lands on Squad with semantic focus

  // g a → Tactics
  await pressPrefix(page, "a");
  await expect(page.getByRole("heading", { name: /Tactics/ })).toBeVisible();
  await expect(page.locator('[data-focus-id="tactics"]')).toBeFocused();

  // g t → Transfers
  await pressPrefix(page, "t");
  await expect(page.getByRole("heading", { name: /Transfers/ })).toBeVisible();
  await expect(page.locator('[data-focus-id="transfers"]')).toBeFocused();

  // g m → Match Day (no match pending on a fresh seed — the picker, not a resume)
  await pressPrefix(page, "m");
  await expect(page.getByRole("heading", { name: "Match day" })).toBeVisible();
  await expect(page.locator('[data-focus-id="match"]')).toBeFocused();

  // g s → Squad
  await pressPrefix(page, "s");
  await expect(page.getByText(/players$/)).toBeVisible();
  await expect(page.locator('[data-focus-id="squad"]')).toBeFocused();

  // g b → the previous screen through real history (Transfers → back → Squad)
  await pressPrefix(page, "t");
  await expect(page.getByRole("heading", { name: /Transfers/ })).toBeVisible();
  await pressPrefix(page, "b");
  await expect(page.getByText(/players$/)).toBeVisible();
  await expect(page.locator('[data-focus-id="squad"]')).toBeFocused();
});

test("Primary+K opens the palette, filters, Enter dispatches, Escape closes it (AC-20/23)", async ({
  window: page,
  userDataDir,
}) => {
  await enterCareer(page, userDataDir);

  await pressPrimary(page, "K");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  const combobox = dialog.getByRole("combobox");
  await expect(combobox).toBeFocused();

  // Type to filter; the matching command narrows to one available row.
  await page.keyboard.type("Go to Squad");
  await expect(dialog.getByRole("option", { name: /Go to Squad/ })).toBeVisible();
  await expect(dialog.locator('[role="option"][aria-selected="true"]')).toHaveCount(1);

  // Enter dispatches the command: the palette closes and the destination takes
  // semantic focus (per the AC-15 focus policy).
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-focus-id="squad"]')).toBeFocused();

  // Unknown text renders the commands-only empty state; Escape closes the layer
  // and returns focus to what was focused when it opened.
  await pressPrimary(page, "K");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await page.keyboard.type("zzzz-not-a-command");
  await expect(page.getByText("No matching commands")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Command palette" })).not.toBeVisible();
  await expect(page.locator('[data-focus-id="squad"]')).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName ?? null), {
      message: "Escape must never strand focus on document.body",
    })
    .not.toBe("BODY");
});

test("the Squad grid roves by row, toggles selection with Space, and sorts by Tab-order header buttons (AC-28)", async ({
  window: page,
  userDataDir,
}) => {
  await enterCareer(page, userDataDir);
  const table = page.getByRole("table");
  const rows = table.locator("tbody tr");
  await expect(rows.first()).toBeVisible();

  const firstNameButton = rows.nth(0).getByRole("button");
  const secondNameButton = rows.nth(1).getByRole("button");
  const playerName = (await firstNameButton.textContent())!.trim();

  // Row-oriented roving: ArrowDown/ArrowUp move the row focus.
  await firstNameButton.focus();
  await expect(firstNameButton).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(secondNameButton).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(firstNameButton).toBeFocused();

  // Space toggles selection; focus and selection stay separate (aria-selected).
  await page.keyboard.press("Space");
  await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Space");
  await expect(rows.nth(0)).not.toHaveAttribute("aria-selected", "true");

  // Sortable header buttons are native Tab-order buttons; Enter cycles the sort
  // with aria-sort tracking it, and the roving focus survives the reorder by
  // stable player identity (AC-31).
  const ageHeader = table.getByRole("columnheader", { name: "Age" });
  const ageButton = ageHeader.getByRole("button");
  await ageButton.focus();
  await expect(ageButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(ageHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(table.getByRole("button", { name: playerName, exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(ageHeader).toHaveAttribute("aria-sort", "descending");
});

test("Escape closes only the topmost transient layer (AC-20)", async ({
  window: page,
  userDataDir,
}) => {
  // Part 1 — the palette open over nothing: Escape closes it and nothing else.
  await enterCareer(page, userDataDir);
  await pressPrimary(page, "K");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Command palette" })).not.toBeVisible();
  await expect(page.getByText(/players$/)).toBeVisible();

  // Part 2 — the splash is the topmost layer on the first career load and owns
  // Escape (the palette/help layers cannot stack over it by design). Then the
  // open match-day control panel behind an open palette proves the ordering:
  // Escape closes the palette first, then the panel — never both at once.
  await seedBeforeMatchday(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-matchday");

  await pressPrefix(page, "a");
  await expect(page.getByRole("heading", { name: /Tactics/ })).toBeVisible();
  await assignFullTactic(page);

  await pressPrefix(page, "m");
  const start = page.getByRole("button", { name: "Start match" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.focus();
  await page.keyboard.press("Enter");

  const panelToggle = page.getByRole("button", { name: /Tactics & substitutions/ });
  await expect(panelToggle).toBeVisible();
  await panelToggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Team instructions")).toBeVisible();

  // Palette over the open panel…
  await pressPrimary(page, "K");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await expect(page.getByText("Team instructions")).toBeVisible();

  // …the first Escape closes only the palette, leaving the panel open…
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Command palette" })).not.toBeVisible();
  await expect(page.getByText("Team instructions")).toBeVisible();

  // …and the second Escape closes the panel (never a navigation away).
  await page.keyboard.press("Escape");
  await expect(page.getByText("Team instructions")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Match day" })).toBeVisible();
});