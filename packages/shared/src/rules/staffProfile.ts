import { NATION_CODES, compareCodeUnits, type NationCode, type StatureTier } from "@cm-clone/content";
import { createSeededRng, pickRandom, type RandomSource } from "../random.js";
import { deriveSeed } from "../seed.js";
import type { IsoDate } from "../season/calendar.js";
import { CATEGORIES, type Category } from "./positionRules/positions.js";
import { QUALITY_BAND, type ClubPersonRole } from "./staff.js";
import { TEAM_INSTRUCTION_VALUES, type TeamInstructions } from "./tacticalRules/tacticModel.js";
import { BUILT_IN_TEMPLATE_NAMES } from "./tacticalRules/tacticTemplates.js";

/**
 * A Staff Profile: the ratings, preferences, and biography a staff member is *seen* with.
 *
 * Every value here is presence. No formula reads a profile rating — the one number a formula reads
 * is a Bound Staff member's stored `quality`, and the profile shows it rather than competing with
 * it: a coach's Coaching Outfield Players *is* their quality, a scout's Judging Player Ability *is*
 * theirs, and every other rating scatters around that anchor. So the profile cannot disagree with
 * the development or scouting a manager observes.
 *
 * Never stored. A profile is a pure function of the world seed, the club, and the person's
 * `StaffKey`, on a stream (`"staff-profile"`) no other derivation draws from, so adding it moved no
 * existing save's players, staff, or presence people. See the Agent Note
 * `2026-09-28-staff-profiles-are-derived-presence`.
 */

export const STAFF_COACHING_RATINGS = [
  "coachingGoalkeepers",
  "coachingOutfieldPlayers",
  "manManagement",
  "physiotherapy",
  "tacticalKnowledge",
  "workingWithYoungsters",
] as const;

export type StaffCoachingRating = (typeof STAFF_COACHING_RATINGS)[number];

export const STAFF_MENTAL_RATINGS = [
  "adaptability",
  "determination",
  "judgingPlayerAbility",
  "judgingPlayerPotential",
  "levelOfDiscipline",
  "motivating",
] as const;

export type StaffMentalRating = (typeof STAFF_MENTAL_RATINGS)[number];

/**
 * A coach's tactical leanings, in the Tactics screen's own vocabulary — a built-in Tactic Template
 * and the team Mentality the manager actually sets, plus the Training Category they would put first
 * — so a preference reads as something the manager could adopt rather than a word the game has no
 * rule for. CM's fuller staff preferences arrive with the AI's seeded preferences.
 */
export interface StaffTacticalPreferences {
  readonly formation: string;
  readonly mentality: TeamInstructions["mentality"];
  readonly coachingEmphasis: Category;
}

/** One earlier job: the seasons it spanned (`fromYear` to `toYear`), where, and in which role. */
export interface StaffHistorySpell {
  readonly fromYear: number;
  readonly toYear: number;
  readonly clubId: string;
  readonly role: ClubPersonRole;
}

export interface StaffProfile {
  readonly dateOfBirth: IsoDate;
  readonly nationality: NationCode;
  /** Native language first, then any others, each once. */
  readonly languages: readonly string[];
  /** `null` for the President: a board member coaches nobody, so the panels would be invented. */
  readonly coaching: Readonly<Record<StaffCoachingRating, number>> | null;
  readonly mental: Readonly<Record<StaffMentalRating, number>> | null;
  /** Coach and Assistant Manager only — the two roles that would pick a side. */
  readonly tactics: StaffTacticalPreferences | null;
  /** The date this person joined the club: always on or before the day the career began. */
  readonly joined: IsoDate;
  /** Earlier jobs, most recent first. */
  readonly history: readonly StaffHistorySpell[];
}

/** The language a nation's people grow up speaking. */
export const NATION_LANGUAGE: Readonly<Record<NationCode, string>> = {
  ENG: "English",
  ESP: "Spanish",
  PRT: "Portuguese",
  FRA: "French",
  DEU: "German",
  BRA: "Portuguese",
  AND: "Catalan",
  ITA: "Italian",
};

type RatingBias = Partial<Record<StaffCoachingRating | StaffMentalRating, number>>;

