import type { Page } from "@playwright/test";
import {
  assignFullTactic,
  chooseOption,
  chooseToolbarOption,
  continueSeededCareer,
  expect,
  goto,
  matchScore,
  openLivePanel,
  openTacticsEditor,
  optionLabels,
  test,
} from "./launchApp.js";
import { savesDir, seedBeforeMatchday, seedConcluded, seedFresh } from "./seedSaves.js";

/** Seed a save into the app's saves dir, then continue that career by its fixed seed name. */
const seedAndContinue = async (window: Page, userDataDir: string, name: string, seed: (dir: string) => Promise<string>) => {
  await seed(savesDir(userDataDir));
  await continueSeededCareer(window, name);
};

test("Squad opens on the position list and the View selector swaps it for a table of the same squad", async ({ userDataDir, window }) => {
  await seedAndContinue(window, userDataDir, "Seed: fresh", seedFresh);

  await expect(window.locator("h1")).toBeVisible();
  const playersCount = Number(
    (await window.getByText(/players$/).innerText()).match(/(\d+) players/)![1],
  );

  // The career opens on the two-column position list: every player, no table.

  await expect(window.locator("tbody")).toHaveCount(0);
  await expect(window.locator("li:has(button[data-focus-id])")).toHaveCount(playersCount);

  // A view change alters presentation only — the same squad, drawn as a table.
  await chooseToolbarOption(window, "Squad view", "General Info");
  await expect(window.getByRole("heading", { name: "Players (General Info)" })).toBeVisible();
  await expect(window.locator("tbody tr")).toHaveCount(playersCount);
  await expect(window.getByRole("columnheader", { name: "Nationality" })).toBeVisible();
});

/** The position list's row names, in the order the two columns read them. */
const positionListNames = (window: Page) =>
  window.locator("li button[data-focus-id]").allInnerTexts();

/** The given rows in the order the Name sort puts them in. A list row reads
 *  "Last, First" while the Name column sorts on "First Last", so the two are not
 *  the same string order and the expected one has to be built, not eyeballed. */
const byNameOrder = (rows: ReadonlyArray<string>): string[] => {
  const key = (row: string): string => {
    const [last, first] = row.split(", ");
    return `${first} ${last}`;
  };
  return [...rows].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
};

test("the position list's Sort control reorders the list, flips on a re-pick, and is the list's alone", async ({ userDataDir, window }) => {
  await seedAndContinue(window, userDataDir, "Seed: fresh", seedFresh);

  // The list is the one layout with no header to click, so it is the one the
  // toolbar's Sort control exists for.
  const unsorted = await positionListNames(window);
  expect(unsorted.length).toBeGreaterThan(1);
  expect(await optionLabels(window, "Sort squad")).toEqual([
    "Positions",
    "Name",
    "Age",
    "OVR",
    "Condition",
    "Wage",
    "Contract ends",
    "Transfer Value",
  ]);

  // The expected order is built from the *unsorted* rows, before the sort is
  // ever applied. Deriving it from the sorted rows instead would let a sort
  // that silently became a no-op pass, by always agreeing with whatever order
  // the list happened to be in. Pinning the first row by name does the same job
  // from the other side: an anchor the sorted list has to actually produce.
  const expected = byNameOrder(unsorted);
  // Guards the guard: if the seed ever draws a squad already in name order, the
  // two assertions below would hold for free, and this says so instead.
  expect(expected).not.toEqual(unsorted);
  const anchor = expected[0];

  await chooseOption(window, "Sort squad", "Name");
  const ascending = await positionListNames(window);
  expect(ascending).toEqual(expected);
  expect(ascending[0]).toBe(anchor);
  // The same cycle a column header gives: the same option again reverses it.
  await chooseOption(window, "Sort squad", "Name");
  expect(await positionListNames(window)).toEqual([...ascending].reverse());

  // A table's headers are its sort control, so the toolbar offers no second one
  // there — and the sort made in the list is still in force when the table draws.
  await chooseToolbarOption(window, "Squad view", "Contract");
  await expect(window.getByRole("combobox", { name: "Sort squad" })).toHaveCount(0);
  await expect(window.locator("tbody tr")).toHaveCount(ascending.length);

  await chooseToolbarOption(window, "Squad view", "Traditional");
  await expect(window.getByRole("combobox", { name: "Sort squad" })).toContainText("Name");
  expect(await positionListNames(window)).toEqual([...ascending].reverse());
});

