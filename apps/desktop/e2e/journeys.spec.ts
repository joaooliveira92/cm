import { assignFullTactic, expect, launchApp, test } from "./launchApp.js";
import { savesDir, seedBeforeMatchday, seedBeforeSeasonEnd, seedFresh } from "./seedSaves.js";

/** Strip thousands separators and units, e.g. "1,250,000 Cr" -> 1250000. */
const parseCr = (text: string) => Number(text.replace(/[^\d]/g, ""));

/** The budget line is one `<p>` holding several numbers; pull out only the Transfer Budget one. */
const parseTransferBudget = (text: string) =>
  parseCr(text.match(/Transfer Budget:\s*([\d,]+)/)?.[1] ?? "");

test("a save persists across app restarts", async ({ userDataDir }) => {
  const firstApp = await launchApp(userDataDir);
  const firstWindow = await firstApp.firstWindow();

  await firstWindow.getByPlaceholder("Save name").fill("Persisted Career");
  await firstWindow.getByRole("button", { name: "Create" }).click();
  await expect(firstWindow.getByRole("button", { name: "Persisted Career" })).toBeVisible();

  await firstApp.close();

  const relaunched = await launchApp(userDataDir);
  const relaunchedWindow = await relaunched.firstWindow();

  await relaunchedWindow.getByRole("button", { name: "Persisted Career" }).click();
  await expect(relaunchedWindow.getByText(/players$/)).toBeVisible();

  await relaunched.close();
});

test("a saved tactic is carried into the Matchday live control panel", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeMatchday(savesDir(userDataDir));
  await page.reload();
  await page.getByRole("button", { name: "Seed: before-matchday" }).click();

  // Save a full, valid tactic on the Tactics screen.
  await page.getByRole("button", { name: "tactics", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Tactics/ })).toBeVisible();
  const rows = page.locator("tbody tr");
  await assignFullTactic(rows);

  // Start a match, open the live control panel, and submit a command.
  await page.getByRole("button", { name: "match day", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Match day" })).toBeVisible();
  await page.getByRole("button", { name: "Start match" }).click();

  const panelToggle = page.getByRole("button", { name: /Tactics & substitutions/ });
  await expect(panelToggle).toBeVisible();
  const toggleText = await panelToggle.textContent();
  if (toggleText?.includes("Show")) await panelToggle.click();

  await page.getByRole("button", { name: "Apply tactics change" }).click();
  await expect(page.getByText(/Applied — the engine may still reject/)).toBeVisible();
});

test("a substitution can be made through the match day live control panel", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeMatchday(savesDir(userDataDir));
  await page.reload();
  await page.getByRole("button", { name: "Seed: before-matchday" }).click();

  await page.getByRole("button", { name: "tactics", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Tactics/ })).toBeVisible();
  await assignFullTactic(page.locator("tbody tr"));

  await page.getByRole("button", { name: "match day", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Match day" })).toBeVisible();
  await page.getByRole("button", { name: "Start match" }).click();

  const panelToggle = page.getByRole("button", { name: /Tactics & substitutions/ });
  await expect(panelToggle).toBeVisible();
  const toggleText = await panelToggle.textContent();
  if (toggleText?.includes("Show")) await panelToggle.click();

  const offSelect = page.locator("select").nth(0);
  const onSelect = page.locator("select").nth(1);
  await offSelect.selectOption({ index: 1 });
  await onSelect.selectOption({ index: 1 });
  await page.getByRole("button", { name: "Make substitution" }).click();
  await expect(
    page.getByText(/Applied — the engine may still reject/),
  ).toBeVisible();
});

test("advancing the calendar to season conclusion surfaces a Season Summary verdict", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeSeasonEnd(savesDir(userDataDir));
  await page.reload();
  await page.getByRole("button", { name: "Seed: before-season-end" }).click();

  await page.getByRole("button", { name: "league table", exact: true }).click();
  const advance = page.getByRole("button", { name: "Advance Calendar" });
  for (let i = 0; i < 4 && (await page.getByText(/season complete/i).count()) === 0; i++) {
    await advance.click();
    await expect(advance).toHaveText("Advance Calendar");
  }
  await expect(page.getByText(/season complete/i)).toBeVisible();

  await page.getByRole("button", { name: "season summary", exact: true }).click();
  await expect(page.getByText(/Verdict: (Exceeded|Met|Missed)/)).toBeVisible();
});

test("a transfer bid settles and the budget reflects the spend", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await page.reload();
  await page.getByRole("button", { name: "Seed: fresh" }).click();

  await page.getByRole("button", { name: "transfers", exact: true }).click();

  const budgetLine = page.locator("p", { hasText: "Transfer Budget:" });
  await expect(budgetLine).toBeVisible();
  const before = parseTransferBudget(await budgetLine.textContent());

  const market = page
    .getByRole("heading", { name: "Market", exact: true })
    .locator("xpath=ancestor::section");
  const firstRow = market.locator("tbody tr").first();
  const playerName = (await firstRow.locator("td").nth(0).textContent())!.trim();
  const value = parseCr(await firstRow.locator("td").nth(4).textContent());

  await firstRow.locator("input").fill(String(value));
  await firstRow.getByRole("button", { name: "Bid" }).click();
  await expect(page.getByText(/Bid: done\./)).toBeVisible();

  const outgoing = page
    .getByRole("heading", { name: "Outgoing Bids" })
    .locator("xpath=ancestor::section");
  const bidRow = outgoing.getByRole("row").filter({ hasText: playerName });
  await expect(bidRow.locator("td").nth(4)).toHaveText("accepted");
  await expect(bidRow.locator("td").nth(2)).toHaveText(`${value.toLocaleString()} Cr`);

  const after = parseTransferBudget(await budgetLine.textContent());
  expect(after).toBe(before - value);
});