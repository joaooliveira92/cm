import type { Page } from "@playwright/test";
import { chooseOption, expect, optionLabels, test } from "./launchApp.js";

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
 * Selectors are role- and label-based throughout — no CSS selector and no class name appears below,
 * because a spec that reaches for one stops describing what a player can do.
 *
 * One exception, and it is a real one: the entity total is read by `data-testid="entity-count"`,
 * because the number is a bare `<p>` with no accessible name of its own. That attribute is also
 * load-bearing for ~24 unit-test call sites. It contradicts the acceptance criterion in
 * `.agents/notes/proposed/testing/2026-08-30-e2e-keyboard-strategy.md` ("No `data-testid` or other
 * test-only attribute exists in `apps/desktop/src/`"), which the Active Leagues surface has drifted
 * from; that drift needs a decision, not a silent workaround here.
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
  const candidateLabel = (await optionLabels(page, "League to add"))[1];
  expect(candidateLabel).toBeTruthy();

  const rowsBefore = await removeButtons.count();
  await chooseOption(page, "League to add", candidateLabel!);
  await page.getByRole("button", { name: "Add league" }).click();
  await expect(removeButtons).not.toHaveCount(rowsBefore, { timeout: 30_000 });

  // 3. Change one league's simulation depth, and only that one.
  const depthLabel = await page
    .getByRole("combobox", { name: /^Simulation depth for / })
    .first()
    .getAttribute("aria-label");
  // The option carries the display label ("Results only"), but the closed trigger renders the raw
  // SimulationDepth value ("results-only") — `SelectValue` has no item mapping to look the label up
  // in. Asserted as it ships rather than as it ought to read; the mismatch is a UI defect, not a
  // test one, and papering over it here would hide it.
  await chooseOption(page, depthLabel!, "Results only");
  await expect(page.getByRole("combobox", { name: depthLabel! })).toHaveText("results-only");

  // 4. Apply the one-action setup preset.
  await page.getByRole("button", { name: "Use setup preset" }).click();
  await expect(removeButtons.first()).toBeVisible({ timeout: 30_000 });
  const afterPreset = await readConsequences(page);

  // 5. Toggle a real advanced option — one that feeds the estimate rather than a decorative one.
  await page.getByRole("button", { name: /Advanced options/ }).click();
  const rosterDetail = page.getByRole("combobox", { name: "Roster generation detail" });
  await expect(rosterDetail).toBeVisible();
  const currentRoster = (await rosterDetail.innerText()).trim();
  const nextRoster = (await optionLabels(page, "Roster generation detail")).find(
    (label) => label !== currentRoster,
  );
  await chooseOption(page, "Roster generation detail", nextRoster!);

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
