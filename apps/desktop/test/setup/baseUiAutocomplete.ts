// Base UI Autocomplete driving helper.
//
// The vendored Autocomplete (see `src/renderer/components/ui/autocomplete.tsx`) is a text input with
// `role=combobox` and a portalled listbox, so the Select helpers in `baseUiSelect.ts` do not reach
// it. This drives it the way a player does: type into the input to filter the list,
// then click the option. jsdom's synthetic `change` does not open the popup on its own, so ArrowDown
// opens it first, as the keyboard would. An item's `onClick` is where the fields commit a pick.
import { fireEvent, screen, waitFor } from "@testing-library/react";

/** Type `query` into the autocomplete labelled `label` and pick the option matching `name`. */
export const chooseAutocompleteOption = async (
  label: string | RegExp,
  query: string,
  name: string | RegExp = query,
): Promise<HTMLElement> => {
  const input = screen.getByRole("combobox", { name: label });
  fireEvent.click(input);
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.change(input, { target: { value: query } });
  const option = await screen.findByRole("option", { name }, { timeout: 2000 });
  fireEvent.click(option);
  await waitFor(() => {
    if (screen.queryByRole("listbox") !== null) {
      throw new Error("autocomplete popup did not close after picking an option");
    }
  });
  return option;
};
