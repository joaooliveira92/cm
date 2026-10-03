import { describe, expect, it } from "vitest";
import {
  displayCondition,
  recoveryStatus,
  type LastInjurySeverity,
  type RecoveryIndicator,
} from "../../../src/renderer/training/recoveryStatus.js";

describe("ticket 05 — recovery status is the display form of main's indicator and the last injury Severity", () => {
  it.each([
    // indicator, severity, label, detail
    ["rest", "none", "Rest", "No injury this Season"],
    ["active", "none", "Active", "No injury this Season"],
    ["rest", "light", "Rest", "Last injury this Season: light"],
    ["active", "light", "Active", "Last injury this Season: light"],
    ["rest", "medium", "Rest", "Last injury this Season: medium"],
    ["active", "medium", "Active", "Last injury this Season: medium"],
    ["rest", "severe", "Rest", "Last injury this Season: severe"],
    ["active", "severe", "Active", "Last injury this Season: severe"],
  ] as const)(
    "indicator %s with last injury Severity %s → %s",
    (indicator: RecoveryIndicator, severity: LastInjurySeverity, label, detail) => {
      expect(recoveryStatus(indicator, severity)).toEqual({ label, detail });
    },
  );

  describe("displayCondition", () => {
    it.each([
      [0, 0],
      [74, 74],
      [74.6, 74],
      [75, 75],
      [99.9, 99],
      [100, 100],
    ])("shows Condition %d as %d, never crossing the Rest/Active line", (input, expected) => {
      expect(displayCondition(input)).toBe(expected);
    });

    it.each([
      [-10, 0],
      [140, 100],
      [Number.NaN, 0],
      [Number.POSITIVE_INFINITY, 0],
      [Number.NEGATIVE_INFINITY, 0],
    ])("clamps invalid Condition %d to %d", (input, expected) => {
      expect(displayCondition(input)).toBe(expected);
    });
  });
});
