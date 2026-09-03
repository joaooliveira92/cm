/**
 * The consequence layer of the Active Leagues setup screen: what the configuration costs and why.
 *
 * Everything here is pure and derived, with no I/O, per the Active Leagues Setup spec's
 * "One authoritative setup state; everything else is derived" decision. The three reads —
 * the entity count, the processing-cost classification, and the per-league recommendation
 * reasons — all consume the *projection rows* (`ActiveLeaguesProjection`, the same model
 * ticket 01 ships) plus the catalogue, so a sidebar built on them can never disagree with
 * the rows it sits beside. Unknown leagues and empty scopes are checked values, never throws:
 * an unknown league resolves to a neutral recommendation, an empty scope to an all-zero estimate.
 *
 * The whole slice answers three shapes:
 *
 * - `ActiveLeaguesEntityEstimate` — clubs, players, staff, and the loaded-entity total,
 *   derived from each row's depth (a dependency reads `standard`, a view-only row carries
 *   no squads) rather than a hardcoded number, so the figure moves with every edit.
 * - `ProcessingCostReading` — a five-segment meter with a human-readable category and a
 *   warning only when the setup is unusually expensive. The meter is machine-independent:
 *   a rating of the configuration's workload, never a claim about what this computer can
 *   run, so its copy speaks of longer processing intervals and makes no hardware claim.
 * - `LeagueRecommendation` — one reason per active league, resolved from data the simulation
 *   actually reads: dependency relationships, preset membership, Nation Profile recruitment
 *   links, and scope/tier structure. Every reason carries icon and visible text; icon alone
 *   is banned. No reason is ever club-grounded — the club is chosen on a later step.
 *
 * Copy here stays under the Contextual Help Mechanical Provenance rule: each phrase traces
 * to an authoritative source (a dependency record, an intent source, a `MIGRATION_LINKS`
 * weight, a tier/scope), and presentation never invents causality the model lacks.
 */

import {
  DEFAULT_ADVANCED_OPTIONS,
  estimateFactorsFor,
  type AdvancedOptionsState,
} from "./advancedOptions.js";
import {
  competitionIndex,
  nationIndex,
  type LeagueSetupIndex,
  type NationNode,
} from "./leagueSetup.js";
import {
  MATCH_COST,
  SQUAD_SIZE,
  STAFF_PER_CLUB,
  type ActiveLeaguesProjection,
  type NationSelectionIntent,
  type ResolvedSelection,
} from "./leagueSelection.js";
import { catalogueName } from "./contentPack.js";
import { MIGRATION_LINKS, type NationCode } from "./nations.js";
import { modeFromDepth } from "./simulation.js";

// ---------------------------------------------------------------------------
// Entity count (§"Database preset is out of scope" and the sidebar contract)
// ---------------------------------------------------------------------------

export interface ActiveLeaguesEntityEstimate {
  /** Number of active competitions, directly from the projection's rows. */
  readonly activeLeagueCount: number;
  readonly clubCount: number;
  readonly playerCount: number;
  readonly staffCount: number;
  /** clubs + players + staff — the "loaded entities" figure the sidebar shows. */
  readonly entityCount: number;
}

/**
 * Estimate the loaded entities from the projection rows and their depth. The depth grain maps
 * onto the established per-mode densities (§9.3: view-only rows keep standings, not squads), so
 * a competition the rows report at `results-only` contributes its clubs and nothing else. A row
 * whose competition is missing from the catalogue contributes nothing rather than throwing.
 *
 * The advanced options feed the player count: roster-generation detail scales how many players
 * each loaded club carries, so a *changed* option moves the entity figure the sidebar shows.
 * The default (shipped) configuration multiplies by exactly `1`, so an untouched setup produces
 * the ticket-02 numbers unchanged.
 */
export const estimateActiveLeaguesEntities = (
  index: LeagueSetupIndex,
  projection: ActiveLeaguesProjection,
  options: AdvancedOptionsState = DEFAULT_ADVANCED_OPTIONS,
): ActiveLeaguesEntityEstimate => {
  const competitions = competitionIndex(index);
  const rosterPlayer = estimateFactorsFor(options).rosterPlayer;

  let clubs = 0;
  let players = 0;
  let staff = 0;

  for (const row of projection.rows) {
    const node = competitions.get(row.leagueId);
    if (node === undefined) continue;
    const mode = modeFromDepth(row.depth);
    clubs += node.clubCount;
    players += Math.round(node.clubCount * SQUAD_SIZE[mode] * rosterPlayer);
    staff += node.clubCount * STAFF_PER_CLUB[mode];
  }

  return {
    activeLeagueCount: projection.rows.length,
    clubCount: clubs,
    playerCount: players,
    staffCount: staff,
    entityCount: clubs + players + staff,
  };
};

// ---------------------------------------------------------------------------
// Processing-cost classification (the five-segment meter)
// ---------------------------------------------------------------------------

export const PROCESSING_COST_METER_MAX = 5;

export const PROCESSING_COST_CATEGORIES = ["light", "balanced", "heavy", "very_heavy"] as const;