test("Tactics opens on the read-only overview; the editor is one step away and the save persists", async ({ userDataDir, window }) => {
  await seedAndContinue(window, userDataDir, "Seed: fresh", seedFresh);
  await goto(window, "tactics");

  // Opening Tactics shows the overview, not the editor (ticket 03) — a fresh career has no
  // Tactic, so the overview says so instead of presenting eleven slots to edit.
  await expect(window.getByRole("heading", { name: "Tactics Overview" })).toBeVisible();
  await expect(window.locator("tbody")).toHaveCount(0);
  await expect(window.getByText("No tactic saved — set one to prepare.")).toBeVisible();

  // The editor is one step from the overview; the assignment round-trips through the save.
  await openTacticsEditor(window);
  await expect(window.locator("tbody tr")).toHaveCount(11);
  await assignFullTactic(window);

  // Returning to the overview reads the saved snapshot: the formation is named, the starters are
  // a real selection, and the no-tactic issue cleared.
  await goto(window, "squad");
  await goto(window, "tactics");
  await expect(window.getByRole("heading", { name: "Tactics Overview" })).toBeVisible();
  await expect(window.getByText(/starters · \d+ substitutes/)).toBeVisible();
  await expect(window.getByText("No Tactic set.")).toHaveCount(0);
});

test("Transfers screen renders the budget line and one tab per table, opening on the Market", async ({ userDataDir, window }) => {
  await seedAndContinue(window, userDataDir, "Seed: fresh", seedFresh);
  await goto(window, "transfers");

  await expect(window.getByText(/Transfer Budget:/)).toBeVisible();
  const tabs = window.getByRole("tablist", { name: "Transfer tables" }).getByRole("tab");
  await expect(tabs).toHaveText(["Incoming Bids", "Outgoing Bids", "Free Agents", "Market"]);
  await expect(window.getByRole("tab", { name: "Market" })).toHaveAttribute("aria-selected", "true");
  await expect(window.getByRole("table", { name: "Market" })).toBeVisible();
});

test("League Table screen shows the 20-row table", async ({ userDataDir, window }) => {
  await seedAndContinue(window, userDataDir, "Seed: fresh", seedFresh);
  await goto(window, "league table");

  await expect(window.getByRole("heading", { name: "League Table" })).toBeVisible();
  await expect(window.locator("tbody tr")).toHaveCount(20);
});

test("Fixtures screen renders the fixture list", async ({ userDataDir, window }) => {
  await seedAndContinue(window, userDataDir, "Seed: fresh", seedFresh);
  await goto(window, "fixtures");

  await expect(window.getByRole("heading", { name: "Fixtures" })).toBeVisible();
  // The list groups by round with a date header ("1 Aug 2026 · Round 1").
  await expect(window.getByText(/· Round \d+/).first()).toBeVisible();
});

test("Match Day starts a match, reveals a feed, and applies a live control command", async ({ userDataDir, window }) => {
  // A match is only startable at the pre-match boundary: a pre-season save has no Fixture waiting.
  await seedAndContinue(window, userDataDir, "Seed: before-matchday", seedBeforeMatchday);

  // The control panel only renders once the club has a persisted Tactic; set one first.
  await goto(window, "tactics");
  await openTacticsEditor(window);
  await assignFullTactic(window);

  await goto(window, "match day");
  const start = window.getByRole("button", { name: "Play match" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();

  await expect(matchScore(window)).toBeVisible();
  await expect(window.locator("ul").first()).toBeVisible();

  await openLivePanel(window);
  await expect(window.getByText("Team instructions")).toBeVisible();

  await window.getByRole("button", { name: "Apply tactics change" }).click();
  // Either definitive outcome, never the pending line: a tactics change journals as "Accepted" (no
  // count can confirm it) and a failed call reads "Rejected — <reason>" (commandStatus.ts).
  await expect(
    window.getByText(/Accepted — the change takes effect from the current minute\.|Rejected — /),
  ).toBeVisible({ timeout: 15_000 });

  // Structural substitution panel assertions
  await expect(window.getByText("Make a substitution")).toBeVisible();
  await expect(window.getByRole("combobox", { name: "Player to bring off" })).toBeVisible();
  await expect(window.getByRole("combobox", { name: "Player to bring on" })).toBeVisible();
  await expect(window.getByRole("button", { name: "Make substitution" })).toBeVisible();
  await expect(window.getByText(/Substitutions used:/)).toBeVisible();

  await window.getByRole("button", { name: /Tactics & substitutions/ }).click();
  await expect(window.getByText("Show")).toBeVisible();
});

test("Season Summary screen shows a verdict for a concluded, seeded save", async ({ userDataDir, window }) => {
  await seedAndContinue(window, userDataDir, "Seed: concluded", seedConcluded);
  await goto(window, "season summary");

  await expect(window.getByRole("heading", { name: "Season Summary" })).toBeVisible();
  await expect(window.getByText(/Verdict: (Exceeded|Met|Missed)/)).toBeVisible();
});

// Not covered here, deliberately: match day force-off and the shorthanded UI states. The orange
// injury prompt and "Bring off" button depend on non-deterministic match events from the sim
// engine, unreachable from a seeded save without a deterministic match seed, so there is no e2e
// path to assert. `matchCommands.test.ts` covers ForceOff at the command level. The empty
// `test.skip` that used to stand here reported as a skipped test forever without ever being a
// test. See .agents/notes/implemented/testing/2026-08-28-match-day-structural-extension.md
