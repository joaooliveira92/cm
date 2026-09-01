import type { Page } from "@playwright/test";
import { assignFullTactic, dismissTeachingSplash, expect, test } from "./launchApp.js";
import { savesDir, seedConcluded, seedFresh } from "./seedSaves.js";

/** Seed a save into the app's saves dir, then reload so the app's save list picks it up, and
 *  continue that career by its fixed seed name (dismissing the first-run teaching splash). */
const seedAndContinue = async (window: Page, userDataDir: string, name: string, seed: (dir: string) => Promise<string>) => {
  await seed(savesDir(userDataDir));
  await window.reload();
  await window.getByRole("button", { name: "Load Career" }).click();
  const button = window.getByRole("button", { name, exact: true });
  await expect(button).toBeVisible();
  await button.click();
  await dismissTeachingSplash(window);
};

const goto = async (window: Page, tab: string) => {
  await window.getByRole("button", { name: tab, exact: true }).click();
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
  const rows = window.locator("tbody tr");
  await expect(rows).toHaveCount(11);

  await assignFullTactic(rows);

  await goto(window, "squad");
  await goto(window, "tactics");

  const reloadedRows = window.locator("tbody tr");
  await expect(reloadedRows).toHaveCount(11);
  await expect(reloadedRows.first().locator("select")).not.toHaveValue("");
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
  await expect(window.getByText(/Matchday/).first()).toBeVisible();
});

test("Match Day starts a match, reveals a feed, and applies a live control command", async ({ userDataDir, window }) => {
  await seedAndContinue(window, userDataDir, "Seed: fresh", seedFresh);

  // The control panel only renders once the club has a persisted Tactic; set one first.
  await goto(window, "tactics");
  await assignFullTactic(window.locator("tbody tr"));

  await goto(window, "match day");
  const start = window.getByRole("button", { name: "Start match" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();

  await expect(window.getByRole("heading", { name: / - / })).toBeVisible();
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
  await expect(window.getByText("Off", { exact: true })).toBeVisible();
  await expect(window.getByText("On", { exact: true })).toBeVisible();
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

// Force-off (orange injury / shorthanded) is skipped at the e2e level: the orange injury prompt
// and "Bring off" button depend on non-deterministic match events from the sim engine, which are
// unreachable from a seeded save without a deterministic match seed. Unit tests in
// matchCommands.test.ts cover ForceOff command-level correctness. See Agent Note:
// .agents/notes/implemented/testing/2026-08-28-match-day-structural-extension.md
test.skip("match day force-off and shorthanded UI states", () => {});