export type ProcessingCostCategory = (typeof PROCESSING_COST_CATEGORIES)[number];

export const EXPENSIVE_SETUP_WARNING =
  "This configuration is expected to produce longer processing intervals.";

/** The score at which a setup reads "unusually expensive" and earns the warning. */
export const EXPENSIVE_THRESHOLD = 4;

export interface ProcessingCostReading {
  /** 1–5, the number of filled segments in the CM Clone-native five-segment bar. */
  readonly meterValue: number;
  readonly category: ProcessingCostCategory;
  /** Human-readable category label ("Light", "Balanced", "Heavy", "Very heavy"). */
  readonly label: string;
  /** Concise explanation of what the meter is estimated from. */
  readonly explanation: string;
  /** Present only when the setup is unusually expensive. Never a hardware-capability claim. */
  readonly expensiveWarning: string | null;
}

const METER_THRESHOLDS: readonly (readonly [number, number])[] = [
  [500, 1], // one playable top division
  [1_200, 2], // a small pyramid
  [3_000, 3], // a large pyramid or a couple of Nations
  [6_000, 4], // several Nations at depth
  // above 6 000 -> 5, unusually expensive
];

const CATEGORY_BY_METER: Readonly<Record<number, { readonly category: ProcessingCostCategory; readonly label: string }>> = {
  1: { category: "light", label: "Light" },
  2: { category: "light", label: "Light" },
  3: { category: "balanced", label: "Balanced" },
  4: { category: "heavy", label: "Heavy" },
  5: { category: "very_heavy", label: "Very heavy" },
};

/**
 * Classify the configuration's processing cost from the projection rows. The meter is derived in
 * the same reference-machine match-cost units as the career-scope estimate, but it is deliberately
 * machine-independent: it rates the *configuration*, so it never claims hardware benchmarking no
 * code performs. The advanced options feed the same score: match-simulation detail and
 * transfer-market activity scale how much per-match and per-window work the engine does, so a
 * *changed* option moves the sidebar meter. The default (shipped) configuration multiplies by
 * exactly `1`, so an untouched setup produces the ticket-02 numbers unchanged.
 */
export const estimateProcessingCost = (
  index: LeagueSetupIndex,
  projection: ActiveLeaguesProjection,
  options: AdvancedOptionsState = DEFAULT_ADVANCED_OPTIONS,
): ProcessingCostReading => {
  const competitions = competitionIndex(index);
  const { matchSimulation, transferMarket } = estimateFactorsFor(options);

  let score = 0;
  for (const row of projection.rows) {
    const node = competitions.get(row.leagueId);
    if (node === undefined) continue;
    score += node.annualMatches * MATCH_COST[modeFromDepth(row.depth)];
  }
  score *= matchSimulation * transferMarket;

  const meterValue = METER_THRESHOLDS.find(([limit]) => score <= limit)?.[1] ?? 5;
  const { category, label } = CATEGORY_BY_METER[meterValue] ?? CATEGORY_BY_METER[1]!;

  return {
    meterValue,
    category,
    label,
    explanation: "Estimated from the active leagues, their simulation depth, and the advanced options.",
    expensiveWarning: meterValue >= EXPENSIVE_THRESHOLD ? EXPENSIVE_SETUP_WARNING : null,
  };
};

// ---------------------------------------------------------------------------
// Per-league recommendation reasons
// ---------------------------------------------------------------------------

export const RECOMMENDATION_REASON_CODES = [
  "preset",
  "recruitment",
  "dependency",
  "structure",
  "neutral",
] as const;

export type RecommendationReasonCode = (typeof RECOMMENDATION_REASON_CODES)[number];

/** The icon keys the renderer maps onto its icon set. Each reason carries one; icon alone is
 *  banned, so `text` is always present alongside it. */
export const RECOMMENDATION_ICONS = [...RECOMMENDATION_REASON_CODES] as const;

export type RecommendationIcon = (typeof RECOMMENDATION_ICONS)[number];

export interface RecommendationReason {
  readonly code: RecommendationReasonCode;
  readonly icon: RecommendationIcon;
  /** Visible text, traceable to authoritative game data per Mechanical Provenance. */
  readonly text: string;
}

export interface LeagueRecommendation {
  readonly leagueId: string;
  readonly reason: RecommendationReason;
}

const reason = (code: RecommendationReasonCode, text: string): RecommendationReason => ({
  code,
  icon: code,
  text,
});

const NEUTRAL_REASON = reason("neutral", "No specific recommendation for this league.");

/**
 * A Nation is a *territory* when its content is not purely cross-border containers. The
 * confederation branches ("European Competitions", "South American Competitions") carry a borrowed
 * member code — England for UEFA, Brazil for CONMEBOL — so reading `MIGRATION_LINKS` off them
 * would attribute one territory's player market to a tournament container. Excluding them keeps a
 * recruitment reason honest: it says *this Nation's* clubs recruit, never a container's.
 */
const isTerritoryNation = (nation: NationNode): boolean =>
  nation.competitions.length > 0 &&
  nation.competitions.every((competition) => competition.kind !== "continental");

