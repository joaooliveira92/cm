// Driving the screen toolbar's popover selectors (Squad's View and Position). They render into
// the career chrome's toolbar slot, so a test mounting a screen without the chrome must also
// mount `ScreenToolbarSlot` for the triggers to exist.
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect } from "vitest";

/** Open the popover behind the trigger named `triggerLabel`, click the option button named
 *  `optionLabel` inside it, and wait for the popover to close. The option is looked up inside
 *  the popover, so a table cell with the same text cannot be picked instead. */
export const chooseToolbarOption = async (
  triggerLabel: string | RegExp,
  optionLabel: string | RegExp,
): Promise<void> => {
  fireEvent.click(screen.getByRole("button", { name: triggerLabel }));
  const popup = await screen.findByRole("dialog", {}, { timeout: 2000 });
  fireEvent.click(within(popup).getByRole("button", { name: optionLabel }));
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
};
