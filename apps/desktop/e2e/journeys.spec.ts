import {
  assignFullTactic,
  continueSeededCareer,
  expect,
  pressPrefix,
  saveEntry,
  test,
} from "./launchApp.js";
import { savesDir, seedBeforeMatchday, seedFresh } from "./seedSaves.js";

/** Strip thousands separators and units, e.g. "1,250,000 Cr" -> 1250000. */
const parseCr = (text: string) => Number(text.replace(/[^\d]/g, ""));

/** The budget line is one `<p>` holding several numbers; pull out only the Transfer Budget one. */
const parseTransferBudget = (text: string) =>
  parseCr(text.match(/Transfer Budget:\s*([\d,]+)/)?.[1] ?? "");

test("a career is created end to end at the club the player picked", async ({ window: page }) => {
  // The whole loop over the shipped app: choose a club, review it, commit, and arrive in the
  // career at that club. Before the club-selection effort this was unreachable — the renderer
  // shipped a placeholder club id no club matched — so this journey is also the regression test
  // for the placeholder coming back.
  await page.getByRole("button", { name: "Start New Career" }).click();
  await expect(page.getByRole("heading", { name: "New Career" })).toBeVisible();

  // Step 1 — the scope the world is generated at, which is the gate on generation.
  const continueLeagues = page.getByRole("button", { name: /^Continue/ });
  await expect(continueLeagues).toBeEnabled({ timeout: 30_000 });
  await continueLeagues.click();

  await page.getByPlaceholder("My Career").fill("Journey Career");
  await page.getByRole("button", { name: "Next: Manager Identity" }).click();
  await page.getByRole("button", { name: "Next: Select Club" }).click();

  const rail = page.getByRole("table", { name: "Clubs" });
  await expect(rail).toBeVisible({ timeout: 30_000 });

  // The assist is keyboard-reachable from the table: Tab out of the rail lands on it.
  const firstRow = rail.getByRole("row").filter({ has: page.locator('[role="cell"]') }).first();
  await firstRow.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Pick a team for me" })).toBeFocused();

  // Pick by hand — Enter on the focused row, the table's primary action.
  await firstRow.focus();
  await page.keyboard.press("Enter");
  await expect(firstRow).toHaveAttribute("aria-selected", "true");
  const clubName = (await firstRow.locator("span").first().textContent())!.trim();

  await page.getByRole("button", { name: "Next: Review" }).click();
  await expect(page.getByRole("heading", { name: "Review Career" })).toBeVisible();
  await expect(page.getByText("Club:")).toBeVisible();
  await expect(page.getByText(clubName, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create Career" }).click();

  // Arrival in the career, at the club that was picked — the chrome reads the user club from
  // the save, so this fails if `commitCareer` marked the wrong club or none at all. The
  // first-run teaching splash opens over this; it is deliberately left up, because visibility
  // here is a render assertion and dismissing it would add a modal round trip this journey is
  // not about.
  await expect(page.getByText(/players$/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(clubName).first()).toBeVisible();
});

test("a save persists across app restarts", async ({ userDataDir, launchExtraApp }) => {
  // The persistence claim is proven over a real seeded save rather than a created one: it
  // survives a relaunch, remains listed, and continues into the same career state. Creating a
  // career end to end is the journey above.
  await seedFresh(savesDir(userDataDir));

  // Twice over: the first pass proves the seeded save loads at all, the second that it survived a
  // full process restart. Both passes assert the same thing, which is the point.
  const openTheCareer = async () => {
    const app = await launchExtraApp();
    const window = await app.firstWindow();
    await window.getByRole("button", { name: "Load Career" }).click();
    const entry = saveEntry(window, "Seed: fresh");
    await expect(entry).toBeVisible();
    await entry.click();
    await expect(window.getByText(/players$/)).toBeVisible();
    await app.close();
  };

  await openTheCareer();
  await openTheCareer();
});

test("a substitution is driven by keyboard through the match day live control panel (AC-33)", async ({
  window: page,
  userDataDir,
}) => {
  // This also stands as the "saved tactic reaches the live control panel" journey: the panel only
  // renders for a club with a persisted Tactic, so reaching a substitution proves the carry.
  await seedBeforeMatchday(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-matchday");

  await pressPrefix(page, "a");
  await expect(page.getByRole("heading", { name: /Tactics/ })).toBeVisible();
  await expect(page.locator('[data-focus-id="tactics"]')).toBeFocused();
  await assignFullTactic(page);

  await pressPrefix(page, "d");
  await expect(page.getByRole("heading", { name: "Match day" })).toBeVisible();
  await expect(page.locator('[data-focus-id="match"]')).toBeFocused();

  const start = page.getByRole("button", { name: "Start match" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.focus();
  await expect(start).toBeFocused();
  await page.keyboard.press("Enter");

  const panelToggle = page.getByRole("button", { name: /Tactics & substitutions/ });
  await expect(panelToggle).toBeVisible();
  await panelToggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Team instructions")).toBeVisible();

  // The tactics command first — the carried tactic is what the engine is being asked to change.
  const apply = page.getByRole("button", { name: "Apply tactics change" });
  await apply.focus();
  await expect(apply).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Applied — the engine may still reject/)).toBeVisible({
    timeout: 15_000,
  });

  // Two-step substitution: the draft starts gated and only confirms once both steps are chosen
  // (the caps line is the server-reported state on screen).
  const off = page.getByRole("combobox", { name: "Player to bring off" });
  const on = page.getByRole("combobox", { name: "Player to bring on" });
  const makeSub = page.getByRole("button", { name: "Make substitution" });
  await expect(makeSub).toBeDisabled();

  for (const combobox of [off, on]) {
    await combobox.focus();
    await expect(combobox).toBeFocused();
    await page.keyboard.press("Enter");
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    // Option 0 is the "Select player" placeholder; option 1 is the first real player.
    await listbox.getByRole("option").nth(1).click();
    await expect(listbox).toHaveCount(0);
  }

  await expect(makeSub).toBeEnabled();
  await makeSub.focus();
  await expect(makeSub).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByText(/Substitutions used:/)).toBeVisible({ timeout: 15_000 });
});

// Not covered here: "advancing the calendar through the UI reaches a Season Summary verdict".
// Measured 2026-09-05 — the shipped Advance Calendar button steps straight from
// "Season 1 · 22 May 2027" to "Season 2 · Pre-season" in a single advance. The `season_complete`
// phase is never rendered, and the button (which `LeagueTableScreen` disables on that phase) stays
// enabled through the rollover, so there is no moment a player or a test can observe the season
// concluding. `seedConcluded` reaches the phase through `advanceCalendar` directly, and
// `app.spec.ts` "Season Summary screen shows a verdict for a concluded, seeded save" asserts the
// verdict from it — so the verdict itself stays covered.
// The skipped-conclusion behaviour is filed at .scratch/season-rollover-skips-conclusion/.

test("a transfer bid settles and the budget reflects the spend (keyboard)", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  // g t → Transfers, with semantic focus landing on the screen region.
  await pressPrefix(page, "t");
  await expect(page.getByRole("heading", { name: /Transfers/ })).toBeVisible();
  await expect(page.locator('[data-focus-id="transfers"]')).toBeFocused();

  const budgetLine = page.locator("p", { hasText: "Transfer Budget:" });
  await expect(budgetLine).toBeVisible();
  const before = parseTransferBudget((await budgetLine.textContent()) ?? "");

  const market = page
    .getByRole("heading", { name: "Market", exact: true })
    .locator("xpath=ancestor::section");
  const firstRow = market.locator("tbody tr").first();
  const playerName = (await firstRow.locator("td").nth(0).textContent())!.trim();
  const value = parseCr((await firstRow.locator("td").nth(4).textContent()) ?? "");

  // Keyboard through the level-3 grid: rove to the first Market row, select it
  // with Space (AC-28 style roving + selection), type the bid amount (AC-29's
  // contextual region), and submit with Enter on the Bid control.
  const rowButton = market.getByRole("button", { name: playerName, exact: true });
  await rowButton.focus();
  await expect(rowButton).toBeFocused();
  await page.keyboard.press("Space");
  await expect(firstRow).toHaveAttribute("aria-selected", "true");

  const region = page.getByRole("region", { name: "Place bid" });
  const amount = region.getByPlaceholder("Amount");
  await amount.focus();
  await expect(amount).toBeFocused();
  await page.keyboard.type(String(value));

  const bid = region.getByRole("button", { name: "Bid" });
  await bid.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Bid: done\./)).toBeVisible();

  const outgoing = page
    .getByRole("heading", { name: "Outgoing Bids" })
    .locator("xpath=ancestor::section");
  const bidRow = outgoing.getByRole("row").filter({ hasText: playerName });
  await expect(bidRow.locator("td").nth(4)).toHaveText("accepted");
  await expect(bidRow.locator("td").nth(2)).toHaveText(`${value.toLocaleString()} Cr`);

  const after = parseTransferBudget((await budgetLine.textContent()) ?? "");
  expect(after).toBe(before - value);
});
