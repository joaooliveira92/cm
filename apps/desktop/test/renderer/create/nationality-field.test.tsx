import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NationId } from "@cm-clone/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NationalityField } from "../../../src/renderer/create/NationalityField.js";
import { chooseAutocompleteOption } from "../../setup/baseUiAutocomplete.js";

afterEach(() => cleanup());

const input = (): HTMLElement => screen.getByRole("combobox", { name: "Nationality" });

describe("NationalityField", () => {
  it("filters the catalogue's nations as the player types and reports the pick", async () => {
    const onSelect = vi.fn();
    render(<NationalityField value={null} onSelect={onSelect} />);

    fireEvent.click(input());
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.change(input(), { target: { value: "port" } });
    await waitFor(() =>
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Portugal"]),
    );

    fireEvent.click(screen.getByRole("option", { name: "Portugal" }));
    expect(onSelect).toHaveBeenLastCalledWith("nation_prt");
  });

  it("shows the committed nation, and clearing the input clears it", async () => {
    const onSelect = vi.fn();
    render(<NationalityField value={NationId.make("nation_esp")} onSelect={onSelect} />);
    expect(input()).toHaveProperty("value", "Spain");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("lists every nation when reopened over a committed pick", async () => {
    render(<NationalityField value={NationId.make("nation_esp")} onSelect={() => undefined} />);
    await chooseAutocompleteOption("Nationality", "Spain");
    fireEvent.click(input());
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect((await screen.findAllByRole("option")).length).toBeGreaterThan(1);
  });
});
