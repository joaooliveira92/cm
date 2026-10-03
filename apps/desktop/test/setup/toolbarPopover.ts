// Driving the screen toolbar's menu selectors (Squad's Position, Status and View).
// They render into the career chrome's toolbar slot, so a test mounting a screen without the
// chrome must also mount `ScreenToolbarSlot` for the triggers to exist.
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect } from "vitest";

/** Open the menu behind the trigger named `triggerLabel`, click the item named `optionLabel`
 *  inside it (a radio choice or a plain item), and wait for the menu to close. The item is looked up inside the menu, so a table cell with the
 *  same text cannot be picked instead. */
export const chooseToolbarOption = async (
  triggerLabel: string | RegExp,
  optionLabel: string | RegExp,
): Promise<void> => {
  fireEvent.click(screen.getByRole("button", { name: triggerLabel }));
  const menu = await screen.findByRole("menu", {}, { timeout: 2000 });
  const item =
    within(menu).queryByRole("menuitemradio", { name: optionLabel }) ??
    within(menu).getByRole("menuitem", { name: optionLabel });
  fireEvent.click(item);
  await waitFor(() => {
    expect(screen.queryByRole("menu")).toBeNull();
  });
};
