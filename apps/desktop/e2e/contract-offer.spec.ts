import type { Locator, Page } from "@playwright/test";
import { chooseOption, continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedOfferedFreeAgents } from "./seedSaves.js";

/**
 * Signing a Free Agent on the Transfers screen (Screen 137, group-j ticket 09): the offer's three
 * terms, and the wage gate that follows the manager's own Scouting Progress.
 *
 * `seedOfferedFreeAgents` detaches two Players and scouts them to 40 and to 100, so the same form
 * offers a wage *band* for one and a single wage for the other. Which of the two rows each shape
 * belongs to is not this test's business — it reads the shape off the figure the form printed and
 * proves the gate against that figure's own boundaries, one below and one above. That keeps the spec
 * honest without hardcoding a number the manager's knowledge chooses, and locale-tolerant: mot
 * formatting puts the thousands separator in, so digits are read out of the printed text.
 */

/** The context region that hosts the terms form. Its name carries the palette's keyboard badge in
 *  the accessible name, so it is matched as a pattern rather than an exact string. */
const signRegion = (page: Page) => page.getByRole("region", { name: /Sign free agent/ });
const freeAgents = (page: Page) => page.getByRole("table", { name: "Free Agents" });
const wageInput = (page: Page) => signRegion(page).getByLabel("Weekly wage");
const signButton = (page: Page) => signRegion(page).getByRole("button", { name: "Sign (0 Cr)" });

/** The name a Free Agents row leads with, which is the control that mounts the terms form. */
const nameOf = async (row: Locator): Promise<string> =>
  (await row.locator("td").first().innerText()).trim();

/** Select a Free Agent the way a manager does: the name control in the row's first cell. */
const selectRow = async (page: Page, row: Locator): Promise<string> => {
  const name = await nameOf(row);
  await row.locator("td").first().locator("button").click();
  await expect(signRegion(page)).toBeVisible();
  return name;
};

/** The digits of a printed figure, e.g. `1,200 Cr` or `1.200 Cr` -> `1200`. */
const digits = (text: string): number => Number(text.replace(/\D/g, ""));

/** The wage the offer published, read off the sentence the form prints above its controls. A band
 *  arrives as `900 Cr–3,400 Cr` (en dash) and a Fully Scouted figure as one number, so the split on
 *  the dash is what tells the two knowledge states apart on screen. */
const publishedWage = async (page: Page): Promise<{ readonly low: number; readonly high: number }> => {
  const sentence = await signRegion(page).getByText(/weekly wage/).innerText();
  const [low, high] = sentence.split(/weekly wage/i)[1]?.split("–") ?? [];
  if (low === undefined) throw new Error(`no published wage in: ${sentence}`);
  return { low: digits(low), high: high === undefined ? digits(low) : digits(high) };
};

/** Drive the wage gate against whatever the row at `index` published, and report the knowledge
 *  shape it published in.
 *
 *  Each step is sequential by nature — the next `fill` only means anything after the button state it
 *  asserts has settled — so this is a named step called per row rather than a loop body. */
const gateFollowsThePublishedFigure = async (page: Page, index: number): Promise<string> => {
  await selectRow(page, freeAgents(page).getByRole("row").nth(index));
  const { low, high } = await publishedWage(page);

  // A non-integer is no offer at either knowledge state.
  await wageInput(page).fill(`${low}.5`);
  await expect(signButton(page)).toBeDisabled();
  // One below and one above the published figure is no offer either — the gate is the figure the
  // read published, not a loose bound around it.
  await wageInput(page).fill(String(low - 1));
  await expect(signButton(page)).toBeDisabled();
  await expect(signRegion(page).getByText(/what your knowledge of this player supports/)).toBeVisible();
  await wageInput(page).fill(String(high + 1));
  await expect(signButton(page)).toBeDisabled();
  // The boundaries themselves sign.
  await wageInput(page).fill(String(low));
  await expect(signButton(page)).toBeEnabled();
  if (high !== low) {
    await wageInput(page).fill(String(high));
    await expect(signButton(page)).toBeEnabled();
  }
  return low === high ? "exact" : "band";
};

test("a Free Agent is signed on the Role, length and wage the offer published", async ({
  window: page,
  userDataDir,
}) => {
  await seedOfferedFreeAgents(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: offered free agents");

  await goto(page, "transfers");
  await expect(freeAgents(page).getByRole("row").first()).toBeVisible();
  // Header plus the two Players the seed detached: both are signing candidates, neither is listed
  // in the Market, and the Club cell says so.
  await expect(freeAgents(page).getByRole("row")).toHaveCount(3);
  await expect(freeAgents(page).getByRole("row").nth(1).getByText("Free Agent")).toBeVisible();

  const name = await selectRow(page, freeAgents(page).getByRole("row").nth(1));
  // The three terms `signFreeAgent` takes are all on screen, and the Role is one the player plays.
  await expect(signRegion(page).getByRole("combobox", { name: /^Role offered to/ })).toBeVisible();
  await expect(signRegion(page).getByRole("combobox", { name: /^Contract length offered to/ })).toBeVisible();
  const { low, high } = await publishedWage(page);
  expect(high).toBeGreaterThanOrEqual(low);
  // The form seeds a wage the knowledge supports, so the offer is signable as it stands.
  expect(Number(await wageInput(page).inputValue())).toBeGreaterThanOrEqual(low);
  expect(Number(await wageInput(page).inputValue())).toBeLessThanOrEqual(high);
  await expect(signButton(page)).toBeEnabled();

  // Naming a 5-year term and the wage on screen is the whole submission.
  await chooseOption(page, /^Contract length offered to/, "5 years");
  await signButton(page).click();

  // He is no longer a Free Agent, which is what proves the sign landed: the row leaves the table
  // and the screen raises nothing. (That he is in the squad is asserted where it is readable — the
  // main-process spec's `getSquad` — because the Squad screen renders an empty roster until a Tactic
  // is set, and driving eleven tactics to read one name is not this screen's claim.)
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(freeAgents(page).getByRole("row")).toHaveCount(2);
  await expect(freeAgents(page)).not.toContainText(name);
});

test("the wage gate is the band's own boundaries, and a Fully Scouted player has none", async ({
  window: page,
  userDataDir,
}) => {
  await seedOfferedFreeAgents(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: offered free agents");

  await goto(page, "transfers");
  await expect(freeAgents(page).getByRole("row").first()).toBeVisible();

  // Both seeded Players, one after the other: the form is proven against whatever knowledge each
  // row's figure says the manager has.
  const first = await gateFollowsThePublishedFigure(page, 1);
  const second = await gateFollowsThePublishedFigure(page, 2);

  // The seed scouted one to 40 and one to 100, and the form drew the two knowledge states apart.
  expect([first, second].sort()).toEqual(["band", "exact"]);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
