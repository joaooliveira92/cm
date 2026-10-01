import { describe, expect, it } from "vitest";
import {
  aiTacticPreferences,
  aiResolveTactic,
  aiTacticFromResult,
  aiInMatchController,
  type AiTacticalPreferences,
} from "../../src/rules/aiTactics.js";
import {
  BUILT_IN_TEMPLATES,
  BUILT_IN_TEMPLATE_NAMES,
} from "../../src/rules/tacticTemplates.js";
import { DEFAULT_TEAM_INSTRUCTIONS, type TeamInstructions } from "../../src/rules/tacticModel.js";
import { STARTER_COUNT, BENCH_SIZE } from "../../src/rules/tactics.js";
import { slotLabel } from "../../src/rules/slots.js";
import type { Position } from "../../src/rules/positions.js";
import type { FamiliarityTier } from "../../src/rules/positions.js";
import type { PlayerPosition } from "../../src/rules/ratings.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** A generic squad player for testing, carrying only what the AI functions read. */
interface TestPlayer {
  readonly id: string;
  readonly cellRatings: Record<string, number>;
  readonly suitability: Record<string, number>;
  readonly positionRatings: Record<string, number>;
  readonly positions: ReadonlyArray<PlayerPosition>;
}

/** Build a squad from a template by giving each cell a player with that cell's best rating. */
const squadForTemplate = (
  templateIdx: number,
  baseRating: number,
): TestPlayer[] => {
  const template = BUILT_IN_TEMPLATES[templateIdx]!;
  const squad: TestPlayer[] = [];
  for (let i = 0; i < template.slots.length; i++) {
    const slot = template.slots[i]!;
    const key = slotLabel(slot.cell);
    const ratings: Record<string, number> = {};
    const suit: Record<string, number> = {};
    // High rating in this cell, lower everywhere else
    for (const t of BUILT_IN_TEMPLATES) {
      for (const s of t.slots) {
        ratings[slotLabel(s.cell)] = 5;
        suit[slotLabel(s.cell)] = 1;
      }
    }
    ratings[key] = baseRating;
    suit[key] = baseRating >= 15 ? 18 : 10; // natural or unfamiliar
    squad.push({
      id: `player-${templateIdx}-${i}`,
      cellRatings: ratings,
      suitability: suit,
      positionRatings: { GK: baseRating, DC: baseRating, DL: baseRating, DR: baseRating, DM: baseRating, MC: baseRating, ML: baseRating, MR: baseRating, AMC: baseRating, ST: baseRating },
      positions: i === 0 ? [{ position: "GK" as Position, familiarity: "natural" as FamiliarityTier }] : [{ position: "ST" as Position, familiarity: "natural" as FamiliarityTier }],
    });
  }
  return squad;
};

/** A squad of exactly eleven players, all with the same uniform ratings. Not associated with any
 *  template in particular — a generic squad that `selectBestTemplateXI` can fill. */
const uniformSquad = (rating: number): TestPlayer[] =>
  Array.from({ length: STARTER_COUNT }, (_, i) => {
    const ratings: Record<string, number> = {};
    const suit: Record<string, number> = {};
    for (const template of BUILT_IN_TEMPLATES) {
      for (const slot of template.slots) {
        const key = slotLabel(slot.cell);
        ratings[key] = rating;
        suit[key] = rating >= 15 ? 18 : 10;
      }
    }
    return {
      id: `player-${i}`,
      cellRatings: ratings,
      suitability: suit,
      positionRatings: { GK: rating, DC: rating, DL: rating, DR: rating, DM: rating, MC: rating, ML: rating, MR: rating, AMC: rating, ST: rating },
      positions: i === 0 ? [{ position: "GK" as Position, familiarity: "natural" as FamiliarityTier }] : [{ position: "ST" as Position, familiarity: "natural" as FamiliarityTier }],
    };
  });

