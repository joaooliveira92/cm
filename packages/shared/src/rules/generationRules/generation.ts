import type { RandomSource } from "../../random.js";
import {
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  type Attribute,
  type HiddenAttribute,
  type PlayerAttributes,
} from "../positionRules/positions.js";
import type { PositionalRatings } from "../playerRatings/positionalRatings.js";
import { drawPositionalRatings, primarySlotOf, type Archetype } from "./positionalGeneration.js";
import { SLOT_WEIGHTS, weightTableOf } from "../positionRules/slots.js";
import { potentialAbilityRange, type ClubStrength } from "./clubGeneration.js";
import { CITIES_BY_NATION, MIGRATION_LINKS, NAME_POOLS, type City, type NationCode } from "@cm-clone/content";

/**
 * How many players of each archetype a squad is generated with: 25, enough for every common shape
 * with backups. A pair of full-backs per flank and a right wing-back cover the 4-, 3- and 5-back
 * shapes; versatile players (competent in a second line or side) cover the rest.
 */
const SQUAD_COMPOSITION: Record<Archetype, number> = {
  goalkeeper: 3,
  centreBack: 4,
  rightBack: 2,
  leftBack: 2,
  rightWingBack: 1,
  leftWingBack: 0,
  defensiveMid: 2,
  centralMid: 3,
  rightMid: 1,
  leftMid: 1,
  attackingMid: 1,
  rightForward: 1,
  leftForward: 1,
  striker: 3,
};

const pick = <T>(items: ReadonlyArray<T>, random: RandomSource): T =>
  items[Math.floor(random.next() * items.length)] as T;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Right-skewed draw: most players cluster low in the range, with a long tail toward rare high values. */
const rightSkewed = (min: number, max: number, random: RandomSource, skew = 2.5): number =>
  Math.round(min + (max - min) * Math.pow(random.next(), skew));

/**
 * Ages 16-23 grow toward Potential Ability, 24-29 plateau at it. Only Physical attributes decline
 * 1-2 points/season (on the 1-20 scale) from 30+; Technical/Mental hold at Potential Ability.
 * Shared by Player generation (to generate a player toward the ceiling they'll grow toward) and
 * Player Development (the per-`SeasonConcluded` step toward that same ceiling) — one curve, not
 * two that can drift apart (see ADR-0011).
 */
export const attributeCeilingOn20Scale = (
  attribute: Attribute | HiddenAttribute,
  age: number,
  potentialAbility: number,
): number => {
  const potentialOn20Scale = potentialAbility / 5;
  if (age < 23) {
    const t = clamp((age - 16) / (23 - 16), 0, 1);
    return potentialOn20Scale * (0.55 + 0.45 * t);
  }
  const isPhysical = (PHYSICAL_ATTRIBUTES as ReadonlyArray<string>).includes(attribute);
  if (age <= 29 || !isPhysical) return potentialOn20Scale;
  const declineYears = age - 29;
  return Math.max(potentialOn20Scale * 0.5, potentialOn20Scale - declineYears * 1.5);
};

const generateAttribute = (
  attribute: Attribute | HiddenAttribute,
  weights: Partial<Record<Attribute, number>>,
  age: number,
  potentialAbility: number,
  random: RandomSource,
): number => {
  const weight = weights[attribute as Attribute] ?? 1;
  const skew = clamp(weight / 3, 0, 1);
  const ceilingOn20Scale = attributeCeilingOn20Scale(attribute, age, potentialAbility);
  const base = ceilingOn20Scale * (0.6 + 0.4 * skew);
  const noise = (random.next() - 0.5) * 4;
  return Math.round(clamp(base + noise, 1, 20));
};

export interface GeneratedPlayer {
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly potentialAbility: number;
  readonly attributes: PlayerAttributes;
  readonly archetype: Archetype;
  /** The twelve positional ratings, drawn from the archetype after the Attributes (Free Role reads
   *  flair). */
  readonly positionalRatings: PositionalRatings;
  /** The player's single nationality. Drawn before the name, because it decides which pool the
   *  name comes from — which is what makes this a value something reads rather than a constant
   *  copy of the club's nation. */
  readonly nationality: NationCode;
  /** Where the player was born, always within their nationality. `null` means "born outside the
   *  loaded world" — reachable only for a catalogue nation whose geography has not been curated,
   *  since `cities` is unconditional. */
  readonly birthCity: City | null;
}

