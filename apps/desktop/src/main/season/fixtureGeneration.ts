import { type ClubId } from "@cm-clone/contracts";
import { createSeededRng, type RandomSource } from "@cm-clone/shared";
import { Data, Effect } from "effect";

// ---------------------------------------------------------------------------
// Domain errors
// ---------------------------------------------------------------------------

/** Raised when fixture generation gets an odd/insufficient club count — a caller precondition that
 * `startSeason` normally guarantees (the fixed 20-club League is even). */
export class FixtureGenerationError extends Data.TaggedError("FixtureGenerationError")<{
  readonly clubCount: number;
}> {}

// ---------------------------------------------------------------------------
// Pure fixture generation
// ---------------------------------------------------------------------------

const shuffle = <T,>(items: ReadonlyArray<T>, random: RandomSource): Array<T> => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
};

export interface GeneratedFixture {
  /** Competition-local round number, 1-based. */
  readonly round: number;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
}

/**
 * Freshly shuffled double round-robin (ticket 15 / ADR-0004): a seeded Fisher-Yates shuffle of the
 * club order (no seeding by prior standings) feeds the classic "circle method" to produce 19 rounds
 * covering every pair once (10 fixtures/round for 20 clubs), then a mirrored second leg with
 * home/away swapped — 38 Matchdays, 38 Fixtures/club, 380 total. Pure and deterministic from `seed`.
 */
export const generateRoundRobinFixtures = (
  clubIds: ReadonlyArray<ClubId>,
  seed: number,
): Effect.Effect<ReadonlyArray<GeneratedFixture>, FixtureGenerationError> =>
  Effect.gen(function* () {
    const n = clubIds.length;
    if (n < 2 || n % 2 !== 0) {
      return yield* new FixtureGenerationError({ clubCount: n });
    }

    const random = createSeededRng(seed);
    const shuffled = shuffle(clubIds, random);

    const fixed = shuffled[0];
    let rotating = shuffled.slice(1);
    const firstLeg: Array<GeneratedFixture> = [];

    for (let round = 0; round < n - 1; round++) {
      const roundClubs = [fixed, ...rotating];
      for (let i = 0; i < n / 2; i++) {
        const a = roundClubs[i]!;
        const b = roundClubs[n - 1 - i]!;
        const [homeClubId, awayClubId] = round % 2 === 0 ? [a, b] : [b, a];
        firstLeg.push({ round: round + 1, homeClubId, awayClubId });
      }
      rotating = [rotating[rotating.length - 1]!, ...rotating.slice(0, -1)];
    }

    const secondLeg: Array<GeneratedFixture> = firstLeg.map((fixture) => ({
      round: fixture.round + (n - 1),
      homeClubId: fixture.awayClubId,
      awayClubId: fixture.homeClubId,
    }));

    return [...firstLeg, ...secondLeg];
  });
