import { type PlayerId } from "@cm-clone/contracts";
import { ageOn, overallRating, weeklyWage, type GeneratedPlayer } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

/**
 * Gives every player of a squad the rollover just generated an ordinary Contract, written directly:
 * the formula wage for the player's rating and their age on `signedOn`, `yearsFor(slot)` years, and
 * `signedSeason`. The one path for both rollover generators — the Youth Intake and the squad
 * conjured for a club promoted out of a `results-only` division — so neither leaves players who
 * never expire and never count against a Wage Budget.
 *
 * No Wage Budget gate, as with an AI club's signing: these players are the club's squad, not a
 * purchase a budget could refuse. `idFor` must be the one the squad was inserted with.
 */
export const signGeneratedSquad = (
  squad: ReadonlyArray<GeneratedPlayer & { readonly slot: { readonly index: number } }>,
  idFor: (slotIndex: number) => PlayerId,
  terms: {
    readonly signedSeason: number;
    /** The date the wage's age is taken on: the date the next Season opens. */
    readonly signedOn: string;
    readonly yearsFor: (slotIndex: number) => number;
  },
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    for (const generated of squad) {
      const wage = weeklyWage(
        overallRating(generated.attributes, generated.positions),
        ageOn(generated.dateOfBirth, terms.signedOn),
        generated.potentialAbility,
      );
      yield* sql`INSERT INTO contracts (player_id, wage, years_remaining, signed_season)
        VALUES (${idFor(generated.slot.index)}, ${wage}, ${terms.yearsFor(generated.slot.index)}, ${terms.signedSeason})`;
    }
  });
