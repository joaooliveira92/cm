import { createSeededRng, deriveSeed } from "@cm-clone/game-engine";
import type { StatureTier } from "./clubs.js";

/**
 * Results Strength: what stands in for a squad at a club that has none.
 *
 * A `results-only` competition has a full fixture list and a real final table, but its clubs hold no
 * player rows — that is the entire point of the tier. One match simulation costs about a millisecond,
 * so a sixteen-thousand-club world would spend roughly eight seconds of blocking work on every
 * Continue if every fixture ran the engine. A fixture between two squad-less clubs instead resolves
 * from a single number per club.
 *
 * The number is **derived on read and never stored**. Nothing would ever write such a column:
 * results-only clubs have no transfers, no development, no staff, and no contracts, so its only
 * writer would be a deterministic function of data already on disk. Storing it would reintroduce one
 * level up exactly the persisted Current Ability scalar that
 * `2026-08-29-player-ratings-are-derived-projections` refused at the player level.
 *
 * It is **one** number rather than an Attack/Midfield/Defense triple because a results-only
 * competition surfaces standings, fixtures, and results only. Nothing reads the phases separately,
 * so two of three would be read by nothing. It is on the **1-100 Position Rating scale** rather than
 * the 1-20 Attributes scale because it is compared directly against a real squad's Phase Strengths,
 * which are themselves averages of Position Ratings.
 */

/** The measured calibration: generated squads collapsed to the mean of their three Phase Strengths,
 *  over 300 clubs per Stature Tier. The seeded scalar reproduces these bands, so a results-only club
 *  and a squad-bearing club of the same Stature Tier are drawn from the same distribution. */
export interface CalibrationBand {
  readonly mean: number;
  readonly p10: number;
  readonly p90: number;
  readonly min: number;
  readonly max: number;
}

export const RESULTS_STRENGTH_CALIBRATION: Record<StatureTier, CalibrationBand> = {
  big: { mean: 52.8, p10: 47.8, p90: 57.8, min: 41.7, max: 65.0 },
  mid: { mean: 40.8, p10: 36.4, p90: 45.6, min: 30.8, max: 52.1 },
  small: { mean: 31.7, p10: 27.9, p90: 36.0, min: 22.7, max: 41.6 },
};

/**
 * The tiers overlap heavily and deliberately: a strong `small` club (36.0 at p90) outranks a weak
 * `mid` one (36.4 at p10). That overlap is what keeps a results-only league from crowning its
 * biggest club every season — without it a background nation would have no story.
 */

/** Pyramid tier a competition off the ladder is treated as, matching `clubGeneration`. */
const OFF_LADDER_TIER = 3;

/**
 * The ladder term is measured from the middle of a four-tier pyramid rather than from tier 1, so a
 * balanced pyramid's clubs sit symmetrically around their Stature Tier's measured mean instead of
 * all sitting below it.
 */
const REFERENCE_TIER = 2.5;
const PER_TIER = 1.6;
/** Full width of the nation prior's effect. Narrower than the residual spread by construction: the
 *  prior shifts a distribution and never sets a value. */
const NATION_PRIOR_SWING = 3;
/** The per-club draw, in Position Rating points. */
const RESIDUAL_SD = 3.0;

