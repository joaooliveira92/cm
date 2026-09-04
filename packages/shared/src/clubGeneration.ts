import { CITIES_BY_NATION, type City, type PopulationBand } from "./cities.js";
import type { StatureTier } from "./clubs.js";
import type { RandomSource } from "./generation.js";
import type { NationCode } from "./nations.js";

/**
 * How a club is generated: its standing, its home town, its ground, and how strong its squad
 * should be.
 *
 * Every function here takes a `RandomSource` the caller derived from the club's **canonical id**
 * and nothing else. That is the whole reason the module exists as pure functions rather than as a
 * loop inside `worldGeneration.ts`: the superset property — the same world seed under a broader
 * selection reproduces the narrower world byte-identically and adds to it — holds only while no
 * generated value depends on the set of entities being generated. A shuffle dealt across a nation's
 * clubs, an ordinal used as a rank, or a count of how many competitions loaded would each break it
 * silently, and none of them can be expressed through this interface.
 *
 * The constants below are placeholders in the sense the ticket allows: the *shape* is the decision
 * — strength falls with tier, shifts with the nation's prior, and spreads within a competition by
 * Stature Tier — while the specific numbers are tuning nobody has calibrated against played worlds.
 */

/** Pyramid tier a competition off the ladder is treated as, for strength and capacity. A reserve
 *  league sits on no tier but is not therefore a first division. */
const OFF_LADDER_TIER = 3;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * What a club's squad quality is a function of.
 *
 * Stature Tier alone was the entire model, which across a four-tier pyramid asserted that a `big`
 * club in the fourth division has the same squad as a `big` club in the first. The vertical
 * information lives on the competition row — `tier` and, through its nation, the prior — and
 * Stature Tier is demoted to what it can honestly say: where this club stands *among its own
 * competition's clubs*.
 */
export interface ClubStrength {
  /** Pyramid tier of the club's competition, 1 = highest. `null` for a competition off the ladder. */
  readonly tier: number | null;
  /**
   * The nation's 0-1 football-importance prior, consumed under the rule `nations.ts` states: a
   * prior shifts a distribution and never sets a value, and individual variance between two players
   * must exceed the gap between their nations. The swing below is deliberately narrower than the
   * range it shifts.
   */
  readonly nationPrior: number;
  /** This club's standing among its peers in its own competition. */
  readonly statureTier: StatureTier;
  /**
   * Points added to the squad's ceiling, used only when a squad has to be generated to a strength
   * that already exists rather than to the club's position in the pyramid.
   *
   * A club promoted out of a `results-only` division has been performing at a known Results Strength
   * all season, and its first fixture in its new division must not contradict its last one in the
   * old. Its tier and Stature Tier alone would generate whatever a club in that slot usually gets,
   * which is a different number. This is the knob a calibrated generation turns; everywhere else it
   * is absent and the ceiling is exactly what the pyramid implies.
   */
  readonly ceilingShift?: number;
}

const TOP_TIER_CEILING = 95;
const CEILING_LOST_PER_TIER = 12;
/** Full width of the nation prior's effect, so a prior of 0 and a prior of 1 differ by this much. */
const NATION_PRIOR_SWING = 10;
const STATURE_CEILING_SHIFT: Readonly<Record<StatureTier, number>> = { big: 6, mid: 0, small: -6 };
/** How far below its ceiling a club's Potential Ability draws reach. Wider than `NATION_PRIOR_SWING`
 *  by construction: within-club variation must dominate the national term. */
const POTENTIAL_RANGE_WIDTH = 35;

/**
 * The Potential Ability band a club's players are drawn from.
 *
 * Falls with tier, shifts with the nation's prior, and spreads within a competition by Stature
 * Tier — so a mid-table club in a first division is not generated as though it were a mid-table
 * club in a fourth.
 */
export const potentialAbilityRange = ({
  tier,
  nationPrior,
  statureTier,
  ceilingShift = 0,
}: ClubStrength): readonly [number, number] => {
  const ladderTier = tier ?? OFF_LADDER_TIER;
  const ceiling = clamp(
    TOP_TIER_CEILING -
      (ladderTier - 1) * CEILING_LOST_PER_TIER +
      (nationPrior - 0.5) * NATION_PRIOR_SWING +
      STATURE_CEILING_SHIFT[statureTier] +
      ceilingShift,
    20,
    99,
  );
  return [clamp(Math.round(ceiling - POTENTIAL_RANGE_WIDTH), 1, 99), Math.round(ceiling)];
};

/** The share of a competition's clubs at each Stature Tier, highest first. `small` takes the
 *  remainder, so the three always account for exactly the competition's clubs. */
const STATURE_SHARE: Readonly<Record<"big" | "mid", number>> = { big: 0.2, mid: 0.4 };

