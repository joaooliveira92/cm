import {
  ADJACENT_POSITIONS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  POSITION_WEIGHTS,
  type Attribute,
  type FamiliarityTier,
  type HiddenAttribute,
  type PlayerAttributes,
  type Position,
} from "./positions.js";
import { potentialAbilityRange, type ClubStrength } from "./clubGeneration.js";
import { CITIES_BY_NATION, type City } from "./cities.js";
import { NAME_POOLS } from "./namePools.js";
import { MIGRATION_LINKS, type NationCode } from "./nations.js";

/** How many players to generate per primary Position, per squad — enough to fill every Formation plus backups. */
const SQUAD_COMPOSITION: Record<Position, number> = {
  GK: 3,
  DC: 4,
  DL: 2,
  DR: 2,
  DM: 2,
  MC: 3,
  ML: 2,
  MR: 2,
  AMC: 2,
  ST: 3,
};

export interface RandomSource {
  readonly next: () => number; // uniform [0, 1)
}

/**
 * There is deliberately no default `RandomSource` here. A world must be reproducible from its
 * seed, so every caller names the stream its randomness comes from; a `Math.random` fallback would
 * let a call site silently opt out of that and produce a world nothing can regenerate.
 */

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
  primaryPosition: Position,
  age: number,
  potentialAbility: number,
  random: RandomSource,
): number => {
  const weight = POSITION_WEIGHTS[primaryPosition][attribute as Attribute] ?? 1;
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
  readonly positions: ReadonlyArray<{ readonly position: Position; readonly familiarity: FamiliarityTier }>;
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

const randomAge = (random: RandomSource): number => 17 + Math.floor(random.next() * 18); // 17-34

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
}

/** How many times a duplicate full name is redrawn before it is accepted. Bounded so a small pool
 *  cannot make generation loop; a repeat is cosmetic, a hang is not. */
const NAME_REDRAW_LIMIT = 8;

export const generatePlayer = (
  primaryPosition: Position,
  { strength, clubNation, random, referenceYear, taken }: PlayerGenerationContext,
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
  const age = randomAge(random);

  const attributes = {} as Record<string, number>;
  for (const attribute of OUTFIELD_ATTRIBUTES) {
    attributes[attribute] = generateAttribute(attribute, primaryPosition, age, potentialAbility, random);
  }
  for (const attribute of HIDDEN_ATTRIBUTES) {
    attributes[attribute] = generateAttribute(attribute, primaryPosition, age, potentialAbility, random);
  }
  if (primaryPosition === "GK") {
    for (const attribute of GOALKEEPING_ATTRIBUTES) {
      attributes[attribute] = generateAttribute(attribute, primaryPosition, age, potentialAbility, random);
    }
  }

  const positions: Array<{ position: Position; familiarity: FamiliarityTier }> = [
    { position: primaryPosition, familiarity: "natural" },
  ];
  const adjacent = ADJACENT_POSITIONS[primaryPosition];
  if (adjacent.length > 0 && random.next() < 0.3) {
    positions.push({ position: pick(adjacent, random), familiarity: "competent" });
  }

  return {
    firstName,
    lastName,
    dateOfBirth: birthDateForAge(age, referenceYear, random),
    potentialAbility,
    attributes: attributes as PlayerAttributes,
    positions,
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
  readonly position: Position;
}

/** The squad demand every club is generated against, in stable slot order. */
export const SQUAD_SLOTS: ReadonlyArray<SquadSlot> = (
  Object.entries(SQUAD_COMPOSITION) as Array<[Position, number]>
).flatMap(([position, count]) => Array.from({ length: count }, () => position)).map(
  (position, index) => ({ index, position }),
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
    const player = generatePlayer(slot.position, {
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
