import { describe, expect, it } from "vitest";
import type { TeamScoutReportView } from "@cm-clone/contracts";
import { compareReports, hasChanges } from "../../../src/renderer/scouting/compareReports.js";
import { reportFor } from "./reportFixtures.js";

const report = (overrides: Record<string, unknown> = {}) =>
  reportFor("club-7", "Northport Rovers", overrides) as unknown as TeamScoutReportView;

const striker = (low: number, high: number) => ({
  playerId: "p-9",
  firstName: "Nico",
  lastName: "Striker",
  position: "ST",
  progress: 40,
  abilityLow: low,
  abilityHigh: high,
});

describe("ticket 08 — comparing two readings", () => {
  it("reports nothing for the same reading, whatever order its lists arrive in", () => {
    const earlier = report({
      strengths: [
        { area: "attack", note: "A", confidence: "high" },
        { area: "midfield", note: "B", confidence: "low" },
      ],
    });
    const later = report({
      strengths: [
        { area: "midfield", note: "B", confidence: "low" },
        { area: "attack", note: "A", confidence: "high" },
      ],
    });
    expect(hasChanges(compareReports(earlier, later))).toBe(false);
  });

  it("names confidence, formation, findings, key players, and range changes", () => {
    const earlier = report({
      knowledgeConfidence: "low",
      predictedFormation: null,
      strengths: [{ area: "attack", note: "Quick through the middle", confidence: "low" }],
      weaknesses: [],
      setPieceFindings: [],
      keyPlayers: [striker(50, 80), { ...striker(40, 70), playerId: "p-4", firstName: "Old", lastName: "Hand" }],
    });
    const later = report({
      knowledgeConfidence: "high",
      predictedFormation: { formation: "4-3-3", confidence: "high" },
      strengths: [],
      weaknesses: [{ area: "defense", note: "Slow to turn", confidence: "high" }],
      setPieceFindings: [],
      keyPlayers: [striker(62, 70), { ...striker(55, 60), playerId: "p-11", firstName: "New", lastName: "Face" }],
    });

    const comparison = compareReports(earlier, later);

    expect(comparison.confidence).toEqual({ from: "low", to: "high" });
    expect(comparison.formation).toEqual({ from: null, to: "4-3-3" });
    expect(comparison.findingsAdded.map((c) => [c.kind, c.finding.note])).toEqual([["weakness", "Slow to turn"]]);
    expect(comparison.findingsRemoved.map((c) => [c.kind, c.finding.note])).toEqual([
      ["strength", "Quick through the middle"],
    ]);
    expect(comparison.playersAdded).toEqual(["New Face"]);
    expect(comparison.playersRemoved).toEqual(["Old Hand"]);
    expect(comparison.rangesChanged).toEqual([{ name: "Nico Striker", from: [50, 80], to: [62, 70] }]);
  });
});
