import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedBeforeSeasonEnd } from "./seedSaves.js";

/**
 * Competition Results (Screen 164, group-l ticket 07).
 *
 * **Reached by address, because nothing in the app links to it yet** — and neither does anything
 * link to Screens 162 and 163, which shipped on 2026-09-17 in the same condition. The whole
 * competition branch is URL-only: the World section's Competitions entry is itself still a WIP
 * placeholder. Recorded in group-l ticket 07's answer and owed to ticket 08 (Screen 161, the
 * competition's landing page) and ticket 09.
 *
 * Addressing a route directly is the precedent `performance-report.spec.ts` set for exactly this
 * situation, and `router.spec.ts` does the same. It is a weaker spec than a navigated one — it
 * cannot notice the entry point breaking, because there is none — and it says so here rather than
 * pretending otherwise.
 *
 * The seed plays the English top flight (`DEFAULT_CAREER_INTENTS`), so `comp_eng_1` is the
 * competition the save's fixtures belong to.
 *
 * `seedBeforeSeasonEnd`, deliberately. Pressing Continue does not work — the Calendar stops
 * *before* the human's own Fixture and the control is replaced there rather than disabled — and
 * `seedConcluded` is worse than useless here: it rolls into **Season 2 pre-season**, where the
 * current card is unplayed and this screen correctly shows nothing. Which is itself a finding, and
 * one the ticket records: **Competition Results shows the current Season only**, inheriting
 * `getCompetitionFixtures`' season scope, so a rollover empties it.
 */
test("a competition's results list its played fixtures, newest first", async ({
  window: page,
  userDataDir,
}) => {
  await seedBeforeSeasonEnd(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-season-end");

  await goto(page, "league table");

  await page.evaluate(() => {
    location.hash = location.hash.replace(/\/league.*$/, "/competition/comp_eng_1/results");
  });

  await expect(page.getByRole("main", { name: "Competition Results" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Competition Results", level: 1 })).toBeVisible();

  await expect(page.getByText("WIP — Placeholder screen")).toHaveCount(0);

  // The summary line proves the screen read the card and filtered it, whatever the count. Matched
  // exactly, because the empty-state sentence also contains the word "results".
  const summary = page.getByText(/^Season \d+ · \d+ results?$/);
  await expect(summary).toBeVisible();

  // With results present, the table renders and every row is a played fixture — the filter is the
  // screen's whole job, so a stray "Unplayed" row would mean it did not do it. The newest-first
  // ordering is proved deterministically in `competition-results-screen.test.tsx`; here the
  // schedule is the world's to decide.
  // Deep into the season, so a good part of the card is played and the table is the expected
  // branch. Every row in it is a played fixture — filtering is the screen's whole job, so a stray "Unplayed" row would
  // mean it did not do it. The newest-first ordering is proved deterministically in
  // `competition-results-screen.test.tsx`, where the schedule is fixed rather than generated.
  await expect(page.getByRole("table", { name: "Competition Results" })).toBeVisible();
  await expect(page.getByText("Unplayed")).toHaveCount(0);
});