/**
 * How far each role's ratings sit from the anchor. The role's own trade sits above it and the
 * trades it does not practise well below, so a scout reads as a scout and a physio as a physio
 * without either needing a quality of their own.
 */
const ROLE_BIAS: Readonly<Record<Exclude<ClubPersonRole, "president">, RatingBias>> = {
  coach: {
    coachingGoalkeepers: -3,
    tacticalKnowledge: 1,
    physiotherapy: -6,
    motivating: 1,
  },
  assistant: {
    coachingGoalkeepers: -3,
    manManagement: 2,
    tacticalKnowledge: 2,
    physiotherapy: -6,
  },
  scout: {
    coachingGoalkeepers: -5,
    coachingOutfieldPlayers: -4,
    manManagement: -4,
    physiotherapy: -7,
    tacticalKnowledge: -2,
    workingWithYoungsters: -3,
    judgingPlayerPotential: 1,
  },
  physio: {
    coachingGoalkeepers: -6,
    coachingOutfieldPlayers: -5,
    physiotherapy: 3,
    tacticalKnowledge: -6,
    judgingPlayerAbility: -5,
    judgingPlayerPotential: -5,
  },
};

/** The rating a Bound Staff member's stored quality is shown as, exactly. */
const QUALITY_RATING: Readonly<Partial<Record<ClubPersonRole, StaffCoachingRating | StaffMentalRating>>> = {
  coach: "coachingOutfieldPlayers",
  scout: "judgingPlayerAbility",
};

/** Ages at the day the career began, by role: a board member is older than a young physio. */
const AGE_RANGE: Readonly<Record<ClubPersonRole, readonly [number, number]>> = {
  president: [45, 74],
  coach: [36, 64],
  assistant: [34, 60],
  scout: [30, 66],
  physio: [27, 58],
};

/** The role an earlier job was held in. A coach was often an assistant first. */
const PAST_ROLES: Readonly<Record<ClubPersonRole, readonly ClubPersonRole[]>> = {
  president: [],
  coach: ["coach", "assistant"],
  assistant: ["assistant", "coach"],
  scout: ["scout"],
  physio: ["physio"],
};

const clampRating = (value: number): number => Math.min(20, Math.max(1, Math.round(value)));

/** An integer in `[min, max]`, inclusive. */
const between = (min: number, max: number, random: RandomSource): number =>
  min + Math.floor(random.next() * (max - min + 1));

const pad = (value: number): string => String(value).padStart(2, "0");

const ratings = <K extends string>(
  keys: readonly K[],
  anchor: number,
  bias: RatingBias,
  random: RandomSource,
): Record<K, number> =>
  Object.fromEntries(
    keys.map((key) => [key, clampRating(anchor + (bias[key as keyof RatingBias] ?? 0) + between(-3, 3, random))]),
  ) as Record<K, number>;

/**
 * One staff member's profile.
 *
 * `quality` is the Bound Staff member's stored number, `null` for Presence Staff; a presence person
 * gets an anchor drawn from the Stature Tier's quality band instead, on the profile's own stream,
 * so the Assistant Manager at a big club reads like one and no stored value is created for it.
 * `careerStart` is the day Season 1 opened: ages and the joining date are measured against it so
 * they are the same in every year the save is played. `otherClubs` are the candidate employers for
 * earlier jobs — the caller passes the club's compatriots — and the order they arrive in is
 * irrelevant, because they are sorted before any draw.
 */
