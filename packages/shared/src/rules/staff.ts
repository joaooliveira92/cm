import { NAME_POOLS, poolCombinations, type NationCode, type StatureTier } from "@cm-clone/content";
import { createSeededRng, pickRandom, type RandomSource } from "../random.js";
import { deriveSeed } from "../seed.js";

/**
 * A club's backroom, in exactly five roles across two kinds.
 *
 * **Bound Staff** — the Coach and the Scout — carry the bindings: a scout's quality drives how fast
 * their assignment accrues, and a coach scales the passive development baseline. They are the only
 * staff with rows, materialised once a club is human-managed.
 *
 * **Presence Staff** — the President, the Assistant Manager and the Physio — carry no number a
 * formula reads, and exist to be seen. They are never stored: a pure function of the
 * world seed and the club's canonical id, derived separately per role so no presence draw ever
 * shifts the order-sensitive bound `staff` stream every save's existing backroom depends on.
 *
 * Either way a named person is the reason the backroom is more than an abstract slot. The bound
 * roles' quality derives from the club's Stature Tier with seeded variance, which makes *which club
 * you take* the decision that determines your backroom — a decision surface that already ships.
 */

export const STAFF_ROLES = ["coach", "scout"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export interface GeneratedStaff {
  readonly role: StaffRole;
  readonly quality: number;
  readonly firstName: string;
  readonly lastName: string;
}

/**
 * How many scouts a club has, by Stature Tier.
 *
 * The club's N scout rows *are* its N assignment slots, so the fungible-slot concept disappears.
 * Headcount stays owned by Stature Tier alone: an individual scout's quality sets their accrual
 * rate and never buys another slot, because a second owner for the same term double-books it.
 */
export const SCOUT_HEADCOUNT: Readonly<Record<StatureTier, number>> = {
  big: 4,
  mid: 3,
  small: 2,
};

/** The quality band a club of each Stature Tier draws its staff from, on the 1-20 player scale. */
export const QUALITY_BAND: Readonly<Record<StatureTier, readonly [number, number]>> = {
  big: [12, 20],
  mid: [7, 15],
  small: [1, 10],
};

const drawQuality = (statureTier: StatureTier, random: RandomSource): number => {
  const [min, max] = QUALITY_BAND[statureTier];
  return min + Math.floor(random.next() * (max - min + 1));
};

/**
 * What a coach multiplies the passive development baseline by.
 *
 * **Hard invariant: `coachModifier(q) >= 1.0` for every legal quality.** The modifier is
 * floor-anchored at quality 1 rather than centred at mid, and the reason is not symmetry but a soft
 * lock: AI clubs receive the baseline unmodified, so a centred modifier would make a manager at a
 * small club develop players more slowly than every AI club in the world — punishing a decision they
 * were never offered, since there is no hiring market. A big club's coach gives a lot, a small
 * club's gives nearly nothing, and none gives less than nothing.
 *
 * It scales the *baseline* and never the Training Focus multiplier, which Technical Coaching already
 * owns. Each term has exactly one owner, so two multipliers never stack on one number — and the
 * fiction is right too: the Pillar rewards the manager's decision, the coach rewards institutional
 * quality that lifts every player including the ones nobody focused.
 */
export const coachModifier = (quality: number): number => 1 + (quality - 1) * 0.02;

/**
 * A club's backroom, derived rather than rolled.
 *
 * The caller supplies a stream keyed on the world seed and the club's canonical id, so a club's
 * staff are identical whether the manager takes it at save creation or five seasons after a
 * sacking. Arrival time and career history never enter.
 */
export const generateStaff = ({
  statureTier,
  clubNation,
  random,
}: {
  readonly statureTier: StatureTier;
  readonly clubNation: NationCode;
  readonly random: RandomSource;
}): readonly GeneratedStaff[] => {
  const pool = NAME_POOLS[clubNation];
  const person = (role: StaffRole): GeneratedStaff => ({
    role,
    quality: drawQuality(statureTier, random),
    firstName: pool.givenNames[Math.floor(random.next() * pool.givenNames.length)] as string,
    lastName: pool.surnames[Math.floor(random.next() * pool.surnames.length)] as string,
  });

  // Exactly one coach, so the club's coaching term *is* that coach's quality and no aggregation
  // rule is needed; then N scouts, N from the Stature Tier table above.
  return [
    person("coach"),
    ...Array.from({ length: SCOUT_HEADCOUNT[statureTier] }, () => person("scout")),
  ];
};

/**
 * The presence roles: people the world has to be *seen*, not read. The President (the Board's face),
 * the Assistant Manager (the Coach's number two, seen on the Staff Profile) and the Physio (a named
 * medical person) sit beside — never inside — `STAFF_ROLES`, because the
 * `staff_role` check constraint permits exactly `coach` and `scout` and must go on saying so. A
 * caller that needs both unions reads `ClubPersonRole`.
 */
export const PRESENCE_ROLES = ["president", "assistant", "physio"] as const;

export type PresenceRole = (typeof PRESENCE_ROLES)[number];

/** A role out of the whole backroom — bound or presence. */
export type ClubPersonRole = StaffRole | PresenceRole;

/** A presence person: a name and a role — `GeneratedStaff` minus `quality`. Their profile (see
 *  `deriveStaffProfile`) is derived beside them, never carried here. */
export interface PresenceStaffMember {
  readonly role: PresenceRole;
  readonly firstName: string;
  readonly lastName: string;
}

/**
 * The club's President, Physio and Assistant Manager — a name and a role, never stored.
 *
 * Every club in the world has all three, at every Simulation Depth, at zero storage and zero
 * world-generation cost: they are a pure function of the world seed and the club's canonical id
 * (plus the nation, which owns the name pool). Each person draws on its own seed —
 * `deriveSeed(worldSeed, "presence", "<clubId>:president")` and the same shape for the physio and the
 * assistant — so deriving one never reads or advances another, and none touches the `"staff"`
 * stream that `generateStaff` draws the bound two from, whose order every existing save's backroom depends on.
 *
 * Names come straight from `NAME_POOLS[clubNation]` — staff precedent, domestic, no nationality
 * drawn here; a Staff Profile's nationality is the club's nation for that reason — and nothing varies by Stature Tier, since
 * presence people carry no number for the tier to own; that is why the derivation takes no tier. If
 * the physio draws the president's full name, the physio is redrawn from a fresh seed of its own:
 * the collision is settled within the presence people only, never by cross-checking the bound staff.
 * The assistant arrived after the pair and is redrawn against both of them, so adding it moved
 * neither the president nor the physio of any existing save.
 */
export const derivePresenceStaff = ({
  clubId,
  clubNation,
  worldSeed,
}: {
  readonly clubId: string;
  readonly clubNation: NationCode;
  readonly worldSeed: number;
}): readonly PresenceStaffMember[] => {
  const pool = NAME_POOLS[clubNation];
  const person = (role: PresenceRole, seed: number): PresenceStaffMember => {
    const random = createSeededRng(seed);
    return {
      role,
      firstName: pickRandom(pool.givenNames, random),
      lastName: pickRandom(pool.surnames, random),
    };
  };

  const president = person("president", deriveSeed(worldSeed, "presence", `${clubId}:president`));

  let physio = person("physio", deriveSeed(worldSeed, "presence", `${clubId}:physio`));
  const fullName = (person: PresenceStaffMember): string =>
    `${person.firstName} ${person.lastName}`;
  for (
    let attempt = 1;
    fullName(physio) === fullName(president) && attempt < poolCombinations(clubNation);
    attempt++
  ) {
    physio = person("physio", deriveSeed(worldSeed, "presence", `${clubId}:physio`, attempt));
  }

  let assistant = person("assistant", deriveSeed(worldSeed, "presence", `${clubId}:assistant`));
  for (
    let attempt = 1;
    (fullName(assistant) === fullName(president) || fullName(assistant) === fullName(physio)) &&
    attempt < poolCombinations(clubNation);
    attempt++
  ) {
    assistant = person("assistant", deriveSeed(worldSeed, "presence", `${clubId}:assistant`, attempt));
  }

  return [president, physio, assistant];
};

/**
 * A club's backroom grouped for display: one department per role, in this fixed order. A group is
 * the department heading and the people under it, so a future role slots in by extending
 * `ROLE_DEPARTMENT`.
 */
export const STAFF_DEPARTMENTS = [
  "executive",
  "coaching",
  "recruitment",
  "medical",
] as const;

export type StaffDepartment = (typeof STAFF_DEPARTMENTS)[number];

/** The department a role's group lives under. */
export const ROLE_DEPARTMENT: Readonly<Record<ClubPersonRole, StaffDepartment>> = {
  president: "executive",
  coach: "coaching",
  assistant: "coaching",
  scout: "recruitment",
  physio: "medical",
};

/**
 * The address of one person in a club's backroom: their role and their ordinal among the club's
 * people of that role (`coach-0`, `scout-2`). Staff have no stored identity outside the human club,
 * so this pair — which the derivation reproduces for any club — is what a Staff Profile is keyed on.
 */
export type StaffKey = `${ClubPersonRole}-${number}`;

export const staffKey = (role: ClubPersonRole, ordinal: number): StaffKey => `${role}-${ordinal}`;

const STAFF_KEY = /^([a-z]+)-(0|[1-9]\d*)$/;

/** A key's role and ordinal, or `null` when the string names no role. */
export const parseStaffKey = (
  key: string,
): { readonly role: ClubPersonRole; readonly ordinal: number } | null => {
  const match = STAFF_KEY.exec(key);
  if (match === null) return null;
  const role = match[1] as ClubPersonRole;
  const roles: readonly string[] = [...STAFF_ROLES, ...PRESENCE_ROLES];
  if (!roles.includes(role)) return null;
  return { role, ordinal: Number(match[2]) };
};

/** One person in a club's whole backroom, whichever kind — `GeneratedStaff` minus `quality`. */
export interface ClubPerson {
  readonly key: StaffKey;
  readonly role: ClubPersonRole;
  readonly firstName: string;
  readonly lastName: string;
}

/** A department heading and the people under it. */
export interface StaffDepartmentGroup {
  readonly department: StaffDepartment;
  readonly members: readonly ClubPerson[];
}

/**
 * A club's whole backroom, grouped by department, answerable for any club.
 *
 * The bound Coach and Scouts are always re-derived — never read from the `staff` table — and
 * re-derived from the exact stream `materialiseStaff` writes, so the grouped result agrees with the
 * rows wherever they exist, by construction. Presence Staff carry nothing a Stature Tier owns, so
 * the pair is identical at every tier, and a `results-only` club (no rows at all) answers like any
 * other.
 */
export const deriveClubStaff = ({
  clubId,
  statureTier,
  clubNation,
  worldSeed,
}: {
  readonly clubId: string;
  readonly statureTier: StatureTier;
  readonly clubNation: NationCode;
  readonly worldSeed: number;
}): readonly StaffDepartmentGroup[] => {
  const presence = derivePresenceStaff({ clubId, clubNation, worldSeed });
  const bound = generateStaff({
    statureTier,
    clubNation,
    random: createSeededRng(deriveSeed(worldSeed, "staff", clubId)),
  });

  // Bound first so the Coach heads the coaching group above the Assistant Manager.
  const ordinals = new Map<ClubPersonRole, number>();
  const people: readonly ClubPerson[] = [...bound, ...presence].map(({ role, firstName, lastName }) => {
    const ordinal = ordinals.get(role) ?? 0;
    ordinals.set(role, ordinal + 1);
    return { key: staffKey(role, ordinal), role, firstName, lastName };
  });

  return STAFF_DEPARTMENTS.map((department) => ({
    department,
    members: people.filter((person) => ROLE_DEPARTMENT[person.role] === department),
  }));
};
