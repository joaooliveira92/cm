/**
 * Career scope estimates (§11): how large an effective selection comes out -- Nations,
 * Competitions, Clubs, Players -- and the issues raised when that estimate outruns the machine it
 * has to run on.
 */

import { describe, expect, it } from "vitest";
import {
  estimateCareerScope,
  estimateIssues,
  resolveSelection,
  type NationSelectionIntent,
  type SystemCapabilityProfile,
} from "../../src/index.js";
import { index, playable } from "./leagueSelection/helpers.js";

describe("estimates (§11)", () => {
  const estimateFor = (intents: readonly NationSelectionIntent[], profile?: SystemCapabilityProfile) =>
    estimateCareerScope(index, resolveSelection(index, intents), profile);

  it("counts the effective selection, dependencies included (AC-9)", () => {
    const estimate = estimateFor([playable("nation_eng", "scope_eng_top")]);
    // 20 clubs in the top division; the cup it requires owns no clubs of its own.
    expect(estimate.estimatedClubCount).toBe(20);
    expect(estimate.estimatedPlayerCount).toBe(20 * 25);
    expect(estimate.playableCompetitionCount).toBe(1);
    expect(estimate.backgroundCompetitionCount).toBe(1);
  });

  it("grows monotonically as scope widens", () => {
    const narrow = estimateFor([playable("nation_eng", "scope_eng_top")]);
    const wide = estimateFor([playable("nation_eng", "scope_eng_pyramid")]);
    expect(wide.estimatedClubCount).toBeGreaterThan(narrow.estimatedClubCount);
    expect(wide.estimatedMemoryBytes).toBeGreaterThan(narrow.estimatedMemoryBytes);
  });

  it("gives view-only competitions no squads (§9.3)", () => {
    const estimate = estimateFor([
      playable("nation_eng", "scope_eng_top"),
      { nationId: "nation_prt", mode: "view_only", source: "user" },
    ]);
    const playableOnly = estimateFor([playable("nation_eng", "scope_eng_top")]);
    expect(estimate.estimatedPlayerCount).toBe(playableOnly.estimatedPlayerCount);
  });

  it("reports `unsupported` rather than a speed when memory cannot hold the selection", () => {
    const tiny: SystemCapabilityProfile = { totalMemoryBytes: 64 * 1024 * 1024, performanceIndex: 1 };
    const estimate = estimateFor([playable("nation_eng", "scope_eng_pyramid")], tiny);
    expect(estimate.simulationSpeedRating).toBe("unsupported");
    expect(estimateIssues(estimate)[0]?.level).toBe("blocking");
  });

  it("rates the same selection faster on a faster machine", () => {
    const intents = [
      playable("nation_eng", "scope_eng_pyramid"),
      playable("nation_deu", "scope_deu_pyramid"),
    ];
    const slow = estimateFor(intents, { totalMemoryBytes: 32 * 1024 ** 3, performanceIndex: 0.5 });
    const fast = estimateFor(intents, { totalMemoryBytes: 32 * 1024 ** 3, performanceIndex: 4 });
    const order = ["very_fast", "fast", "medium", "slow", "very_slow", "unsupported"];
    expect(order.indexOf(fast.simulationSpeedRating)).toBeLessThan(
      order.indexOf(slow.simulationSpeedRating),
    );
  });

  it("lowers confidence when a selected Competition's figures are unverified", () => {
    expect(estimateFor([playable("nation_eng", "scope_eng_top")]).confidence).toBe("high");
    expect(estimateFor([playable("nation_prt", "scope_prt_two")]).confidence).toBe("low");
  });

  it("is empty, not broken, for an empty selection", () => {
    const estimate = estimateFor([]);
    expect(estimate.estimatedClubCount).toBe(0);
    expect(estimate.selectedNationCount).toBe(0);
  });
});