export const deriveStaffProfile = ({
  worldSeed,
  clubId,
  role,
  ordinal,
  clubNation,
  statureTier,
  quality,
  careerStart,
  otherClubs,
}: {
  readonly worldSeed: number;
  readonly clubId: string;
  readonly role: ClubPersonRole;
  readonly ordinal: number;
  readonly clubNation: NationCode;
  readonly statureTier: StatureTier;
  readonly quality: number | null;
  readonly careerStart: IsoDate;
  readonly otherClubs: readonly string[];
}): StaffProfile => {
  const random = createSeededRng(deriveSeed(worldSeed, "staff-profile", clubId, role, ordinal));
  const startYear = Number(careerStart.slice(0, 4));

  const [minAge, maxAge] = AGE_RANGE[role];
  const age = between(minAge, maxAge, random);
  const dateOfBirth = `${startYear - age - 1}-${pad(between(1, 12, random))}-${pad(between(1, 28, random))}`;

  const [bandMin, bandMax] = QUALITY_BAND[statureTier];
  const drawnAnchor = between(bandMin, bandMax, random);
  const anchor = quality ?? drawnAnchor;

  let coaching: Record<StaffCoachingRating, number> | null = null;
  let mental: Record<StaffMentalRating, number> | null = null;
  if (role !== "president") {
    coaching = ratings(STAFF_COACHING_RATINGS, anchor, ROLE_BIAS[role], random);
    mental = ratings(STAFF_MENTAL_RATINGS, anchor, ROLE_BIAS[role], random);
    const pinned = QUALITY_RATING[role];
    if (quality !== null && pinned !== undefined) {
      if (pinned in coaching) coaching[pinned as StaffCoachingRating] = quality;
      else mental[pinned as StaffMentalRating] = quality;
    }
  }

  const tactics: StaffTacticalPreferences | null =
    role === "coach" || role === "assistant"
      ? {
          formation: pickRandom(BUILT_IN_TEMPLATE_NAMES, random),
          mentality: pickRandom(TEAM_INSTRUCTION_VALUES.mentality, random),
          coachingEmphasis: pickRandom(CATEGORIES, random),
        }
      : null;

  // A native language, then one more for every seven points of adaptability; a board member, who
  // has none, speaks only their own.
  const native = NATION_LANGUAGE[clubNation];
  const foreign = [...new Set(NATION_CODES.map((code) => NATION_LANGUAGE[code]))]
    .filter((language) => language !== native)
    .sort(compareCodeUnits);
  const extraCount = Math.min(foreign.length, Math.floor((mental?.adaptability ?? 0) / 7));
  const languages = [native];
  const pool = [...foreign];
  for (let index = 0; index < extraCount; index++) {
    const [picked] = pool.splice(Math.floor(random.next() * pool.length), 1);
    if (picked !== undefined) languages.push(picked);
  }

  // Joined in some summer before the career began; the years before that are earlier jobs,
  // walked backwards, each at a different compatriot club, stopping before the person turned 25.
  const joinedYear = startYear - between(0, 7, random);
  const joined = `${joinedYear}-07-01`;
  const employers = [...otherClubs].filter((id) => id !== clubId).sort(compareCodeUnits);
  const pastRoles = PAST_ROLES[role];
  const history: StaffHistorySpell[] = [];
  const birthYear = Number(dateOfBirth.slice(0, 4));
  let toYear = joinedYear;
  const spells = pastRoles.length === 0 ? 0 : between(0, 3, random);
  for (let index = 0; index < spells && employers.length > 0; index++) {
    const fromYear = toYear - between(1, 5, random);
    if (fromYear - birthYear < 25) break;
    const [employer] = employers.splice(Math.floor(random.next() * employers.length), 1);
    if (employer === undefined) break;
    history.push({ fromYear, toYear, clubId: employer, role: pickRandom(pastRoles, random) });
    toYear = fromYear;
  }

  return {
    dateOfBirth,
    nationality: clubNation,
    languages,
    coaching,
    mental,
    tactics,
    joined,
    history,
  };
};

/**
 * How a staff member rates a player at a position: the player's true Position Rating, blurred by
 * the rater's Judging Player Ability. A judge of 20 sees the rating exactly; a judge of 1 can be
 * off by up to eight points either way. The blur is seeded per (rater, player, position), so the
 * same coach ranks the same squad the same way on every read.
 *
 * This is the one place a profile rating is read, and it moves nothing but the order of a displayed
 * list: the lineup, the match, and development never see it.
 */
export const staffOpinion = ({
  positionRating,
  judgingPlayerAbility,
  seed,
}: {
  readonly positionRating: number;
  readonly judgingPlayerAbility: number;
  readonly seed: number;
}): number => {
  const spread = ((20 - judgingPlayerAbility) / 19) * 8;
  return positionRating + (createSeededRng(seed).next() * 2 - 1) * spread;
};