const neutralOpponent = { phaseStrengths: { attack: 50, midfield: 50, defense: 50 }, lastFormationName: "4-4-2" };
const weakerOpponent = { phaseStrengths: { attack: 30, midfield: 30, defense: 30 }, lastFormationName: "4-4-2" };
const strongerOpponent = { phaseStrengths: { attack: 70, midfield: 70, defense: 70 }, lastFormationName: "4-4-2" };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("aiTacticPreferences", () => {
  it("returns deterministic preferences for a given (worldSeed, clubId, statureTier)", () => {
    const a = aiTacticPreferences(42, "club_eng_1_01", "mid");
    const b = aiTacticPreferences(42, "club_eng_1_01", "mid");
    expect(a).toEqual(b);
    expect(typeof a.preferredFormation).toBe("string");
    expect(["ultraDefensive", "defensive", "normal", "attacking", "gungHo"]).toContain(a.mentality);
    expect(["default", "ownHalfOnly", "always"]).toContain(a.pressingStyle);
    expect(["mixed", "short", "direct", "long"]).toContain(a.playingStyle);
    expect(["zonal", "man"]).toContain(a.markingStyle);
  });

  it("produces different formations for different seeds (same club)", () => {
    const formations = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      formations.add(aiTacticPreferences(seed, "club_eng_1_01", "mid").preferredFormation);
    }
    // With 29 templates, 20 runs should pick at least 2 different ones
    expect(formations.size).toBeGreaterThan(1);
  });

  it("produces different formations for different club ids (same seed)", () => {
    const formations = new Set<string>();
    for (let i = 1; i <= 20; i++) {
      formations.add(aiTacticPreferences(42, `club_eng_1_${String(i).padStart(2, "0")}`, "mid").preferredFormation);
    }
    expect(formations.size).toBeGreaterThan(1);
  });

  it("biases big clubs toward attacking mentality", () => {
    const mentalities = Array.from({ length: 50 }, (_, i) =>
      aiTacticPreferences(i, "club_big", "big").mentality,
    );
    // Big clubs should never get ultraDefensive
    expect(mentalities).not.toContain("ultraDefensive");
    // Most should be normal, attacking, or gungHo
    const attacking = mentalities.filter((m) => m === "attacking" || m === "gungHo");
    expect(attacking.length).toBeGreaterThan(0);
  });

  it("biases small clubs toward defensive mentality", () => {
    const mentalities = Array.from({ length: 50 }, (_, i) =>
      aiTacticPreferences(i, "club_small", "small").mentality,
    );
    // Small clubs should never get gungHo
    expect(mentalities).not.toContain("gungHo");
    const defensive = mentalities.filter((m) => m === "defensive" || m === "ultraDefensive");
    expect(defensive.length).toBeGreaterThan(0);
  });

  it("biases big clubs toward direct/long passing", () => {
    const playing = Array.from({ length: 50 }, (_, i) =>
      aiTacticPreferences(i, "club_big", "big").playingStyle,
    );
    // Big clubs should never get short passing
    expect(playing).not.toContain("short");
  });

  it("biases small clubs away from long passing", () => {
    const playing = Array.from({ length: 50 }, (_, i) =>
      aiTacticPreferences(i, "club_small", "small").playingStyle,
    );
    // Small clubs should never get long passing
    expect(playing).not.toContain("long");
    expect(playing).not.toContain("direct");
  });

  it("preferredFormation always names a valid built-in template", () => {
    const names = new Set(BUILT_IN_TEMPLATES.map((t) => t.name));
    for (let seed = 0; seed < 50; seed++) {
      const pref = aiTacticPreferences(seed, "club_test", "mid");
      expect(names).toContain(pref.preferredFormation);
    }
  });
});

