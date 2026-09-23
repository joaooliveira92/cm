import {
  assignFullTactic,
  nameBench,
  closeOrKill,
  continueSeededCareer,
  dismissTeachingSplash,
  expect,
  matchScore,
  openLivePanel,
  openTacticsEditor,
  pressItemKey,
  pressSectionKey,
  saveEntry,
  test,
} from "./launchApp.js";
import type { Page } from "@playwright/test";
import { savesDir, seedBeforeMatchday, seedFresh } from "./seedSaves.js";

/** Match day's copy for a match read back after a restart (`RESTARTED_FROM_KICKOFF`, group-g 33). */
const RESTARTED_FROM_KICKOFF = "The app was closed mid-match, so this match has restarted from kickoff.";

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
  // The club name, not the badge's initials span that now leads the row.
  const clubName = (await firstRow.locator("span.block").first().textContent())!.trim();

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
    // Not `app.close()`: Playwright closes through `app.quit()`, which the quit guard holds
    // open waiting for the player to confirm. `closeOrKill` confirms the guard first. The save
    // was committed by the seed before launch, and the second pass proves it survived the restart.
    await closeOrKill(app);
  };

  await openTheCareer();
  await openTheCareer();
});

test("a match started before an app restart resumes live on Match day, says it restarted from kickoff, and plays to an accepted result (group-g 37, 33)", async ({
  userDataDir,
  launchExtraApp,
}) => {
  // Two launches, a tactic, and a whole match at the live reveal pace.
  test.setTimeout(150_000);
  await seedBeforeMatchday(savesDir(userDataDir));

  const openMatchDay = async (page: Page) => {
    await pressItemKey(page, "analysis", "analysis-match");
    await expect(page.getByRole("heading", { name: "Match day" })).toBeVisible();
  };

  const first = await launchExtraApp();
  const page = await first.firstWindow();
  await continueSeededCareer(page, "Seed: before-matchday");
  await pressSectionKey(page, "tactics");
  await openTacticsEditor(page);
  await assignFullTactic(page);
  await openMatchDay(page);
  const play = page.getByRole("button", { name: "Play match" });
  await expect(play).toBeEnabled({ timeout: 15_000 });
  await play.click();
  await expect(matchScore(page)).toBeVisible({ timeout: 15_000 });
  // Started in this process, so nothing to say about a restart.
  await expect(page.getByText(RESTARTED_FROM_KICKOFF)).toHaveCount(0);
  // Mid-match: the match is started and its result not accepted, which is what the save keeps.
  await closeOrKill(first);

  const second = await launchExtraApp();
  const relaunched = await second.firstWindow();
  await relaunched.getByRole("button", { name: "Load Career" }).click();
  await saveEntry(relaunched, "Seed: before-matchday").click();
  await expect(relaunched.getByText(/players$/)).toBeVisible();
  await dismissTeachingSplash(relaunched);
  await openMatchDay(relaunched);

  // The live feed, not the Kickoff panel whose Play would only be refused as already started.
  await expect(matchScore(relaunched)).toBeVisible({ timeout: 15_000 });
  await expect(relaunched.getByRole("button", { name: "Play match" })).toHaveCount(0);
  await expect(relaunched.getByRole("button", { name: "Quick result" })).toHaveCount(0);
  // The replay may differ from what the first launch revealed, so Match day says it started over (33).
  await expect(relaunched.getByRole("status").filter({ hasText: RESTARTED_FROM_KICKOFF })).toBeVisible();

  const accept = relaunched.getByRole("button", { name: "Accept result" });
  await expect(accept).toBeVisible({ timeout: 90_000 });
  await accept.click();
  await expect(relaunched.getByText("Result accepted. Continue to move on.")).toBeVisible({ timeout: 15_000 });
  await expect(relaunched.getByRole("main", { name: "Match day" }).getByRole("alert")).toHaveCount(0);
});