/**
 * Resolve one recommendation reason per active league, in the same order as the projection's rows.
 * Precedence is fixed so the answer is deterministic: a dependency is always explained as a
 * dependency; a league its Nation never deliberately chose is explained by where it came from
 * (preset membership); otherwise a Nation Profile recruitment link to an already-active Nation,
 * then the scope/tier structure, then a neutral fallback. Failures are checked values: an unknown
 * league yields the neutral reason, never a throw.
 *
 * No reason is ever club-grounded — the club is chosen on a later step, so a club-based reading
 * would be a claim the model has no referent for (spec's "club identity ... do not exist at this
 * step" decision).
 */
export const resolveLeagueRecommendations = (
  index: LeagueSetupIndex,
  projection: ActiveLeaguesProjection,
  resolved: ResolvedSelection,
  intents: readonly NationSelectionIntent[],
): readonly LeagueRecommendation[] => {
  const competitions = competitionIndex(index);
  const nations = nationIndex(index);

  const sourceByNation = new Map(intents.map((intent) => [intent.nationId, intent.source]));

  const territories = new Map<string, NationNode>();
  for (const nation of nations.values()) {
    if (isTerritoryNation(nation)) territories.set(nation.id, nation);
  }

  const activeTerritoryCodes = new Set<string>();
  for (const row of projection.rows) {
    const territory = territories.get(row.nationId);
    if (territory !== undefined) activeTerritoryCodes.add(territory.code);
  }

  const territoryByCode = new Map([...territories.values()].map((nation) => [nation.code, nation]));

  return projection.rows.map((row): LeagueRecommendation => {
    const node = competitions.get(row.leagueId);
    if (node === undefined) return { leagueId: row.leagueId, reason: NEUTRAL_REASON };

    if (row.isDependency) {
      const record = resolved.dependencies.find(
        (dependency) => dependency.competitionId === row.leagueId,
      );
      const requiredBy = (record?.requiredBy ?? []).map((id) => catalogueName(id));
      const text =
        requiredBy.length === 0
          ? "Required competition in this setup"
          : `Required by ${requiredBy.join(", ")}`;
      return { leagueId: row.leagueId, reason: reason("dependency", text) };
    }

    const source = sourceByNation.get(row.nationId);
    if (source === "preset" || source === "recommended" || source === "restored") {
      const text =
        source === "preset"
          ? "Included via the setup preset"
          : source === "recommended"
            ? "Included via the recommended setup"
            : "Restored from a saved setup draft";
      return { leagueId: row.leagueId, reason: reason("preset", text) };
    }

    const nation = nations.get(row.nationId);
    if (nation !== undefined && territories.has(nation.id)) {
      for (const [targetCode, weight] of Object.entries(MIGRATION_LINKS[nation.code] ?? {})) {
        // `Object.entries` widens the keys to `string`; they are `NationCode`s by construction
        // (the keys of `MIGRATION_LINKS`), so the narrowing cast is not a leap of faith.
        const target = territoryByCode.get(targetCode as NationCode);
        if (
          weight !== undefined &&
          weight > 0 &&
          targetCode !== nation.code &&
          target !== undefined &&
          activeTerritoryCodes.has(targetCode as NationCode)
        ) {
          return {
            leagueId: row.leagueId,
            reason: reason(
              "recruitment",
              `${nation.name} clubs recruit players from ${target.name}`,
            ),
          };
        }
      }
    }

    if (nation !== undefined && node.kind === "league" && node.tier === 1) {
      return {
        leagueId: row.leagueId,
        reason: reason("structure", `Top division of ${nation.name}`),
      };
    }

    if (row.scopeDescription.trim().length > 0) {
      return {
        leagueId: row.leagueId,
        reason: reason("structure", `Part of ${row.scopeDescription}`),
      };
    }

    return { leagueId: row.leagueId, reason: NEUTRAL_REASON };
  });
};

// ---------------------------------------------------------------------------
// The combined read the sidebar consumes
// ---------------------------------------------------------------------------

export interface ActiveLeaguesConsequences {
  readonly entityEstimate: ActiveLeaguesEntityEstimate;
  readonly processingCost: ProcessingCostReading;
  readonly recommendations: readonly LeagueRecommendation[];
}

/** One call for the whole consequence panel, so a caller cannot accidentally read a different
 *  projection than the rows it derived its figures from. The advanced options feed the same
 *  estimate so the sidebar's consequence feedback reacts to a changed option the moment it
 *  changes; the default configuration keeps the ticket-02 numbers identical. */
export const estimateActiveLeaguesConsequences = (
  index: LeagueSetupIndex,
  projection: ActiveLeaguesProjection,
  resolved: ResolvedSelection,
  intents: readonly NationSelectionIntent[],
  options: AdvancedOptionsState = DEFAULT_ADVANCED_OPTIONS,
): ActiveLeaguesConsequences => ({
  entityEstimate: estimateActiveLeaguesEntities(index, projection, options),
  processingCost: estimateProcessingCost(index, projection, options),
  recommendations: resolveLeagueRecommendations(index, projection, resolved, intents),
});