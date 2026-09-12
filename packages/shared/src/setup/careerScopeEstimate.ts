/**
 * Career scope estimates (§11): what a selection will cost the machine that runs it.
 *
 * Split out of `./leagueSelection/index.js`, which resolves *what* is selected. This module answers the
 * separate question of whether that selection is affordable, and it is the only part of the
 * selection layer whose answer depends on the machine rather than on the catalogue.
 */

import { competitionIndex, type LeagueSetupIndex, type SimulationMode } from "./leagueSetup.js";
import type { IssueCode, IssueLevel, ResolvedSelection, SelectionIssue } from "./leagueSelection/index.js";

/** Local mirror of `leagueSelection`'s private constructor: estimate issues are the same shape,
 *  and exporting the helper there would widen that module's public surface for one caller. */
const issue = (
  code: IssueCode,
  level: IssueLevel,
  message: string,
  nationId: string | null = null,
  competitionIds: readonly string[] = [],
): SelectionIssue => ({ code, level, message, nationId, competitionIds });

// ---------------------------------------------------------------------------
// Estimates (§11)
// ---------------------------------------------------------------------------

export const SIMULATION_SPEED_RATINGS = [
  "very_fast",
  "fast",
  "medium",
  "slow",
  "very_slow",
  "unsupported",
] as const;

export type SimulationSpeedRating = (typeof SIMULATION_SPEED_RATINGS)[number];

export interface SystemCapabilityProfile {
  readonly totalMemoryBytes: number;
  /** 1.0 is the reference machine the cost table was calibrated on; 2.0 is twice as fast. */
  readonly performanceIndex: number;
}

export const DEFAULT_SYSTEM_PROFILE: SystemCapabilityProfile = {
  totalMemoryBytes: 8 * 1024 * 1024 * 1024,
  performanceIndex: 1,
};

export interface CareerScopeEstimate {
  readonly selectedNationCount: number;
  readonly playableNationCount: number;
  readonly backgroundNationCount: number;
  readonly playableCompetitionCount: number;
  readonly backgroundCompetitionCount: number;
  readonly estimatedClubCount: number;
  readonly estimatedPlayerCount: number;
  readonly estimatedStaffCount: number;
  readonly estimatedMemoryBytes: number;
  readonly estimatedInitialSaveBytes: number;
  readonly simulationSpeedRating: SimulationSpeedRating;
  readonly confidence: "low" | "medium" | "high";
}

/**
 * Per-mode multipliers. Deliberately coarse: §11.4 forbids implying a precision the model does
 * not have, and every figure derived from these is rendered rounded and hedged.
 */
export const SQUAD_SIZE: Readonly<Record<SimulationMode, number>> = {
  playable: 25,
  background: 22,
  // §9.3: view-only keeps standings and results, not squads.
  view_only: 0,
  not_loaded: 0,
};

export const STAFF_PER_CLUB: Readonly<Record<SimulationMode, number>> = {
  playable: 8,
  background: 3,
  view_only: 0,
  not_loaded: 0,
};

/** Relative per-match processing cost by mode. Playable is the unit. */
export const MATCH_COST: Readonly<Record<SimulationMode, number>> = {
  playable: 1,
  background: 0.25,
  view_only: 0.05,
  not_loaded: 0,
};

const BASE_MEMORY_BYTES = 256 * 1024 * 1024;
const BYTES_PER_PLAYER = 3_500;
const BYTES_PER_CLUB = 40_000;
const BYTES_PER_MATCH = 1_200;

const BASE_SAVE_BYTES = 4 * 1024 * 1024;
const SAVE_BYTES_PER_PLAYER = 1_400;
const SAVE_BYTES_PER_CLUB = 12_000;

/** Cost-score cut points, in reference-machine match-cost units, for the §11.2 categorical rating. */
const SPEED_THRESHOLDS: readonly (readonly [number, SimulationSpeedRating])[] = [
  [1_500, "very_fast"],
  [6_000, "fast"],
  [18_000, "medium"],
  [40_000, "slow"],
  [90_000, "very_slow"],
];

