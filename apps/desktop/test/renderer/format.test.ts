import { describe, expect, it } from "vitest";
import { formatMinute } from "../../src/renderer/format.js";

describe("formatMinute", () => {
  // -- First half (half === 1) --

  it("shows a first-half goal at 23 as 23'", () => {
    expect(formatMinute(23, 1)).toBe("23'");
  });

  it("shows a first-half stoppage goal at 47 as 45+2'", () => {
    expect(formatMinute(47, 1)).toBe("45+2'");
  });

  it("shows a first-half stoppage goal at 45 as 45' (no stoppage)", () => {
    expect(formatMinute(45, 1)).toBe("45'");
  });

  it("shows a first-half stoppage goal at 46 as 45+1'", () => {
    expect(formatMinute(46, 1)).toBe("45+1'");
  });

  // -- Second half (half === 2) --

  it("shows a second-half goal at 67 as 67'", () => {
    expect(formatMinute(67, 2)).toBe("67'");
  });

  it("shows a second-half stoppage goal at 93 as 90+3'", () => {
    expect(formatMinute(93, 2)).toBe("90+3'");
  });

  it("shows a second-half stoppage goal at 90 as 90' (no stoppage)", () => {
    expect(formatMinute(90, 2)).toBe("90'");
  });

  it("shows a second-half stoppage goal at 91 as 90+1'", () => {
    expect(formatMinute(91, 2)).toBe("90+1'");
  });

  // -- Minute 0 (early first half) --

  it("shows minute 0 as 0'", () => {
    expect(formatMinute(0, 1)).toBe("0'");
  });
});