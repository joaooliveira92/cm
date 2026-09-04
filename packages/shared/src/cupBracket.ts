import { createSeededRng } from "@cm-clone/game-engine";

/**
 * A domestic cup's bracket, computed rather than stored.
 *
 * Nothing about the bracket lives on disk beyond the fixture rows it has already produced. Both the
 * draw seed and each match seed hash canonical ids, so the same world seed replays the same round-1
 * draw, the same results, and therefore the same round-2 draw. A stored bracket would be a second
 * source for a fact the seed already determines, and one that could drift from it.
 *
 * A round's fixtures are created **when its participants are known**, never at season start. The
 * rejected alternative — materialising the whole bracket up front with nullable club ids — would
 * make `home_club_id` nullable for every row in `fixtures`, including the hundreds of thousands of
 * league rows where it is never null, which is the shape that invites a query to forget the check.
 */

/**
 * A club in a cup's field, and the pyramid tier of the competition it entered from.
 *
 * Distinct from `leagueSetup`'s `CupEntrant`, which is the catalogue *edge* naming a source
 * competition. This is one club that edge let in.
 */
export interface CupFieldEntrant {
  readonly clubId: string;
  /** Lower is stronger. `null` for a source competition off the ladder. */
  readonly sourceTier: number | null;
}

/** Tier used when ordering an off-ladder entrant against ladder ones: weaker than any real tier. */
const OFF_LADDER_ORDER = Number.MAX_SAFE_INTEGER;

export interface BracketShape {
  /** Total rounds from the first to the final, inclusive. */
  readonly rounds: number;
  /** How many entrants sit out round 1 and enter in round 2. */
  readonly byes: number;
  /** How many ties round 1 contests. */
  readonly firstRoundTies: number;
}

/**
 * The shape a field of `entrants` produces, or `null` for a field no bracket can seat.
 *
 * Fields of 44 or 92 are normal rather than exceptional: `competition_entrants` derives the field
 * from whichever source competitions the save happened to load, so a power of two is the unusual
 * case. The remainder is absorbed by **byes in round 1**, which need no dates and mirror how real
 * cups let stronger clubs enter later. A preliminary round was rejected because it would need dates
 * reserved for a round only some seasons use.
 */
export const bracketShape = (entrants: number): BracketShape | null => {
  if (entrants < 2) return null;
  const size = 2 ** Math.ceil(Math.log2(entrants));
  const byes = size - entrants;
  return { rounds: Math.log2(size), byes, firstRoundTies: (entrants - byes) / 2 };
};

/**
 * Which entrants hold round-1 byes: the strongest source competitions first, ties broken by
 * canonical id.
 *
 * Broken by canonical id rather than by seed because a bye is an advantage, and an advantage handed
 * out by the draw's randomness would be one more thing a replay has to reproduce for no gain. Tier
 * order alone leaves ties, and the id is the only total order the domain already has.
 */
export const byeHolders = (
  entrants: ReadonlyArray<CupFieldEntrant>,
  byes: number,
): ReadonlyArray<string> =>
  [...entrants]
    .sort((a, b) => {
      const tierDelta = (a.sourceTier ?? OFF_LADDER_ORDER) - (b.sourceTier ?? OFF_LADDER_ORDER);
      return tierDelta === 0 ? a.clubId.localeCompare(b.clubId) : tierDelta;
    })
    .slice(0, byes)
    .map((entrant) => entrant.clubId);

export interface CupTie {
  readonly homeClubId: string;
  readonly awayClubId: string;
}

/**
 * Pairs a round's participants into ties, seeded.
 *
 * The input is sorted by canonical id before the shuffle so the draw depends on *which* clubs are in
 * the round and not on the order a query returned them — the same rule the league's round-robin
 * draw follows.
 */
export const drawRound = (participants: ReadonlyArray<string>, seed: number): ReadonlyArray<CupTie> => {
  const pool = [...participants].sort((a, b) => a.localeCompare(b));
  const rng = createSeededRng(seed);

  // Fisher-Yates, drawing from the seeded stream in a fixed order.
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng.next() * (index + 1));
    const held = pool[index]!;
    pool[index] = pool[swap]!;
    pool[swap] = held;
  }

  const ties: Array<CupTie> = [];
  for (let index = 0; index + 1 < pool.length; index += 2) {
    ties.push({ homeClubId: pool[index]!, awayClubId: pool[index + 1]! });
  }
  return ties;
};

/**
 * Who won a tie: goals, then penalties.
 *
 * A knockout tie must produce a winner, and there is no third possibility to encode — a level tie
 * that reached full time went to a shootout, so its penalty scores are set and are never equal.
 */
export const tieWinner = (tie: {
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly homePenalties: number | null;
  readonly awayPenalties: number | null;
}): string => {
  if (tie.homeGoals !== tie.awayGoals) {
    return tie.homeGoals > tie.awayGoals ? tie.homeClubId : tie.awayClubId;
  }
  return (tie.homePenalties ?? 0) > (tie.awayPenalties ?? 0) ? tie.homeClubId : tie.awayClubId;
};

/** Kicks each side takes before sudden death, and the cap that keeps sudden death finite. */
const REGULATION_KICKS = 5;
const MAX_SUDDEN_DEATH_ROUNDS = 15;
/** Conversion rate at equal strength, and how much a strength gap moves it. */
const BASE_CONVERSION = 0.75;
const CONVERSION_PER_POINT = 0.004;

/**
 * A penalty shootout: deterministic in the match seed and the two clubs' strengths.
 *
 * Resolved **outside the minute loop**, so it emits no match events — the timeline shows a drawn
 * ninety minutes and the winner comes from the fixture's penalty columns. That is what leaves the
 * engine's two halves and its 90-minute fatigue calibration untouched: extra time would mean halves
 * three and four plus a recalibration of a model nothing else is asking to change.
 *
 * Both scores are produced together and written in one statement, which is what makes the paired
 * `CHECK((home_penalties IS NULL) = (away_penalties IS NULL))` a constraint no legitimate write path
 * can trip.
 */
export const resolveShootout = (
  homeStrength: number,
  awayStrength: number,
  seed: number,
): { readonly homePenalties: number; readonly awayPenalties: number } => {
  const rng = createSeededRng(seed);
  const rate = (taker: number, other: number) =>
    Math.min(0.95, Math.max(0.5, BASE_CONVERSION + (taker - other) * CONVERSION_PER_POINT));
  const homeRate = rate(homeStrength, awayStrength);
  const awayRate = rate(awayStrength, homeStrength);

  let home = 0;
  let away = 0;
  for (let kick = 0; kick < REGULATION_KICKS; kick += 1) {
    if (rng.next() < homeRate) home += 1;
    if (rng.next() < awayRate) away += 1;
  }

  let round = 0;
  while (home === away && round < MAX_SUDDEN_DEATH_ROUNDS) {
    const homeScored = rng.next() < homeRate;
    const awayScored = rng.next() < awayRate;
    if (homeScored) home += 1;
    if (awayScored) away += 1;
    round += 1;
  }

  // A shootout that survived fifteen sudden-death rounds is vanishingly unlikely and still must not
  // return a draw: a knockout tie has no third outcome for the caller to handle.
  if (home === away) home += 1;
  return { homePenalties: home, awayPenalties: away };
};