test("a substitution is driven by keyboard through the match day live control panel (AC-33)", async ({
  window: page,
  userDataDir,
}) => {
  // This also stands as the "saved tactic reaches the live control panel" journey: the panel only
  // renders for a club with a persisted Tactic, so reaching a substitution proves the carry.
  await seedBeforeMatchday(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-matchday");

  await pressSectionKey(page, "tactics");
  await expect(page.getByRole("heading", { name: /Tactics/ })).toBeVisible();
  await expect(page.locator('[data-focus-id="tactics"]')).toBeFocused();
  await openTacticsEditor(page);
  await assignFullTactic(page);

  // The editor names starters only, so Match day flags the empty bench, and the match stays
  // playable beside it (group-g 39).
  const noBench = page.getByRole("list", { name: "Before kickoff" }).getByText("No substitutes named");
  await pressItemKey(page, "analysis", "analysis-match");
  await expect(page.getByRole("heading", { name: "Match day" })).toBeVisible();
  await expect(noBench).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Play match" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Quick result" })).toBeEnabled();

  // A substitute comes off the named bench (ticket 35); naming one clears the advisory.
  await nameBench(page);

  await pressItemKey(page, "analysis", "analysis-match");
  await expect(page.getByRole("heading", { name: "Match day" })).toBeVisible();
  await expect(page.locator('[data-focus-id="match"]')).toBeFocused();
  await expect(noBench).toHaveCount(0);

  const start = page.getByRole("button", { name: "Play match" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.focus();
  await expect(start).toBeFocused();
  await page.keyboard.press("Enter");

  await openLivePanel(page, "keyboard");
  await expect(page.getByText("Team instructions")).toBeVisible();

  // The tactics command first — the carried tactic is what the engine is being asked to change.
  const apply = page.getByRole("button", { name: "Apply tactics change" });
  await apply.focus();
  await expect(apply).toBeFocused();
  await page.keyboard.press("Enter");
  // A tactics change has no count to confirm it, so success reads "Accepted", not "Applied".
  await expect(page.getByText(/Accepted — the change takes effect from the current minute\./)).toBeVisible({
    timeout: 15_000,
  });

  // Two-step substitution: the draft starts gated and only confirms once both steps are chosen
  // (the caps line is the server-reported state on screen).
  const off = page.getByRole("combobox", { name: "Player to bring off" });
  const on = page.getByRole("combobox", { name: "Player to bring on" });
  const makeSub = page.getByRole("button", { name: "Make substitution" });
  await expect(makeSub).toBeDisabled();

  // Each slot takes the same two-step UI ride, and every step mutates shared screen state, so the
  // loop must stay sequential — the listbox options for slot *i* only exist once slot *i-1* has
  // confirmed. Two Playwright actions can't share one renderer for the brief interval of a click.
  /* oxlint-disable no-await-in-loop */
  for (const combobox of [off, on]) {
    // oxlint-disable-next-line no-await-in-loop
    await combobox.focus();
    await expect(combobox).toBeFocused();
    await page.keyboard.press("Enter");
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    // Option 0 is the "Select player" placeholder; option 1 is the first real player.
    await listbox.getByRole("option").nth(1).click();
    await expect(listbox).toHaveCount(0);
  }
  /* oxlint-enable no-await-in-loop */

  await expect(makeSub).toBeEnabled();
  await makeSub.focus();
  await expect(makeSub).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByText(/Substitutions used:/)).toBeVisible({ timeout: 15_000 });
});

test("a live substitution is made from the standalone Match Substitutions screen (Screen 97)", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeMatchday(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-matchday");

  await pressSectionKey(page, "tactics");
  await openTacticsEditor(page);
  await assignFullTactic(page);
  // A substitute comes off the named bench (ticket 35), and the Tactics editor names starters only.
  await nameBench(page);

  await pressItemKey(page, "analysis", "analysis-match");
  const start = page.getByRole("button", { name: "Play match" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();

  await page.getByRole("navigation", { name: "Live Match tabs" }).getByRole("tab", { name: "Substitutions" }).click();
  await expect(page.getByRole("heading", { name: "Match Substitutions" })).toBeVisible();
  // The match can already have counted substitutions of its own: a severe injury substitutes from
  // the bench (`forcePlayerOff` in the engine) and the e2e match seed is not pinned. So read the
  // count the screen shows now rather than assuming a fresh 0.
  const subsLine = page.getByText(/Substitutions used: \d+\/\d+/);
  await expect(subsLine).toBeVisible({ timeout: 15_000 });
  const [, usedText, capText] = /Substitutions used: (\d+)\/(\d+)/.exec((await subsLine.textContent()) ?? "") ?? [];
  const usedBefore = Number(usedText);
  const cap = Number(capText);
  expect(
    usedBefore,
    `the match had already used ${usedBefore}/${cap} substitutions before the test acted, so none is left to make`,
  ).toBeLessThan(cap);

  const off = page.getByLabel("Player coming off");
  const on = page.getByLabel("Player coming on");
  // Option 0 is the "Select player" placeholder.
  await off.selectOption({ index: 1 });
  await on.selectOption({ index: 1 });
  await page.getByRole("button", { name: "Make substitution" }).click();

  // A substitution inside the cap: the match response must count it.
  await expect(page.getByRole("status")).toHaveText(/^Applied —/, { timeout: 15_000 });
  await expect(page.getByText(`Substitutions used: ${usedBefore + 1}/${cap}`)).toBeVisible();

  await page.getByRole("button", { name: "Back to Match day" }).click();
  await expect(page.getByRole("heading", { name: "Match day" })).toBeVisible();
});

// Not covered here: "advancing the calendar through the UI reaches a Season Summary verdict".
// Measured 2026-09-05 — a single advance steps straight from "Season 1 · 22 May 2027" to
// "Season 2 · Pre-season". The `season_complete` phase is never rendered, and Continue (which the
// chrome disables on that phase) stays enabled through the rollover, so there is no moment a player
// or a test can observe the season concluding. `seedConcluded` reaches the phase through `advanceCalendar` directly, and
// `app.spec.ts` "Season Summary screen shows a verdict for a concluded, seeded save" asserts the
// verdict from it — so the verdict itself stays covered.
// The skipped-conclusion behaviour is filed at .scratch/season-rollover-skips-conclusion/.

test("a transfer bid settles and the budget reflects the spend (keyboard)", async ({
  window: page,
  userDataDir,
}) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");

  // g 4 → Transfers (Recruitment's default), with semantic focus landing on the screen region.
  await pressSectionKey(page, "recruitment");
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
  // Scoped to the row, not the Market: a random world can hold two Players with the same name.
  const rowButton = firstRow.getByRole("button", { name: playerName, exact: true });
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
