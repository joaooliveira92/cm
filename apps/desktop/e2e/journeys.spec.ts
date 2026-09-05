import {
  assignFullTactic,
  dismissTeachingSplash,
  expect,
  launchApp,
  pressPrefix,
  test,
} from "./launchApp.js";
import { savesDir, seedBeforeMatchday, seedBeforeSeasonEnd, seedFresh } from "./seedSaves.js";

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

test("a save persists across app restarts", async ({ userDataDir }) => {
  // The persistence claim is proven over a real seeded save rather than a created one: it
  // survives a relaunch, remains listed, and continues into the same career state. Creating a
  // career end to end is the journey above.
  await seedFresh(savesDir(userDataDir));

  const firstApp = await launchApp(userDataDir);
  const firstWindow = await firstApp.firstWindow();
  await firstWindow.getByRole("button", { name: "Load Career" }).click();
  await firstWindow.getByRole("button", { name: "Seed: fresh" }).click();
  await expect(firstWindow.getByText(/players$/)).toBeVisible();

  await firstApp.close();

  const relaunched = await launchApp(userDataDir);
  const relaunchedWindow = await relaunched.firstWindow();
  await relaunchedWindow.getByRole("button", { name: "Load Career" }).click();
  await relaunchedWindow.getByRole("button", { name: "Seed: fresh" }).click();
  await expect(relaunchedWindow.getByText(/players$/)).toBeVisible();

  await relaunched.close();
});

test("a saved tactic is carried into the Matchday live control panel (keyboard)", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeMatchday(savesDir(userDataDir));
  await page.reload();
  await page.getByRole("button", { name: "Load Career" }).click();
  await page.getByRole("button", { name: "Seed: before-matchday" }).click();
  await dismissTeachingSplash(page);

  // g a → Tactics; save a full, valid tactic there (the level-3 route is driven
  // by keyboard, with semantic focus landing on the screen region).
  await pressPrefix(page, "a");
  await expect(page.getByRole("heading", { name: /Tactics/ })).toBeVisible();
  await expect(page.locator('[data-focus-id="tactics"]')).toBeFocused();
  await assignFullTactic(page.locator("tbody tr"));

  // g m → Match Day; start the match and open the live control panel through
  // the focused controls (Enter activates, never a pointer).
  await pressPrefix(page, "m");
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

  const apply = page.getByRole("button", { name: "Apply tactics change" });
  await apply.focus();
  await expect(apply).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Applied — the engine may still reject/)).toBeVisible({
    timeout: 15_000,
  });
});

test("a substitution is driven by keyboard through the match day live control panel (AC-33)", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeMatchday(savesDir(userDataDir));
  await page.reload();
  await page.getByRole("button", { name: "Load Career" }).click();
  await page.getByRole("button", { name: "Seed: before-matchday" }).click();
  await dismissTeachingSplash(page);

  await pressPrefix(page, "a");
  await expect(page.getByRole("heading", { name: /Tactics/ })).toBeVisible();
  await assignFullTactic(page.locator("tbody tr"));

  await pressPrefix(page, "m");
  await expect(page.getByRole("heading", { name: "Match day" })).toBeVisible();
  const start = page.getByRole("button", { name: "Start match" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.focus();
  await page.keyboard.press("Enter");

  const panelToggle = page.getByRole("button", { name: /Tactics & substitutions/ });
  await expect(panelToggle).toBeVisible();
  await panelToggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Team instructions")).toBeVisible();

  // Two-step substitution: the controls in the open panel are the only
  // comboboxes; the draft starts gated and Enter confirms only once both steps
  // are chosen (the caps line is the server-reported state on screen).
  const panel = page.locator("section").filter({ hasText: "Make a substitution" });
  const off = panel.getByRole("combobox").nth(0);
  const on = panel.getByRole("combobox").nth(1);
  const makeSub = panel.getByRole("button", { name: "Make substitution" });
  await expect(makeSub).toBeDisabled();

  await off.focus();
  await expect(off).toBeFocused();
  await off.selectOption({ index: 1 });

  await on.focus();
  await expect(on).toBeFocused();
  await on.selectOption({ index: 1 });

  await expect(makeSub).toBeEnabled();
  await makeSub.focus();
  await expect(makeSub).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByText(/Applied — the engine may still reject/)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/Substitutions used:/)).toBeVisible();
});

test("advancing the calendar to season conclusion surfaces a Season Summary verdict", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeSeasonEnd(savesDir(userDataDir));
  await page.reload();
  await page.getByRole("button", { name: "Load Career" }).click();
  await page.getByRole("button", { name: "Seed: before-season-end" }).click();
  await dismissTeachingSplash(page);

  await page.getByRole("button", { name: "league table", exact: true }).click();
  const advance = page.getByRole("button", { name: "Advance Calendar" });
  for (let i = 0; i < 4 && (await page.getByText(/season complete/i).count()) === 0; i++) {
    await advance.click();
    // The League screen renders the Advance-calendar button with its inline key
    // badge ("c" + "Advance Calendar"); the old exact-text wait is updated to a
    // contains match so it cannot race the "Advancing..." label.
    await expect(advance).toContainText("Advance Calendar");
  }
  await expect(page.getByText(/season complete/i)).toBeVisible();

  await page.getByRole("button", { name: "season summary", exact: true }).click();
  await expect(page.getByText(/Verdict: (Exceeded|Met|Missed)/)).toBeVisible();
});

test("a transfer bid settles and the budget reflects the spend (keyboard)", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await page.reload();
  await page.getByRole("button", { name: "Load Career" }).click();
  await page.getByRole("button", { name: "Seed: fresh" }).click();
  await dismissTeachingSplash(page);

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