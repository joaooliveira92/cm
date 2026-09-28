/**
 * Drives the Manager step's personal-details panel the way a player does, so a flow test that only
 * needs the step as a gateway does not repeat five field interactions. The date picker's default
 * month is January 1985, so day 15 is unique in the grid; picking it yields `1985-01-15`.
 */
import { fireEvent, screen } from "@testing-library/react";
import { chooseOptionByLabel } from "../../setup/baseUiSelect.js";

export const fillPersonalDetails = async (): Promise<void> => {
  fireEvent.change(await screen.findByPlaceholderText("Your first name"), {
    target: { value: "Test" },
  });
  fireEvent.change(screen.getByPlaceholderText("Your last name"), {
    target: { value: "Manager" },
  });
  await chooseOptionByLabel("Nationality", "England");

  fireEvent.click(screen.getByRole("button", { name: "Date of birth" }));
  fireEvent.click(await screen.findByRole("button", { name: /January 15th, 1985/ }));
};

/** Advance through the two Manager sub-panels that follow personal details and choose a formation
 *  and style, leaving the step on the style panel with its gate satisfied. The pillar panel's
 *  default distribution already sums to the budget, so only the style choices are needed. */
export const completeManagerStep = async (): Promise<void> => {
  fireEvent.click(await screen.findByRole("button", { name: "Next: Manager Identity" }));
  // Wait for the pillar panel to mount before advancing again: two bar clicks in the same tick
  // outrun the panel transition's `AnimatePresence` wait.
  await screen.findByRole("button", { name: "Increase Influence" });
  fireEvent.click(await screen.findByRole("button", { name: "Next: Style & Appearance" }));
  await screen.findByRole("combobox", { name: "Preferred formation" });
  await chooseOptionByLabel("Preferred formation", "4-3-3");
  fireEvent.click(await screen.findByRole("button", { name: "Gegenpress" }));
};
