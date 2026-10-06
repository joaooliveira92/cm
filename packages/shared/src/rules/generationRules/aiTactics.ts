/**
 * Seeded AI tactical preferences and pre-match tactic choice (formations-and-instructions ticket 32).
 *
 * Every AI club derives CM's five staff preferences deterministically from the world seed, its club
 * id and its stature tier — no stored rows. Before each match the AI starts from its preferred
 * template, falls back to the best-fitting template when the squad is unsuited to it, maps style
 * preferences onto Team Instructions, and shifts Mentality one step by relative strength and venue.
 *
 * The module is pure and in `shared` so the desktop wiring layer consumes it as a function call
 * rather than an Effect service.
 */
import { createSeededRng, pickRandom } from "../../random.js";
import { deriveSeed } from "../../seed.js";
import type { StatureTier } from "@cm-clone/content";
import { bestXiForCells, selectBestTemplateXI, selectBench, type BestXiCell, type CellRatingsLike, type BenchCandidate } from "./bestXi.js";
import { slotLabel } from "../positionRules/slots.js";
import {
  BUILT_IN_TEMPLATES,
  BUILT_IN_TEMPLATE_NAMES,
  builtInTemplate,
} from "../tacticalRules/tacticTemplates.js";
import {
  DEFAULT_TEAM_INSTRUCTIONS,
  TEAM_INSTRUCTION_VALUES,
  type TacticTemplate,
  type TeamInstructions,
} from "../tacticalRules/tacticModel.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * CM's five staff preferences for an AI club, derived from (worldSeed, clubId, statureTier).
 * Every value is a seeded draw — never read from a stored row.
 */
export interface AiTacticalPreferences {
  /** One of the 29 built-in template names, the club's preferred formation. */
  readonly preferredFormation: string;
  /** The team Mentality the AI would set, biased by stature tier. */
  readonly mentality: TeamInstructions["mentality"];
  /** Pressing Style → the team closingDown instruction. */
  readonly pressingStyle: TeamInstructions["closingDown"];
  /** Playing Style → the team passing instruction. */
  readonly playingStyle: TeamInstructions["passing"];
  /** Marking Style → zonal or man marking at the team level. */
  readonly markingStyle: "zonal" | "man";
}

/**
 * The public information about an opponent an AI club may read for its pre-match decision:
 * Phase Strengths and the last-used formation. No hidden data (individual player ratings,
 * morale, fitness, etc.).
 */
export interface OpponentInfo {
  /** The opponent's resolved Phase Strengths (attack / midfield / defense), 0-100. */
  readonly phaseStrengths: { readonly attack: number; readonly midfield: number; readonly defense: number };
  /** The name of the opponent's last-used formation template. */
  readonly lastFormationName: string;
}

/**
 * A squad player with the cell-level data the AI needs: fit ratings for best-XI selection,
 * suitability for the fallback check, and positional data for bench selection.
 */
export interface AiPlayerLike<Id extends string = string> extends CellRatingsLike<Id> {
  readonly suitability: Readonly<Record<string, number>>;
  readonly positionRatings: Record<string, number>;
  readonly positions: ReadonlyArray<{ readonly position: string; readonly familiarity: string }>;
}

/**
 * The result of `aiResolveTactic`: the template, its best-XI fill, the mean fit rating, and the
 * Team Instructions the AI settled on after preference mapping and venue/strength adjustment.
 */
export interface AiTacticResult<Id extends string = string> {
  /** The chosen template (preferred or fallback). */
  readonly template: TacticTemplate;
  /** The best-XI fill for this template, in slot order, player ids with cell and rating. */
  readonly filled: ReadonlyArray<BestXiCell<Id>>;
  /** Mean fit rating across the filled XI. */
  readonly meanRating: number;
  /** The Team Instructions after preference mapping and mentality shift. */
  readonly team: TeamInstructions;
}

