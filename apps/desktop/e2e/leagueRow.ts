import { type Page } from "@playwright/test";

/** A club is picked by name, or as the first club in the table that isn't the named one. */
export type ClubPick = string | { readonly not: string };

/**
 * Opens a club surface from its League Table row. The club's name opens Staff; hovering the name
 * reveals every other surface behind one hover card, which renders in a portal outside the table,
 * so the surface control is looked up on the page, not inside the table.
 *
 * `surface` is the tail of the control's accessible name: `"scout report"`, `"club squad"`, ...
 * Returns the club's name, for callers that pick "any rival" and assert on it afterwards.
 */
export const openClubSurface = async (
  page: Page,
  club: ClubPick,
  surface: string,
): Promise<string> => {
  const table = page.getByRole("main").getByRole("table");
  const staffButton =
    typeof club === "string"
      ? table.getByRole("button", { name: `${club} — club staff`, exact: true })
      : table
          .locator(
            `button[aria-label$=" — club staff"]:not([aria-label=${JSON.stringify(`${club.not} — club staff`)}])`,
          )
          .first();
  const label = (await staffButton.getAttribute("aria-label")) ?? "";
  const clubName = label.slice(0, -" — club staff".length);
  await staffButton.hover();
  await page.getByRole("button", { name: `${clubName} — ${surface}`, exact: true }).click();
  return clubName;
};
