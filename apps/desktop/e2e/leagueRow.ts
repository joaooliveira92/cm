import { type Page } from "@playwright/test";

/** A club is picked by name, or as the first club in the table that isn't the named one. */
export type ClubPick = string | { readonly not: string };

/**
 * Opens a club surface from its League Table row. The club's name opens Staff; every other
 * surface sits behind the row's options popover, which renders in a portal outside the table, so
 * the surface control is looked up on the page, not inside the table.
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
  const options =
    typeof club === "string"
      ? table.getByRole("button", { name: `${club} — club options`, exact: true })
      : table
          .locator(
            `button[aria-label$=" — club options"]:not([aria-label=${JSON.stringify(`${club.not} — club options`)}])`,
          )
          .first();
  const label = (await options.getAttribute("aria-label")) ?? "";
  const clubName = label.slice(0, -" — club options".length);
  await options.click();
  await page.getByRole("button", { name: `${clubName} — ${surface}`, exact: true }).click();
  return clubName;
};
