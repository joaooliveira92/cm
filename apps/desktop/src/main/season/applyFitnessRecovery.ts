import { type ClubId, type FixtureId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadManagerProfile } from "../career/managerProfile.js";
import { loadUserClub } from "../club/squad.js";
import { recoverClubFitness } from "./matchday.js";
import { type SeasonPhase } from "./currentSeason.js";

export const applyFitnessRecovery = (
  humanFixture: { id: FixtureId; homeClubId: ClubId; awayClubId: ClubId },
  seasonNumber: number,
  date: string,
  phaseAt: (date: string) => SeasonPhase,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const userClub = yield* loadUserClub;
    const profile = yield* loadManagerProfile;
    const regimen = profile?.pillars.regimen ?? 3;
    const homeRegimen = humanFixture.homeClubId === userClub.id ? regimen : 3;
    const awayRegimen = humanFixture.awayClubId === userClub.id ? regimen : 3;
    yield* recoverClubFitness(humanFixture.homeClubId, seasonNumber, homeRegimen);
    yield* recoverClubFitness(humanFixture.awayClubId, seasonNumber, awayRegimen);
    yield* sql`UPDATE season SET phase = ${phaseAt(date)},
        awaiting_fixture_id = ${humanFixture.id}
      WHERE season_number = ${seasonNumber}`;
  });