/**
 * In-match tactical controller response: what the AI wants to change.
 * The controller is called by the engine hook; the main process converts this
 * into MatchCommand objects.
 */
export interface AiInMatchChange {
  /** The new target formation name, or null to keep current. */
  readonly newFormation?: string;
  /** The new mentality, or null to keep current. */
  readonly newMentality?: TeamInstructions["mentality"];
  /** New team instruction overrides, or empty for no change. */
  readonly teamOverrides?: Partial<TeamInstructions>;
}

// ---------------------------------------------------------------------------
// Mentality ordering for the shift-by-strength step
// ---------------------------------------------------------------------------

const MENTALITY_ORDER: ReadonlyArray<TeamInstructions["mentality"]> = [
  "ultraDefensive",
  "defensive",
  "normal",
  "attacking",
  "gungHo",
];

const MENTALITY_INDEX: Readonly<Record<TeamInstructions["mentality"], number>> = Object.fromEntries(
  MENTALITY_ORDER.map((value, index) => [value, index]),
) as Record<TeamInstructions["mentality"], number>;

/** Shift mentality one step: -1 = more defensive, +1 = more attacking. Clamps at the ends. */
const shiftMentality = (
  current: TeamInstructions["mentality"],
  direction: -1 | 1,
): TeamInstructions["mentality"] => {
  const index = MENTALITY_INDEX[current];
  const next = Math.max(0, Math.min(MENTALITY_ORDER.length - 1, index + direction));
  return MENTALITY_ORDER[next]!;
};

// ---------------------------------------------------------------------------
// Preference derivation
// ---------------------------------------------------------------------------

/**
 * Mentality draw pool by stature tier: big clubs biased toward attacking, small clubs toward
 * defensive, mid clubs spread across the full range.
 */
const MENTALITY_BIAS: Record<StatureTier, ReadonlyArray<TeamInstructions["mentality"]>> = {
  big: ["normal", "attacking", "gungHo"],
  mid: ["defensive", "normal", "attacking"],
  small: ["ultraDefensive", "defensive", "normal"],
};

/**
 * Playing style (passing) draw pool by stature tier: big clubs lean direct/long, small clubs
 * lean short.
 */
const PASSING_BIAS: Record<StatureTier, ReadonlyArray<TeamInstructions["passing"]>> = {
  big: ["mixed", "direct", "long"],
  mid: ["mixed", "short", "direct"],
  small: ["mixed", "short"],
};

/**
 * Derives an AI club's five tactical preferences from the world seed, its club id and its stature tier.
 *
 * Each preference is drawn from its own independently seeded stream (one per field, so adding a
 * preference never shifts another). Big clubs bias toward attacking mentality and direct/long
 * passing; small clubs toward defensive mentality and short passing.
 *
 * Pure and deterministic — same inputs always produce the same preferences.
 */
export const aiTacticPreferences = (
  worldSeed: number,
  clubId: string,
  statureTier: StatureTier,
): AiTacticalPreferences => {
  const formationRng = createSeededRng(deriveSeed(worldSeed, "ai-pref", clubId, "formation"));
  const mentalityRng = createSeededRng(deriveSeed(worldSeed, "ai-pref", clubId, "mentality"));
  const pressingRng = createSeededRng(deriveSeed(worldSeed, "ai-pref", clubId, "pressing"));
  const playingRng = createSeededRng(deriveSeed(worldSeed, "ai-pref", clubId, "playing"));
  const markingRng = createSeededRng(deriveSeed(worldSeed, "ai-pref", clubId, "marking"));

  return {
    preferredFormation: pickRandom(BUILT_IN_TEMPLATE_NAMES, formationRng),
    mentality: pickRandom(MENTALITY_BIAS[statureTier], mentalityRng),
    pressingStyle: pickRandom(TEAM_INSTRUCTION_VALUES.closingDown, pressingRng),
    playingStyle: pickRandom(PASSING_BIAS[statureTier], playingRng),
    markingStyle: pickRandom(["zonal", "man"] as const, markingRng),
  };
};

