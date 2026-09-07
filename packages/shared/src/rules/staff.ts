import type { StatureTier } from "../content/clubs.js";
import { createSeededRng, pickRandom, type RandomSource } from "../random.js";
import { NAME_POOLS, poolCombinations } from "../content/namePools.js";
import { deriveSeed } from "../seed.js";
import type { NationCode } from "../content/nations.js";

/**
 * A club's backroom, in exactly four roles across two kinds.
 *
 * **Bound Staff** — the Coach and the Scout — carry the bindings: a scout's quality drives how fast
 * their assignment accrues, and a coach scales the passive development baseline. They are the only
 * staff with rows, materialised once a club is human-managed.
 *
 * **Presence Staff** — the President and the Physio — carry a name and a role and nothing else, and
 * exist to be seen rather than read by a formula. They are never stored: a pure function of the
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
const QUALITY_BAND: Readonly<Record<StatureTier, readonly [number, number]>> = {
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
 * The presence roles: people the world has to be *seen*, not read. The President (the Board's face)
 * and the Physio (a named medical person) sit beside — never inside — `STAFF_ROLES`, because the
 * `staff_role` check constraint permits exactly `coach` and `scout` and must go on saying so. A
 * caller that needs both unions reads `ClubPersonRole`.
 */
export const PRESENCE_ROLES = ["president", "physio"] as const;

export type PresenceRole = (typeof PRESENCE_ROLES)[number];

/** A role out of the whole backroom — bound or presence. */
export type ClubPersonRole = StaffRole | PresenceRole;

/** A presence person: a name and a role and nothing else — `GeneratedStaff` minus `quality`. */
export interface PresenceStaffMember {
  readonly role: PresenceRole;
  readonly firstName: string;
  readonly lastName: string;
}

/**
 * The club's President and Physio — a name and a role, never stored.
 *
 * Every club in the world has both, at every Simulation Depth, at zero storage and zero
 * world-generation cost: the pair is a pure function of the world seed and the club's canonical id
 * (plus the nation, which owns the name pool). Each person draws on its own seed —
 * `deriveSeed(worldSeed, "presence", "<clubId>:president")` and the same shape for the physio — so
 * deriving one never reads or advances the other, and neither touches the `"staff"` stream that
 * `generateStaff` draws the bound two from, whose order every existing save's backroom depends on.
 *
 * Names come straight from `NAME_POOLS[clubNation]` — staff precedent, domestic, no nationality
 * drawn, because no shipped surface would display one — and nothing varies by Stature Tier, since
 * presence people carry no number for the tier to own; that is why the derivation takes no tier. If
 * the physio draws the president's full name, the physio is redrawn from a fresh seed of its own:
 * the collision is settled within the presence pair only, never by cross-checking the bound staff.
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

  return [president, physio];
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
  scout: "recruitment",
  physio: "medical",
};

/** One person in a club's whole backroom, whichever kind — `GeneratedStaff` minus `quality`. */
export interface ClubPerson {
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

  const people: readonly ClubPerson[] = [
    ...presence,
    ...bound.map(({ role, firstName, lastName }) => ({ role, firstName, lastName })),
  ];

  return STAFF_DEPARTMENTS.map((department) => ({
    department,
    members: people.filter((person) => ROLE_DEPARTMENT[person.role] === department),
  }));
};
