/**
 * Pure double round-robin scheduling: shape, and determinism from the seed.
 *
 * No world is generated here — these run in milliseconds.
 */

import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { ClubId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { generateRoundRobinFixtures } from "../../../src/main/season/index.js";

it.effect("generateRoundRobinFixtures produces a double round-robin: 38 fixtures/club across 38 rounds of 10", () =>
  Effect.gen(function* () {
    const clubIds = Array.from({ length: 20 }, (_, i) => ClubId.make(`club-${i}`));
    const fixtures = yield* generateRoundRobinFixtures(clubIds, 1234);

    // 20 clubs, double round-robin: C(20,2) = 190 pairings x 2 legs = 380 Fixtures, 10/Matchday x 38.
    strictEqual(fixtures.length, 380);

    const roundCounts = new Map<number, number>();
    for (const fixture of fixtures) {
      roundCounts.set(fixture.round, (roundCounts.get(fixture.round) ?? 0) + 1);
    }
    strictEqual(roundCounts.size, 38);
    for (const count of roundCounts.values()) strictEqual(count, 10);

    const perClub = new Map<string, number>();
    for (const fixture of fixtures) {
      perClub.set(fixture.homeClubId, (perClub.get(fixture.homeClubId) ?? 0) + 1);
      perClub.set(fixture.awayClubId, (perClub.get(fixture.awayClubId) ?? 0) + 1);
    }
    for (const clubId of clubIds) strictEqual(perClub.get(clubId), 38);

    // every pair meets exactly twice, once at each club's home
    const pairCounts = new Map<string, number>();
    for (const fixture of fixtures) {
      const key = [fixture.homeClubId, fixture.awayClubId].sort().join("|");
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }
    for (const count of pairCounts.values()) strictEqual(count, 2);
  }),
);

it.effect("generateRoundRobinFixtures is deterministic from its seed but reshuffles across seeds", () =>
  Effect.gen(function* () {
    const clubIds = Array.from({ length: 20 }, (_, i) => ClubId.make(`club-${i}`));
    const a = yield* generateRoundRobinFixtures(clubIds, 42);
    const b = yield* generateRoundRobinFixtures(clubIds, 42);
    deepStrictEqual(a, b);

    const c = yield* generateRoundRobinFixtures(clubIds, 999);
    ok(JSON.stringify(a) !== JSON.stringify(c));
  }),
);