// ---------------------------------------------------------------------------
// Pre-match tactic resolution
// ---------------------------------------------------------------------------

/**
 * Computes the average suitability (1-20) across a template's cells, using the best squad player
 * for each cell. This is the check for whether the squad can work in the preferred template.
 */
const averageSuitabilityForTemplate = <Id extends string>(
  template: TacticTemplate,
  squad: ReadonlyArray<{ readonly id: Id; readonly suitability: Readonly<Record<string, number>> }>,
): number => {
  // For each cell, take the highest suitability among the squad, then average.
  const used = new Set<string>();
  let sum = 0;
  for (const slot of template.slots) {
    const key = slotLabel(slot.cell);
    let best = 0;
    let bestCandidate = "";
    for (const player of squad) {
      if (used.has(player.id)) continue;
      const s = player.suitability[key] ?? 0;
      if (s > best) {
        best = s;
        bestCandidate = player.id;
      }
    }
    if (bestCandidate !== "") {
      used.add(bestCandidate);
    }
    sum += best;
  }
  return template.slots.length === 0 ? 0 : sum / template.slots.length;
};

/**
 * Maps the club's tactical preferences onto Team Instructions. Marking style maps to the
 * `zonalMarking` team switch: "zonal" → true, "man" → false.
 */
const teamFromPreferences = (preferences: AiTacticalPreferences): TeamInstructions => ({
  ...DEFAULT_TEAM_INSTRUCTIONS,
  mentality: preferences.mentality,
  closingDown: preferences.pressingStyle,
  passing: preferences.playingStyle,
  zonalMarking: preferences.markingStyle === "zonal",
});

/**
 * Picks an AI club's pre-match Tactic: start from the preferred template, fall back to the
 * best-fitting template (by fit rating) when the squad's average suitability in the preferred
 * template is below 15 (COMPETENT_SUITABILITY), maps style preferences onto Team Instructions,
 * then shifts Mentality one step by relative strength and venue.
 *
 * The AI reads only the opponent's `phaseStrengths` — no hidden per-player data.
 *
 * Pure and deterministic.
 */
export const aiResolveTactic = <Id extends string = string>(
  preferences: AiTacticalPreferences,
  squad: ReadonlyArray<
    CellRatingsLike<Id> &
    BenchCandidate<Id> & {
      readonly suitability: Readonly<Record<string, number>>;
    }
  >,
  isHome: boolean,
  opponentInfo: OpponentInfo,
): AiTacticResult<Id> => {
  // 1. Start from the preferred template.
  const preferred = builtInTemplate(preferences.preferredFormation);
  if (preferred === undefined) {
    // Should never happen: the formation came from BUILT_IN_TEMPLATE_NAMES. Defensive fallback.
    const best = selectBestTemplateXI(squad);
    if (best === null) {
      // No template can be filled — this club cannot field a side. Return a stub that the caller
      // must check. In practice the caller guards squad size before calling this function.
      const first = BUILT_IN_TEMPLATES[0]!;
      return {
        template: first,
        filled: [],
        meanRating: 0,
        team: teamFromPreferences(preferences),
      };
    }
    return {
      template: best.template,
      filled: best.filled,
      meanRating: best.meanRating,
      team: teamFromPreferences(preferences),
    };
  }

  // 2. Check whether the squad's average suitability in the preferred template is < 15.
  const avgSuitability = averageSuitabilityForTemplate(preferred, squad);
  const template: TacticTemplate =
    avgSuitability >= 15
      ? preferred
      : selectBestTemplateXI(squad)?.template ?? preferred;

  // 3. Build the best XI for the chosen template.
  const cells = template.slots.map((slot) => slot.cell);
  const xi = bestXiForCells(cells, squad);
  // If the squad cannot fill the template, fall back to selectBestTemplateXI.
  const { filled, meanRating } = xi ?? selectBestTemplateXI(squad) ?? { filled: [], meanRating: 0 };

  // 4. Map preferences onto team instructions.
  const team = teamFromPreferences(preferences);

  // 5. Shift Mentality by relative strength and venue.
  //    Own strength = the mean fit rating of the selected XI.
  //    Opponent strength = the maximum of their phase strengths.
  const ownStrength = meanRating;
  const opponentStrength = Math.max(
    opponentInfo.phaseStrengths.attack,
    opponentInfo.phaseStrengths.midfield,
    opponentInfo.phaseStrengths.defense,
  );

  if (!isHome && ownStrength < opponentStrength) {
    // Weaker opponent, away → one step more defensive.
    return {
      template,
      filled,
      meanRating,
      team: { ...team, mentality: shiftMentality(team.mentality, -1) },
    };
  }
  if (isHome && ownStrength > opponentStrength * 1.2) {
    // Much weaker opponent (20%+ stronger), home → one step more attacking.
    return {
      template,
      filled,
      meanRating,
      team: { ...team, mentality: shiftMentality(team.mentality, 1) },
    };
  }

  return { template, filled, meanRating, team };
};

