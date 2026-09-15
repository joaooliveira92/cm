import { describe, expect, it } from "vitest";
import {
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  type PlayerAttributes,
} from "../../src/rules/positions.js";
import { developPlayer, isTrainingFocusOffered, offeredTrainingFocuses } from "../../src/rules/training.js";

const outfield = {
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, 10])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((attribute) => [attribute, 10])),
} as PlayerAttributes;

const keeper = {
  ...outfield,
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((attribute) => [attribute, 12])),
} as PlayerAttributes;

describe("which Categories a player may take as Training Focus", () => {
  it("offers an outfield player the three outfield Categories, never Goalkeeping", () => {
    expect(offeredTrainingFocuses(outfield)).toEqual(["technical", "mental", "physical"]);
    expect(isTrainingFocusOffered(outfield, "goalkeeping")).toBe(false);
  });

  it("offers a player with goalkeeping Attributes all four Categories, in Category order", () => {
    expect(offeredTrainingFocuses(keeper)).toEqual(["technical", "mental", "physical", "goalkeeping"]);
    expect(isTrainingFocusOffered(keeper, "goalkeeping")).toBe(true);
  });

  it("always allows None", () => {
    expect(isTrainingFocusOffered(outfield, null)).toBe(true);
  });

  // A save written before the rule was enforced can hold a Goalkeeping focus on an outfield player.
  // That row is left in place: it develops the player exactly as None does.
  it("an off-rule Goalkeeping focus develops an outfield player exactly as no focus", () => {
    expect(developPlayer(outfield, 19, 120, "goalkeeping")).toEqual(developPlayer(outfield, 19, 120));
  });
});
