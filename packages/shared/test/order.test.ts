import { describe, expect, it } from "vitest";
import { compareCodeUnits } from "../src/order.js";

describe("compareCodeUnits", () => {
  it("puts an uppercase letter before a lowercase one, whatever the host locale says", () => {
    expect(compareCodeUnits("B", "a")).toBeLessThan(0);
    expect(compareCodeUnits("a", "B")).toBeGreaterThan(0);
  });

  it("puts a digit before an underscore, which ICU collation reverses", () => {
    expect(compareCodeUnits("club_eng_10_01", "club_eng_1_07")).toBeLessThan(0);
  });

  it("returns 0 for equal strings", () => {
    expect(compareCodeUnits("comp_eng_1", "comp_eng_1")).toBe(0);
    expect(compareCodeUnits("", "")).toBe(0);
  });

  it("sorts a shorter prefix first", () => {
    expect(["comp_eng_10", "comp_eng_1"].sort(compareCodeUnits)).toEqual(["comp_eng_1", "comp_eng_10"]);
  });
});