// ---------------------------------------------------------------------------
// In-match tactical controller (ticket 33)
// ---------------------------------------------------------------------------

/**
 * In-match AI tactical controller: decides whether an AI club changes tactics mid-match.
 *
 * Rules from the spec:
 *   - Losing after 60' → Mentality +1
 *   - Losing after 75' → +2 and the attacking variant
 *   - Winning by one after 75' → Mentality -1
 *   - Winning by one after 85' → Men Behind The Ball
 *   - A red card → a template that drops a forward
 *
 * Pure and deterministic: given the same state, always returns the same changes.
 */
export const aiInMatchController = (
  preferences: AiTacticalPreferences,
  currentTeam: TeamInstructions,
  isHome: boolean,
  homeScore: number,
  awayScore: number,
  minute: number,
  justHadRedCard: boolean,
): AiInMatchChange | null => {
  const aiScore = isHome ? homeScore : awayScore;
  const opponentScore = isHome ? awayScore : homeScore;
  const aiLeading = aiScore > opponentScore;
  const aiLosing = opponentScore > aiScore;
  const aiLeadByOne = aiLeading && aiScore - opponentScore <= 1;

  // Red card → drop a forward (shift to defensive)
  if (justHadRedCard) {
    return { newMentality: "defensive" };
  }

  // Late match, losing → push forward
  if (aiLosing && minute >= 75) {
    return { newMentality: "attacking" };
  }
  if (aiLosing && minute >= 60) {
    return { newMentality: shiftMentality(currentTeam.mentality, 1) };
  }

  // Late match, barely winning → sit back
  if (aiLeadByOne && minute >= 85) {
    return { teamOverrides: { menBehindTheBall: true } };
  }
  if (aiLeadByOne && minute >= 75) {
    return { newMentality: shiftMentality(currentTeam.mentality, -1) };
  }

  return null;
};

/**
 * Builds a complete Tactic-like structure from an `AiTacticResult`, ready to be persisted or passed
 * to `toMatchTactic`. Returns the assignments, bench, and team instructions.
 */
export const aiTacticFromResult = <Id extends string = string>(
  result: AiTacticResult<Id>,
  squad: ReadonlyArray<CellRatingsLike<Id> & BenchCandidate<Id>>,
): {
  readonly sourceTemplate: string;
  readonly assignments: ReadonlyArray<Id>;
  readonly bench: ReadonlyArray<Id | null>;
  readonly team: TeamInstructions;
} => {
  const assignments = result.filled.map((entry) => entry.playerId);
  return {
    sourceTemplate: result.template.name,
    assignments,
    bench: selectBench(squad, assignments),
    team: result.team,
  };
};