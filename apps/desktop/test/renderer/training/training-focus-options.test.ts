import { describe, expect, it } from "vitest";
import {
  offeredTrainingFocuses,
  trainingFocusLabel,
} from "../../../src/renderer/training/trainingFocusOptions.js";
import { squadPlayer } from "./fixtures.js";

describe("ticket 06 — which Training Focus values a player is offered", () => {
  it("offers an outfield player the three outfield Categories, never Goalkeeping", () => {
    const outfield = squadPlayer("p1", "Rui", "Costa", null);
    expect(offeredTrainingFocuses(outfield.attributes)).toEqual(["technical", "mental", "physical"]);
  });

  it("offers a player with goalkeeping Attributes all four Categories, in Category order", () => {
    const keeper = squadPlayer("p2", "Vitor", "Baia", null, true);
    expect(offeredTrainingFocuses(keeper.attributes)).toEqual([
      "technical",
      "mental",
      "physical",
      "goalkeeping",
    ]);
  });

  it("labels None as a value, not a blank", () => {
    expect(trainingFocusLabel(null)).toBe("None");
    expect(trainingFocusLabel("goalkeeping")).toBe("Goalkeeping");
  });
});
