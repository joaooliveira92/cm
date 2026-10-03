// Base UI Select driving helpers.
//
// The vendored Select primitive (see `src/renderer/components/ui/select.tsx`) renders a
// `button[role=combobox]` trigger and portals its options into a listbox, so the native
// `<select>` interactions (`fireEvent.change(select, { target: { value } })`, reading
// `.value`/`.options`) do not reach it. These helpers drive it the way a user does: open the
// popup, then commit a pick with the pointer sequence Base UI requires (a bare `click` is
// filtered out unless a `pointerdown` armed the mouse-selection path first).
import { fireEvent, screen, waitFor } from "@testing-library/react";

/** The trigger for a Base UI select, by its accessible name. */
export const comboboxByLabel = (label: string | RegExp): HTMLElement =>
  screen.getByRole("combobox", { name: label });

/** What a Base UI select trigger currently shows. The vendored `SelectValue` renders the raw
 *  value (the app passes no `items` label lookup), and the chevron contributes no text. */
export const selectValueOf = (trigger: HTMLElement): string => trigger.textContent ?? "";

/** Open a Base UI select popup by clicking its trigger. */
export async function openSelect(trigger: HTMLElement): Promise<void> {
  if (screen.queryByRole("listbox") !== null) throw new Error("a select popup is already open");
  fireEvent.click(trigger);
  await screen.findByRole("listbox", {}, { timeout: 2000 });
}

/** The pointer sequence that commits a Base UI `SelectItem`. */
export function commitPointerClick(element: HTMLElement): void {
  fireEvent.pointerDown(element, { button: 0, pointerType: "mouse" });
  fireEvent.pointerUp(element, { button: 0, pointerType: "mouse" });
  fireEvent.click(element, { button: 0 });
}

/** Pick one option in an open popup and wait for the popup to close again. */
export async function pickOpenOption(name: string | RegExp): Promise<HTMLElement> {
  const option = await screen.findByRole("option", { name }, { timeout: 2000 });
  commitPointerClick(option);
  await waitFor(() => {
    if (screen.queryByRole("listbox") !== null) {
      throw new Error("select popup did not close after picking an option");
    }
  });
  return option;
}

/** Open a select by its trigger and pick an option whose visible label matches `name`. */
export async function chooseOption(
  trigger: HTMLElement,
  name: string | RegExp,
): Promise<HTMLElement> {
  await openSelect(trigger);
  return pickOpenOption(name);
}

/** One-shot convenience: find the trigger by accessible name, then choose the option. */
export const chooseOptionByLabel = async (
  label: string | RegExp,
  name: string | RegExp,
): Promise<HTMLElement> => chooseOption(comboboxByLabel(label), name);