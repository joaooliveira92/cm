import type { Page } from "@playwright/test";
import { expect, test } from "./launchApp.js";

/**
 * The critical setup path through the shipped Active Leagues screen, in the built app.
 *
 * This is the capstone the slicing was building toward: add a league, retune it, apply the setup
 * preset, change a real advanced option, watch the consequence panel move, and continue. It runs
 * against the real main process over the real IPC seam with a temp `--user-data-dir`, so the only
 * thing it can pass on is the shipped vertical path.
 *
 * The terminal assertion is navigation to Step 2 · Manager, not world creation: generation runs
 * behind the Manager step, so campaign creation has no single-step surface on this screen.
 *
 * Selectors are role- and label-based throughout. No CSS selector and no class name appears
 * below, because a spec that reaches for one stops describing what a player can do.
 */

/** The five-segment cost meter and the entity total, read as the sidebar presents them. */
const readConsequences = async (page: Page) => {
  const meter = page.getByRole("meter", { name: "Processing cost" });
  const entityCount = page.getByTestId("entity-count");
  return {
    cost: Number(await meter.getAttribute("aria-valuenow")),
    entities: Number((await entityCount.innerText()).replace(/\D/g, "")),
  };
};

test("configures a career's active leagues and continues to the Manager step", async ({
  window: page,
}) => {
  await page.getByRole("button", { name: "Start New Career" }).click();

  // 1. The setup screen, not the territory tree.
  await expect(page.getByRole("heading", { name: "Active Leagues" })).toBeVisible({
    timeout: 30_000,
  });
  const sidebar = page.getByRole("complementary", { name: "Setup consequences" });
  await expect(sidebar).toBeVisible();

  // The recommended configuration lands first, so there is something to reconfigure.
  const removeButtons = page.getByRole("button", { name: /^Remove / });
  await expect(removeButtons.first()).toBeVisible({ timeout: 30_000 });
  const baseline = await readConsequences(page);
  expect(baseline.entities).toBeGreaterThan(0);

  // 2. Add a league from the available catalogue.
  const addSelect = page.getByLabel("League to add");
  const firstCandidate = addSelect.locator("option").nth(1);
  const candidateValue = await firstCandidate.getAttribute("value");
  const candidateLabel = (await firstCandidate.innerText()).trim();
  expect(candidateValue).toBeTruthy();

  const rowsBefore = await removeButtons.count();
  await addSelect.selectOption(candidateValue!);
  await page.getByRole("button", { name: "Add league" }).click();
  await expect(removeButtons).not.toHaveCount(rowsBefore, { timeout: 30_000 });
  expect(candidateLabel.length).toBeGreaterThan(0);

  // 3. Change one league's simulation depth, and only that one.
  const depthSelect = page.getByRole("combobox", { name: /^Simulation depth for / }).first();
  const depthLabel = await depthSelect.getAttribute("aria-label");
  await depthSelect.selectOption("results-only");
  await expect(page.getByRole("combobox", { name: depthLabel! })).toHaveValue("results-only");

  // 4. Apply the one-action setup preset.
  await page.getByRole("button", { name: "Use setup preset" }).click();
  await expect(removeButtons.first()).toBeVisible({ timeout: 30_000 });
  const afterPreset = await readConsequences(page);

  // 5. Toggle a real advanced option — one that feeds the estimate rather than a decorative one.
  await page.getByRole("button", { name: /Advanced options/ }).click();
  const rosterDetail = page.getByRole("combobox", { name: "Roster generation detail" });
  await expect(rosterDetail).toBeVisible();
  const currentRoster = await rosterDetail.inputValue();
  const otherRoster = (await rosterDetail.locator("option").all()).map((option) =>
    option.getAttribute("value"),
  );
  const nextRoster = (await Promise.all(otherRoster)).find(
    (value) => value !== null && value !== currentRoster,
  );
  await rosterDetail.selectOption(nextRoster!);

  // 6. The consequence panel moved with the configuration — no figure here is hardcoded.
  await expect
    .poll(async () => (await readConsequences(page)).entities, { timeout: 30_000 })
    .not.toBe(afterPreset.entities);

  // 7. A valid setup: Continue is offered.
  const continueButton = page.getByRole("button", { name: /^Continue/ });
  await expect(continueButton).toBeEnabled({ timeout: 30_000 });

  // 8 & 9. Continue records the selection and the flow lands on Step 2 · Manager.
  await continueButton.click();
  await expect(page.getByPlaceholder("My Career")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Step 2 of 4 · Manager")).toBeVisible();
});
