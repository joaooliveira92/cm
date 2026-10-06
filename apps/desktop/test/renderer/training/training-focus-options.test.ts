import { describe, expect, it } from "vitest";
import { trainingFocusLabel } from "../../../src/renderer/training/trainingFocusOptions.js";

describe("ticket 06 — Training Focus labels", () => {
  it("labels None as a value, not a blank", () => {
    expect(trainingFocusLabel(null)).toBe("None");
    expect(trainingFocusLabel("goalkeeping")).toBe("Goalkeeping");
  });
});