/** How much of last season's fortune carries into this one, and the stationary spread of the walk. */
const WALK_PERSISTENCE = 0.8;
const WALK_SD = 2.0;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** A standard normal from one seeded stream, by Box-Muller. Deterministic in the seed. */
const gaussian = (seed: number): number => {
  const rng = createSeededRng(seed);
  // `next()` can return exactly 0, which `log` does not survive.
  const u1 = Math.max(rng.next(), Number.EPSILON);
  const u2 = rng.next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

export interface ResultsStrengthInputs {
  readonly worldSeed: number;
  readonly clubId: string;
  /** Where this club stands among its own competition's clubs. */
  readonly statureTier: StatureTier;
  /** Pyramid tier of the club's competition, 1 = highest. `null` for a competition off the ladder. */
  readonly tier: number | null;
  /** The nation's 0-1 football-importance prior. */
  readonly nationPrior: number;
  readonly seasonNumber: number;
}

/**
 * The club's fortune this season, as an offset in Position Rating points.
 *
 * An AR(1) walk folded forward from season 1, so a club's fortunes drift continuously rather than
 * being redrawn independently each year — a results-only league where every club's strength is
 * re-rolled annually reads as noise rather than as a football nation having a story.
 *
 * Season 1 is seeded at the walk's *stationary* spread rather than at zero, which is what keeps the
 * calibrated bands identical in every season instead of widening after the first.
 */
const seasonWalk = (inputs: ResultsStrengthInputs): number => {
  const stepSd = WALK_SD * Math.sqrt(1 - WALK_PERSISTENCE * WALK_PERSISTENCE);
  let walk = gaussian(deriveSeed(inputs.worldSeed, "results-strength-walk", inputs.clubId)) * WALK_SD;
  for (let season = 2; season <= inputs.seasonNumber; season += 1) {
    const step = gaussian(deriveSeed(inputs.worldSeed, "results-strength-step", inputs.clubId, season));
    walk = WALK_PERSISTENCE * walk + step * stepSd;
  }
  return walk;
};

/**
 * The club's Results Strength for one season: an integer on the 1-100 Position Rating scale.
 *
 * Pure and total. Two saves generated from the same world seed produce the same number for the same
 * club in the same season, which is what makes a results-only league reproducible without storing a
 * single byte of it.
 */
export const resultsStrength = (inputs: ResultsStrengthInputs): number => {
  const band = RESULTS_STRENGTH_CALIBRATION[inputs.statureTier];
  const ladderTier = inputs.tier ?? OFF_LADDER_TIER;
  const centre =
    band.mean +
    (REFERENCE_TIER - ladderTier) * PER_TIER +
    (inputs.nationPrior - 0.5) * NATION_PRIOR_SWING;
  const residual =
    gaussian(deriveSeed(inputs.worldSeed, "results-strength", inputs.clubId)) * RESIDUAL_SD;

  return Math.round(clamp(centre + residual + seasonWalk(inputs), band.min, band.max));
};

/**
 * The collapse function: a squad-bearing club's strength on the same scale as a results-only one.
 *
 * A cup draws entrants from every loaded competition, so a results-only division can meet a
 * `standard` one and produce a tie the match engine cannot resolve — one side has no players to fill
 * a formation. Depth follows the club's league and a mixed tie resolves at the shallower of the two
 * sides, which means collapsing the squad-bearing side to one number.
 *
 * The collapse discards real information: a club strong in attack and weak in defense meets a
 * results-only opponent as a flat average. That loss is confined to this boundary — every match
 * between two squad-bearing clubs runs the untouched three-phase engine — so it only ever affects
 * matches nobody watches.
 */
export const collapseSquadStrength = (meanPositionRating: number): number =>
  Math.round(clamp(meanPositionRating, 1, 100));

/** Expected goals at a strength difference of zero, and the points of difference that double it. */
const BASE_GOALS = 1.35;
const STRENGTH_PER_DOUBLING = 18;
/** Home advantage, in Position Rating points. */
const HOME_ADVANTAGE = 3;
/** A scoreline the rest of the game can render without a special case. */
const MAX_GOALS = 9;

/** Knuth's method. The rng is seeded per fixture, so the scoreline reproduces. */
const poisson = (lambda: number, next: () => number): number => {
  const limit = Math.exp(-lambda);
  let goals = 0;
  let product = next();
  while (product > limit && goals < MAX_GOALS) {
    goals += 1;
    product *= next();
  }
  return goals;
};

/**
 * Resolves a fixture from two strengths alone, without the match engine.
 *
 * Produces a scoreline and nothing else — no minute-by-minute events, no goalscorers, no injuries,
 * no condition changes. That is the whole shape of a results-only competition: standings, fixtures,
 * and results, with nothing underneath them to inspect.
 */
export const resolveByStrength = (
  homeStrength: number,
  awayStrength: number,
  seed: number,
): { readonly homeGoals: number; readonly awayGoals: number } => {
  const rng = createSeededRng(seed);
  const edge = homeStrength + HOME_ADVANTAGE - awayStrength;
  const homeLambda = BASE_GOALS * 2 ** (edge / STRENGTH_PER_DOUBLING);
  const awayLambda = BASE_GOALS * 2 ** (-edge / STRENGTH_PER_DOUBLING);
  return {
    homeGoals: poisson(homeLambda, () => rng.next()),
    awayGoals: poisson(awayLambda, () => rng.next()),
  };
};