/**
 * Draws a player's nationality: usually the club's nation, sometimes one of its recruitment
 * sources, at the weights `MIGRATION_LINKS` already carries.
 *
 * Those weights are gameplay priors under the rule `nations.ts` states — they shift a distribution
 * and never set a value. A nation absent from `MIGRATION_LINKS` generates a fully domestic squad;
 * that is a gap in the shipped data, not a statement about the country.
 */
export const drawNationality = (clubNation: NationCode, random: RandomSource): NationCode => {
  const links = MIGRATION_LINKS[clubNation];
  if (links === undefined) return clubNation;

  let roll = random.next();
  for (const [source, weight] of Object.entries(links) as ReadonlyArray<[NationCode, number]>) {
    roll -= weight;
    if (roll < 0) return source;
  }
  return clubNation;
};

/** Where a player of this nationality was born, drawn uniformly from that nation's curated cities. */
const drawBirthCity = (nationality: NationCode, random: RandomSource): City | null => {
  const cities = CITIES_BY_NATION[nationality];
  if (cities.length === 0) return null;
  return cities[Math.floor(random.next() * cities.length)] ?? null;
};

/** An inclusive range of ages, in whole years at the reference year. */
export interface AgeRange {
  readonly min: number;
  readonly max: number;
}

/** Ages drawn for a senior squad at world generation. */
const SENIOR_AGES: AgeRange = { min: 17, max: 34 };

/** One draw from the stream whatever the range, so a caller that narrows the range moves no other
 *  draw in the player's stream. */
const randomAge = ({ min, max }: AgeRange, random: RandomSource): number =>
  min + Math.floor(random.next() * (max - min + 1));

/** Ages are measured against the world's reference year, never `new Date()` — a generator that
 *  reads the wall clock produces a different world every January from the same seed. */
const birthDateForAge = (age: number, referenceYear: number, random: RandomSource): string => {
  const year = referenceYear - age;
  const month = 1 + Math.floor(random.next() * 12);
  const day = 1 + Math.floor(random.next() * 28);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
};

/** Everything a single player's generation depends on. Bundled rather than passed as three
 *  positional arguments so a new determinism input cannot be forgotten at a call site. */
export interface PlayerGenerationContext {
  /** Where this club's squad is drawn from: its competition's tier, its nation's prior, and its
   *  own Stature Tier within that competition. */
  readonly strength: ClubStrength;
  /** The nation the club plays in — the origin most of its squad is drawn from. */
  readonly clubNation: NationCode;
  readonly random: RandomSource;
  /** The season year ages are relative to. */
  readonly referenceYear: number;
  /** Full names already used in this squad, so a redraw can avoid repeating one. Names are
   *  attributes rather than identifiers and no `UNIQUE` constraint enforces this — avoiding a
   *  duplicate inside one squad is generation's job. */
  readonly taken?: ReadonlySet<string>;
  /** The ages this player is drawn from. Omitted for a senior squad (17-34); a Youth Intake narrows
   *  it. */
  readonly ages?: AgeRange;
}

/** How many times a duplicate full name is redrawn before it is accepted. Bounded so a small pool
 *  cannot make generation loop; a repeat is cosmetic, a hang is not. */
const NAME_REDRAW_LIMIT = 8;