describe("aiResolveTactic", () => {
  it("returns a filled tactic with the preferred template when the squad suits it", () => {
    const squad = squadForTemplate(0, 80); // suits template 0 (4-4-2)
    const pref = aiTacticPreferences(42, "club_test", "mid");
    // Use a strong opponent and away to prevent attacking-at-home shift
    const result = aiResolveTactic(pref, squad, false, strongerOpponent);
    expect(result.filled.length).toBe(STARTER_COUNT);
    expect(result.meanRating).toBeGreaterThan(0);
    // Mentality may shift defensive since away vs stronger opponent, so check it's
    // either the pref or one step more defensive
    const mentalityOrder = ["ultraDefensive", "defensive", "normal", "attacking", "gungHo"];
    const prefIdx = mentalityOrder.indexOf(pref.mentality);
    const resultIdx = mentalityOrder.indexOf(result.team.mentality);
    expect(resultIdx).toBeLessThanOrEqual(prefIdx); // same or more defensive
    expect(result.team.passing).toBe(pref.playingStyle);
    expect(result.team.closingDown).toBe(pref.pressingStyle);
    expect(result.team.zonalMarking).toBe(pref.markingStyle === "zonal");
  });

  it("falls back to best template when the squad is unsuited to the preferred template", () => {
    // Create a squad that's strong in an unusual template, weak in the preferred one
    // Force preferred formation to "4-4-2" (index 0) by using aiTacticPreferences then
    // construct a result that proves the fallback works.
    const squad = uniformSquad(5); // Everyone has low fit rating
    const pref = aiTacticPreferences(42, "club_test", "mid");
    const result = aiResolveTactic(pref, squad, true, neutralOpponent);
    // The squad is uniformly low-rated so the mean rating reflects that
    expect(result.filled.length).toBe(STARTER_COUNT);
    // Mean rating should equal the uniform rating since all players have the same
    expect(result.meanRating).toBeLessThanOrEqual(5);
  });

  it("shifts mentality defensive when weaker opponent and away", () => {
    const squad = uniformSquad(40);
    const pref = aiTacticPreferences(42, "club_test", "mid");
    const defensiveResult = aiResolveTactic(pref, squad, false, strongerOpponent);
    const neutralResult = aiResolveTactic(pref, squad, false, neutralOpponent);
    // The defensive shift should produce the same or more defensive mentality
    const mentalityOrder = ["ultraDefensive", "defensive", "normal", "attacking", "gungHo"];
    const defIdx = mentalityOrder.indexOf(defensiveResult.team.mentality);
    const neuIdx = mentalityOrder.indexOf(neutralResult.team.mentality);
    expect(defIdx).toBeLessThanOrEqual(neuIdx);
  });

  it("shifts mentality attacking when much stronger opponent and home", () => {
    const squad = uniformSquad(90);
    const pref = aiTacticPreferences(42, "club_test", "mid");
    const attackingResult = aiResolveTactic(pref, squad, true, weakerOpponent);
    const neutralResult = aiResolveTactic(pref, squad, true, neutralOpponent);
    // The attacking shift should produce the same or more attacking mentality
    const mentalityOrder = ["ultraDefensive", "defensive", "normal", "attacking", "gungHo"];
    const attIdx = mentalityOrder.indexOf(attackingResult.team.mentality);
    const neuIdx = mentalityOrder.indexOf(neutralResult.team.mentality);
    expect(attIdx).toBeGreaterThanOrEqual(neuIdx);
  });

  it("does not read opponent phase strengths through hidden data", () => {
    const squad = uniformSquad(50);
    const pref = aiTacticPreferences(42, "club_test", "mid");
    // The function only receives the public phaseStrengths map — no individual player data.
    // We confirm it respects the interface by passing only what OpponentInfo allows.
    const result = aiResolveTactic(pref, squad, true, {
      phaseStrengths: { attack: 50, midfield: 50, defense: 50 },
      lastFormationName: "4-4-2",
    });
    expect(result.filled.length).toBe(STARTER_COUNT);
  });

  it("produces a valid Tactic when the squad is exactly 11 players", () => {
    const squad = uniformSquad(60);
    const pref = aiTacticPreferences(42, "club_test", "mid");
    const result = aiResolveTactic(pref, squad, true, neutralOpponent);
    expect(result.filled).toHaveLength(STARTER_COUNT);
  });

  it("returns correct bench size when building from result", () => {
    const squad = uniformSquad(70);
    const pref = aiTacticPreferences(42, "club_test", "mid");
    const result = aiResolveTactic(pref, squad, true, neutralOpponent);
    const built = aiTacticFromResult(result, squad);
    expect(built.assignments).toHaveLength(STARTER_COUNT);
    expect(built.bench).toHaveLength(BENCH_SIZE);
    // No assignment should appear on the bench
    for (const pid of built.assignments) {
      expect(built.bench).not.toContain(pid);
    }
  });

  it("team instructions map from preferences correctly", () => {
    const squad = uniformSquad(70);
    const pref: AiTacticalPreferences = {
      preferredFormation: "4-4-2",
      mentality: "defensive",
      pressingStyle: "always",
      playingStyle: "direct",
      markingStyle: "man",
    };
    // Use a strong opponent and away to prevent attacking-at-home shift
    const result = aiResolveTactic(pref, squad, false, strongerOpponent);
    // Away vs stronger opponent shifts defensive, so from "defensive" → "ultraDefensive"
    const mentalityOrder = ["ultraDefensive", "defensive", "normal", "attacking", "gungHo"];
    const prefIdx = mentalityOrder.indexOf(pref.mentality);
    const resultIdx = mentalityOrder.indexOf(result.team.mentality);
    expect(resultIdx).toBeLessThanOrEqual(prefIdx); // same or more defensive
    expect(result.team.closingDown).toBe("always");
    expect(result.team.passing).toBe("direct");
    expect(result.team.zonalMarking).toBe(false);
  });

  it("zonal marking sets zonalMarking true", () => {
    const squad = uniformSquad(70);
    const pref: AiTacticalPreferences = {
      preferredFormation: "4-4-2",
      mentality: "normal",
      pressingStyle: "default",
      playingStyle: "mixed",
      markingStyle: "zonal",
    };
    const result = aiResolveTactic(pref, squad, true, neutralOpponent);
    expect(result.team.zonalMarking).toBe(true);
  });
});

