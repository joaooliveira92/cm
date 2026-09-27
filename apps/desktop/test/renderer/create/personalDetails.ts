/**
 * Drives the Manager step's personal-details panel the way a player does, so a flow test that only
 * needs the step as a gateway does not repeat six field interactions. The date picker's default
 * month is January 1985, so day 15 is unique in the grid; picking it yields `1985-01-15`.
 */
import { fireEvent, screen } from "@testing-library/react";
import { chooseOptionByLabel } from "../../setup/baseUiSelect.js";

export const fillPersonalDetails = async (saveName = "Test Career"): Promise<void> => {
  fireEvent.change(await screen.findByPlaceholderText("My Career"), {
    target: { value: saveName },
  });
  fireEvent.change(screen.getByPlaceholderText("Your first name"), {
    target: { value: "Test" },
  });
  fireEvent.change(screen.getByPlaceholderText("Your last name"), {
    target: { value: "Manager" },
  });
  await chooseOptionByLabel("Nationality", "England");

  fireEvent.click(screen.getByRole("button", { name: "Date of birth" }));
  fireEvent.click(await screen.findByRole("button", { name: /January 15th, 1985/ }));
};