/**
 * Assigns every club of one competition its Stature Tier: a fixed spread, filled by seed order.
 *
 * A quota rather than an independent per-club draw, so a twenty-club division always has its four
 * strong clubs and its eight strugglers instead of whatever twenty independent rolls happened to
 * produce — a league with no `big` club at all is a worse world than the guarantee costs.
 *
 * It is filled by **seed order, never by ordinal**: `club_eng_1_01` is not the first division's
 * best club, and ranking off the ordinal is exactly what would make a canonical id meaningful.
 *
 * This reads the whole competition's club set, which sounds like the thing the superset property
 * forbids — but that set is fixed by the catalogue's `clubCount`, not by what this run happens to
 * generate. `comp_eng_1` has twenty clubs with the same twenty ids and the same twenty seeds in
 * every save that loads it, whether it was loaded alone or alongside six other nations, so widening
 * a selection cannot move a single club's Stature Tier.
 */
export const statureTiersFor = (
  clubs: ReadonlyArray<{ readonly clubId: string; readonly seed: number }>,
): ReadonlyMap<string, StatureTier> => {
  const bySeed = [...clubs].sort((a, b) => a.seed - b.seed || a.clubId.localeCompare(b.clubId));
  const bigCount = Math.round(bySeed.length * STATURE_SHARE.big);
  const midCount = Math.round(bySeed.length * STATURE_SHARE.mid);
  return new Map(
    bySeed.map((club, rank) => [
      club.clubId,
      rank < bigCount ? "big" : rank < bigCount + midCount ? "mid" : "small",
    ]),
  );
};

/** Relative likelihood a club is based in a city of each band. Bigger cities host more clubs. */
const POPULATION_WEIGHT: Readonly<Record<PopulationBand, number>> = {
  major: 4,
  large: 3,
  mid: 2,
  small: 1,
};

/**
 * Draws a club's home town from its nation's curated cities, weighted by population band.
 *
 * **Collisions are allowed and are not a defect**: two clubs sharing one large city is what real
 * football looks like. Dealing cities out of a shuffled pool would avoid them, and would make every
 * club's home town depend on how many clubs that nation loaded — which breaks the superset property
 * the moment a scope option widens.
 */
export const drawHometown = (nationCode: NationCode, random: RandomSource): City => {
  const cities = CITIES_BY_NATION[nationCode];
  const total = cities.reduce((sum, city) => sum + POPULATION_WEIGHT[city.populationBand], 0);
  let roll = random.next() * total;
  for (const city of cities) {
    roll -= POPULATION_WEIGHT[city.populationBand];
    if (roll < 0) return city;
  }
  // Unreachable while the catalogue holds at least one city per nation, which `cities.test.ts`
  // asserts; the fallback keeps this total rather than making an empty nation a runtime failure.
  return cities[cities.length - 1] as City;
};

/**
 * A generated ground name.
 *
 * Deliberately not built from the club's city: a real city plus a real ground word is how you
 * accidentally name a real stadium, which is the licensed-asset problem the content pack exists to
 * keep out of the simulation core. These two lists are fictional and combine into something
 * plausible without pointing at anything.
 */
const GROUND_PREFIXES = [
  "Riverside",
  "Kingsford",
  "Ashvale",
  "Northgate",
  "Brackenhill",
  "Elmswood",
  "Marchfield",
  "Stonebridge",
  "Fairhaven",
  "Westmoor",
  "Oldcastle",
  "Highbourne",
] as const;

const GROUND_SUFFIXES = ["Park", "Stadium", "Ground", "Arena", "Field"] as const;

export const drawStadiumName = (random: RandomSource): string => {
  const prefix = GROUND_PREFIXES[Math.floor(random.next() * GROUND_PREFIXES.length)] as string;
  const suffix = GROUND_SUFFIXES[Math.floor(random.next() * GROUND_SUFFIXES.length)] as string;
  return `${prefix} ${suffix}`;
};

const TOP_TIER_CAPACITY = 52_000;
/** Each tier down holds this fraction of the tier above. */
const CAPACITY_PER_TIER = 0.55;
const STATURE_CAPACITY_FACTOR: Readonly<Record<StatureTier, number>> = {
  big: 1.35,
  mid: 0.85,
  small: 0.6,
};
const MINIMUM_CAPACITY = 2_000;

/** A generated ground capacity. Display only in MVP — nothing reads it as a constraint. */
export const drawStadiumCapacity = (
  { tier, statureTier }: ClubStrength,
  random: RandomSource,
): number => {
  const ladderTier = tier ?? OFF_LADDER_TIER;
  const base =
    TOP_TIER_CAPACITY * CAPACITY_PER_TIER ** (ladderTier - 1) * STATURE_CAPACITY_FACTOR[statureTier];
  const noise = 0.85 + random.next() * 0.3;
  return Math.max(MINIMUM_CAPACITY, Math.round((base * noise) / 500) * 500);
};