export const generatePlayer = (
  archetype: Archetype,
  { strength, clubNation, random, referenceYear, taken, ages = SENIOR_AGES }: PlayerGenerationContext,
): GeneratedPlayer => {
  // Origin first: it decides the name pool and the birthplace, so it must be drawn before either.
  const nationality = drawNationality(clubNation, random);
  const birthCity = drawBirthCity(nationality, random);
  const pool = NAME_POOLS[nationality];

  let firstName = pick(pool.givenNames, random);
  let lastName = pick(pool.surnames, random);
  for (let attempt = 0; attempt < NAME_REDRAW_LIMIT && taken?.has(`${firstName} ${lastName}`); attempt++) {
    firstName = pick(pool.givenNames, random);
    lastName = pick(pool.surnames, random);
  }

  const [paMin, paMax] = potentialAbilityRange(strength);
  const potentialAbility = rightSkewed(paMin, paMax, random);
  const age = randomAge(ages, random);

  const weights = SLOT_WEIGHTS[weightTableOf(primarySlotOf(archetype))];
  const attributes = {} as Record<string, number>;
  for (const attribute of OUTFIELD_ATTRIBUTES) {
    attributes[attribute] = generateAttribute(attribute, weights, age, potentialAbility, random);
  }
  for (const attribute of HIDDEN_ATTRIBUTES) {
    attributes[attribute] = generateAttribute(attribute, weights, age, potentialAbility, random);
  }
  if (archetype === "goalkeeper") {
    for (const attribute of GOALKEEPING_ATTRIBUTES) {
      attributes[attribute] = generateAttribute(attribute, weights, age, potentialAbility, random);
    }
  }

  const positionalRatings = drawPositionalRatings(archetype, attributes["flair"] ?? 1, random);

  return {
    firstName,
    lastName,
    dateOfBirth: birthDateForAge(age, referenceYear, random),
    potentialAbility,
    attributes: attributes as PlayerAttributes,
    archetype,
    positionalRatings,
    nationality,
    birthCity,
  };
};

/**
 * One demanded place in a squad, resolved before any player exists to fill it.
 *
 * `index` is the slot's stable address within a squad: it is what a player's seed is derived from,
 * so it must stay put across releases. Reordering `SQUAD_COMPOSITION` renumbers every slot and
 * therefore regenerates every squad — a ruleset-version change, not a cosmetic one.
 */
export interface SquadSlot {
  readonly index: number;
  readonly archetype: Archetype;
}

/** The squad demand every club is generated against, in stable slot order. */
export const SQUAD_SLOTS: ReadonlyArray<SquadSlot> = (
  Object.entries(SQUAD_COMPOSITION) as Array<[Archetype, number]>
).flatMap(([archetype, count]) => Array.from({ length: count }, () => archetype)).map(
  (archetype, index) => ({ index, archetype }),
);

export interface SquadGenerationContext {
  readonly referenceYear: number;
  /** The nation the club plays in. Most of its squad is drawn from here; the rest from the
   *  recruitment links `MIGRATION_LINKS` describes. */
  readonly clubNation: NationCode;
  /** The stream one slot's player is drawn from. Per slot rather than one stream for the whole
   *  squad: a player is drawn from their own slot seed, so re-rolling or inserting one player
   *  leaves their team-mates' *streams* untouched.
   *
   *  One narrowing since names became nation-keyed: a player whose full name is already taken in
   *  this squad redraws — from their own stream — so a player is now a function of their own seed
   *  *plus the names of earlier slots*. That is still deterministic and still confined to one club,
   *  so it cannot reach across the world; but a slot is no longer independent of the slots before
   *  it, and a change to slot 3's name can move slot 20's. */
  readonly randomForSlot: (slot: SquadSlot) => RandomSource;
}

export interface GeneratedSquadPlayer extends GeneratedPlayer {
  readonly slot: SquadSlot;
}

export const generateSquad = (
  strength: ClubStrength,
  { referenceYear, clubNation, randomForSlot }: SquadGenerationContext,
): ReadonlyArray<GeneratedSquadPlayer> => {
  const taken = new Set<string>();
  return SQUAD_SLOTS.map((slot) => {
    const player = generatePlayer(slot.archetype, {
      strength,
      clubNation,
      referenceYear,
      random: randomForSlot(slot),
      taken,
    });
    taken.add(`${player.firstName} ${player.lastName}`);
    return { ...player, slot };
  });
};

