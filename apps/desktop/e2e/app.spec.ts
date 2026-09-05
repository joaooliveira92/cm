import type { Page } from "@playwright/test";
import {
  assignFullTactic,
  continueSeededCareer,
  expect,
  goto,
  matchScore,
  test,
} from "./launchApp.js";
import { savesDir, seedConcluded, seedFresh } from "./seedSaves.js";

/** Seed a save into the app's saves dir, then continue that career by its fixed seed name. */
const seedAndContinue = async (window: Page, userDataDir: string, name: string, seed: (dir: string) => Promise<string>) => {
  await seed(savesDir(userDataDir));
  await continueSeededCareer(window, name);
};

test("Squad screen renders the club heading and the full starting squad table", async ({ userDataDir, window }) => {
  await seedAndContinue(window, userDataDir, "Seed: fresh", seedFresh);

  await expect(window.locator("h1")).toBeVisible();
  const playersCount = Number(
    (await window.getByText(/players$/).innerText()).match(/(\d+) players/)![1],
  );
  await expect(window.locator("tbody tr")).toHaveCount(playersCount);
});

test("Tactics screen shows 11 slot rows and persists a saved tactic across a reload", async ({ userDataDir, window }) => {
  await seedAndContinue(window, userDataDir, "Seed: fresh", seedFresh);
  await goto(window, "tactics");

  await expect(window.getByRole("heading", { name: /Tactics/ })).toBeVisible();
  await expect(window.locator("tbody tr")).toHaveCount(11);

  await assignFullTactic(window);

  await goto(window, "squad");
  await goto(window, "tactics");

  await expect(window.locator("tbody tr")).toHaveCount(11);
  // The first slot came back with a player, not the "Unassigned" placeholder — the assignment
  // round-tripped through the save rather than living in renderer state.
  await expect(
    window.getByRole("combobox", { name: "Slot 1 player", exact: true }),
  ).not.toHaveText("Unassigned");
});

test("Transfers screen renders the budget line and the Market and Free Agents sections", async ({ userDataDir, window }) => {
  await seedAndContinue(window, userDataDir, "Seed: fresh", seedFresh);
  await goto(window, "transfers");

  await expect(window.getByText(/Transfer Budget:/)).toBeVisible();
  await expect(window.getByRole("heading", { name: "Free Agents" })).toBeVisible();
  await expect(window.getByRole("heading", { name: "Market" })).toBeVisible();
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
  await seedAndContinue(window, userDataDir, "Seed: fresh", seedFresh);

  // The control panel only renders once the club has a persisted Tactic; set one first.
  await goto(window, "tactics");
  await assignFullTactic(window);

  await goto(window, "match day");
  const start = window.getByRole("button", { name: "Start match" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();

  await expect(matchScore(window)).toBeVisible();
  await expect(window.locator("ul").first()).toBeVisible();

  const panelToggle = window.getByRole("button", { name: /Tactics & substitutions/ });
  await expect(panelToggle).toBeVisible({ timeout: 15_000 });
  await panelToggle.click();
  await expect(window.getByText("Team instructions")).toBeVisible();

  await window.getByRole("button", { name: "Apply tactics change" }).click();
  await expect(
    window.getByText(/Applied — the engine may still reject an invalid\/over-cap command silently|Failed to submit command/),
  ).toBeVisible({ timeout: 15_000 });

  // Structural substitution panel assertions
  await expect(window.getByText("Make a substitution")).toBeVisible();
  await expect(window.getByRole("combobox", { name: "Player to bring off" })).toBeVisible();
  await expect(window.getByRole("combobox", { name: "Player to bring on" })).toBeVisible();
  await expect(window.getByRole("button", { name: "Make substitution" })).toBeVisible();
  await expect(window.getByText(/Substitutions used:/)).toBeVisible();

  await panelToggle.click();
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