/**
 * Estimate the cost of an already-resolved selection. Pure and fast — the debounce and
 * cancellation §11.5 asks for live at the call site, not here, because a function that takes
 * microseconds has nothing to cancel.
 */
export const estimateCareerScope = (
  index: LeagueSetupIndex,
  resolved: ResolvedSelection,
  profile: SystemCapabilityProfile = DEFAULT_SYSTEM_PROFILE,
): CareerScopeEstimate => {
  const competitions = competitionIndex(index);

  let clubs = 0;
  let players = 0;
  let staff = 0;
  let matches = 0;
  let costScore = 0;
  let playableCompetitions = 0;
  let backgroundCompetitions = 0;
  let verified = 0;
  let total = 0;

  for (const record of resolved.dependencies) {
    const node = competitions.get(record.competitionId);
    if (node === undefined) continue;
    total += 1;
    if (node.estimatesVerified) verified += 1;

    clubs += node.clubCount;
    players += node.clubCount * SQUAD_SIZE[record.mode];
    staff += node.clubCount * STAFF_PER_CLUB[record.mode];
    matches += node.annualMatches;
    costScore += node.annualMatches * MATCH_COST[record.mode];

    if (record.mode === "playable") playableCompetitions += 1;
    else if (record.mode === "background") backgroundCompetitions += 1;
  }

  const adjustedCost = costScore / Math.max(profile.performanceIndex, 0.1);
  const estimatedMemoryBytes =
    BASE_MEMORY_BYTES + players * BYTES_PER_PLAYER + clubs * BYTES_PER_CLUB + matches * BYTES_PER_MATCH;

  // A selection that cannot fit in memory is `unsupported` rather than merely very slow: §16.3
  // wants a blocking signal the summary can render without pretending a speed exists.
  const simulationSpeedRating: SimulationSpeedRating =
    estimatedMemoryBytes > profile.totalMemoryBytes
      ? "unsupported"
      : (SPEED_THRESHOLDS.find(([limit]) => adjustedCost <= limit)?.[1] ?? "very_slow");

  const playableNations = resolved.selections.filter((s) => s.playableCompetitionIds.length > 0);
  const backgroundNations = resolved.selections.filter(
    (s) => s.playableCompetitionIds.length === 0 && s.backgroundCompetitionIds.length > 0,
  );

  const verifiedShare = total === 0 ? 1 : verified / total;

  return {
    selectedNationCount: resolved.selections.length,
    playableNationCount: playableNations.length,
    backgroundNationCount: backgroundNations.length,
    playableCompetitionCount: playableCompetitions,
    backgroundCompetitionCount: backgroundCompetitions,
    estimatedClubCount: clubs,
    estimatedPlayerCount: players,
    estimatedStaffCount: staff,
    estimatedMemoryBytes,
    estimatedInitialSaveBytes:
      BASE_SAVE_BYTES + players * SAVE_BYTES_PER_PLAYER + clubs * SAVE_BYTES_PER_CLUB,
    simulationSpeedRating,
    confidence: verifiedShare === 1 ? "high" : verifiedShare >= 0.5 ? "medium" : "low",
  };
};

/**
 * Issues the estimate itself raises (§15, §16.2). Kept apart from `resolveSelection` because they
 * depend on the machine, and a selection that is merely slow here is valid everywhere else.
 */
export const estimateIssues = (estimate: CareerScopeEstimate): readonly SelectionIssue[] => {
  if (estimate.simulationSpeedRating === "unsupported") {
    return [
      issue(
        "heavy_selection",
        "blocking",
        "This selection needs more memory than this computer has. Reduce the number of loaded leagues.",
      ),
    ];
  }
  if (estimate.simulationSpeedRating === "very_slow" || estimate.simulationSpeedRating === "slow") {
    return [
      issue(
        "heavy_selection",
        "warning",
        "This selection is large. Processing a day of the season may take noticeably longer on this computer.",
      ),
    ];
  }
  return [];
};