/**
 * Generates a squad whose collapsed strength matches a number the club already carries.
 *
 * A club promoted out of a `results-only` division arrives with no players and a season's worth of
 * results behind it. Generating from its new tier alone would hand it whatever a club in that slot
 * usually gets — which is a different strength from the one it just earned, so its first fixture
 * would contradict its last. This searches the ceiling shift instead, and the search is what makes
 * "conjures upward" honest rather than approximate.
 *
 * A bisection over a bounded shift, deterministic in the seeds it is given: the same club promoted
 * from the same season gets the same squad in every save. It always returns a squad — the closest
 * one found — because a promoted club with no players is not a state the world can be left in.
 */
export const generateSquadAtStrength = (
  strength: ClubStrength,
  context: SquadGenerationContext,
  /** The strength to hit, on the 1-100 Position Rating scale. */
  target: number,
  /** How a squad collapses to that scale, supplied by the caller so this stays free of `bestXi`. */
  collapse: (squad: ReadonlyArray<GeneratedSquadPlayer>) => number,
): ReadonlyArray<GeneratedSquadPlayer> => {
  const MAX_SHIFT = 30;
  const ITERATIONS = 12;
  const TOLERANCE = 0.5;

  let low = -MAX_SHIFT;
  let high = MAX_SHIFT;
  let best = generateSquad({ ...strength, ceilingShift: 0 }, context);
  let bestError = Math.abs(collapse(best) - target);

  for (let step = 0; step < ITERATIONS && bestError > TOLERANCE; step += 1) {
    const shift = (low + high) / 2;
    const squad = generateSquad({ ...strength, ceilingShift: shift }, context);
    const collapsed = collapse(squad);
    const error = Math.abs(collapsed - target);
    if (error < bestError) {
      best = squad;
      bestError = error;
    }
    // Squad strength rises monotonically with the ceiling, so a bisection converges.
    if (collapsed < target) low = shift;
    else high = shift;
  }

  return best;
};

// ---------------------------------------------------------------------------
// Youth Intake
// ---------------------------------------------------------------------------

/** The squad size a Youth Intake brings every club back to: eleven and a full bench. */
export const SQUAD_FLOOR = 16;

/**
 * A Youth Intake's ages at the year it joins in. A birth year of `year - 17` or `year - 18` makes a
 * player 16, 17 or 18 on every date of that year, whichever side of the birthday the date falls, so
 * "aged 16-18 at the rollover" holds without the generator knowing the rollover's exact date.
 */
const YOUTH_INTAKE_AGES: AgeRange = { min: 17, max: 18 };

export interface YouthIntakeContext {
  /** The calendar year the intake joins in — the year the Season rolls over in. */
  readonly year: number;
  readonly clubNation: NationCode;
  /** The club's squad after Contract expiry, which is what the floor is measured against. */
  readonly squadSize: number;
  /** Full names already in the squad, so an intake player does not repeat one. */
  readonly taken: ReadonlySet<string>;
  /** The stream that decides how many players the intake brings. */
  readonly sizeRandom: RandomSource;
  /** The stream one intake player is drawn from, addressed by their place in the intake. */
  readonly randomForSlot: (index: number) => RandomSource;
}

/**
 * One club's Youth Intake: two to four players, or as many as it takes to reach `SQUAD_FLOOR` when
 * that is more.
 *
 * Drawn with `generatePlayer`, so an intake player is the same kind of player world generation
 * makes, only younger — and so rawer, since the attribute ceiling grows with age. An archetype is
 * drawn from the player's own stream at the squad composition's weights before anything else.
 */
export const generateYouthIntake = (
  strength: ClubStrength,
  { year, clubNation, squadSize, taken, sizeRandom, randomForSlot }: YouthIntakeContext,
): ReadonlyArray<GeneratedSquadPlayer> => {
  const size = Math.max(2 + Math.floor(sizeRandom.next() * 3), SQUAD_FLOOR - squadSize);
  const names = new Set(taken);
  return Array.from({ length: size }, (_, index) => {
    const random = randomForSlot(index);
    const archetype = pick(SQUAD_SLOTS, random).archetype;
    const player = generatePlayer(archetype, {
      strength,
      clubNation,
      referenceYear: year,
      random,
      taken: names,
      ages: YOUTH_INTAKE_AGES,
    });
    names.add(`${player.firstName} ${player.lastName}`);
    return { ...player, slot: { index, archetype } };
  });
};
