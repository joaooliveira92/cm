import type { Page } from "@playwright/test";

/**
 * Completes the Manager step's personal-details panel: first and last name, nationality, and a
 * date of birth. The date picker opens on January 1985 by default, so the 15th is a fixed target
 * rather than a moving one. The favorite team is left blank — it is optional, and leaving it blank
 * keeps this helper independent of world generation.
 */
export const fillPersonalDetails = async (page: Page): Promise<void> => {
  await page.getByPlaceholder("Your first name").fill("Test");
  await page.getByPlaceholder("Your last name").fill("Manager");

  await page.getByRole("combobox", { name: "Nationality" }).click();
  await page.getByRole("option", { name: "England" }).click();

  await page.getByRole("button", { name: "Date of birth" }).click();
  await page.getByRole("button", { name: /January 15th, 1985/ }).click();
};

/**
 * Advances the two Manager sub-panels that follow personal details — the pillar allocation (whose
 * default budget is already complete) and Style & Appearance — choosing a formation.
 * Leaves the Manager step on the style panel with its gate satisfied.
 */
export const completeManagerStep = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "Next: Manager Identity" }).click();
  await page.getByRole("button", { name: "Next: Style & Appearance" }).click();
  await page.getByRole("combobox", { name: "Preferred formation" }).click();
  await page.getByRole("option", { name: "4-3-3" }).click();
};
