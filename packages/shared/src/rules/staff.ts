import type { StatureTier } from "../content/clubs.js";
import type { RandomSource } from "../random.js";
import { NAME_POOLS } from "../content/namePools.js";
import type { NationCode } from "../content/nations.js";

/**
 * The manager's backroom: two roles, each with exactly one binding and one number.
 *
 * Staff ship only because they now carry real bindings — a scout's quality drives how fast their
 * assignment accrues, and a coach scales the passive development baseline. Everything else about a
 * staff member is presence: a name and a role, so directing scouting is directing a person rather
 * than spending an abstract slot, and so the backroom is a reason to take a bigger job.
 *
 * There is no Physio, Director of Football, or Assistant Manager, because each would need a binding
 * and none has a system to bind to. There are no wages, no candidate pool, and no hiring or firing:
 * quality derives from the club's Stature Tier with seeded variance, which makes *which club you
 * take* the decision that determines your backroom — a decision surface that already ships.
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