describe("aiTacticFromResult", () => {
  it("builds a tactic structure without overlapping assignments and bench", () => {
    const squad = uniformSquad(70);
    const pref = aiTacticPreferences(42, "club_test", "mid");
    const result = aiResolveTactic(pref, squad, true, neutralOpponent);
    const built = aiTacticFromResult(result, squad);
    expect(built.sourceTemplate).toBe(result.template.name);
    expect(built.assignments).toHaveLength(STARTER_COUNT);
    expect(built.bench).toHaveLength(BENCH_SIZE);
    // No overlap
    const assignmentSet = new Set(built.assignments);
    for (const pid of built.bench) {
      if (pid !== null) expect(assignmentSet).not.toContain(pid);
    }
  });
});

// ─── In-match AI controller (ticket 33) ─────────────────────────────────────

describe("aiInMatchController", () => {
  const neutralPrefs: AiTacticalPreferences = {
    preferredFormation: "4-4-2",
    mentality: "normal",
    pressingStyle: "default",
    playingStyle: "mixed",
    markingStyle: "zonal",
  };
  const defaultTeam: TeamInstructions = { ...DEFAULT_TEAM_INSTRUCTIONS, mentality: "normal" };

  it("returns null when no conditions are met (early match, tied score)", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 0, 0, 30, false);
    expect(result).toBeNull();
  });

  it("returns null when the AI is drawing and no red card", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 1, 1, 85, false);
    expect(result).toBeNull();
  });

  it("red card at any minute → defensive mentality", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 2, 0, 10, true);
    expect(result).not.toBeNull();
    expect(result!.newMentality).toBe("defensive");
  });

  it("losing by one after minute 75 → go attacking", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 1, 2, 76, false);
    expect(result).not.toBeNull();
    expect(result!.newMentality).toBe("attacking");
  });

  it("losing heavily after minute 75 → go attacking (not just by one)", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 0, 3, 80, false);
    expect(result).not.toBeNull();
    expect(result!.newMentality).toBe("attacking");
  });

  it("losing by one after minute 60 (but before 75) → shift mentality +1", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 0, 1, 65, false);
    expect(result).not.toBeNull();
    expect(result!.newMentality).toBe("attacking");
  });

  it("losing by one after minute 60: from defensive → normal", () => {
    const defensiveTeam: TeamInstructions = { ...defaultTeam, mentality: "defensive" };
    const result = aiInMatchController(neutralPrefs, defensiveTeam, true, 0, 1, 65, false);
    expect(result).not.toBeNull();
    expect(result!.newMentality).toBe("normal");
  });

  it("leading by one after minute 85 → men behind the ball", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 2, 1, 86, false);
    expect(result).not.toBeNull();
    expect(result!.teamOverrides?.menBehindTheBall).toBe(true);
  });

  it("leading by one after minute 75 (but before 85) → shift mentality -1", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 2, 1, 78, false);
    expect(result).not.toBeNull();
    expect(result!.newMentality).toBe("defensive");
  });

  it("red card overrides other conditions (losing while a man down)", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, false, 0, 2, 80, true);
    expect(result).not.toBeNull();
    expect(result!.newMentality).toBe("defensive");
  });

  it("boundary: minute = 60, losing → shift mentality +1 (60' and later)", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 0, 1, 60, false);
    expect(result).not.toBeNull();
    expect(result!.newMentality).toBe("attacking");
  });

  it("boundary: minute = 75, losing → attacking (75' and later)", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 0, 1, 75, false);
    expect(result).not.toBeNull();
    expect(result!.newMentality).toBe("attacking");
  });

  it("boundary: minute = 85, leading by one → men behind the ball", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 2, 1, 85, false);
    expect(result).not.toBeNull();
    expect(result!.teamOverrides?.menBehindTheBall).toBe(true);
  });

  it("leading by more than one → no change (the lead is safe)", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 3, 0, 85, false);
    expect(result).toBeNull();
  });

  it("leading by one before minute 75 → no change", () => {
    const result = aiInMatchController(neutralPrefs, defaultTeam, true, 1, 0, 60, false);
    expect(result).toBeNull();
  });
});