import { PlayerId, type ClubId } from "@cm-clone/contracts";
import {
  DEFAULT_CONTRACT_YEARS,
  NATION_PROFILES,
  ageOn,
  compareCodeUnits,
  createSeededRng,
  deriveId,
  deriveSeed,
  generateYouthIntake,
  nationCodeFromId,
  overallRating,
  seasonStartDate,
  seasonStartYear,
  weeklyWage,
  type StatureTier,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { appendHumanClubEvents } from "../transfers/bids.js";
import { insertGeneratedSquad } from "../world/worldGeneration.js";

/**
 * The Youth Intake: every club with a squad gains young players at the rollover, enough to keep it
 * at the squad floor (see `generateYouthIntake`).
 *
 * Runs inside the rollover, so inside the advance's one transaction and after Contract expiry,
 * which `stepCalendarTo` runs before the rollover. It also runs after the squads are reconciled with
 * depth, so a club relegated into a `results-only` division is not handed players only to lose
 * them, and a club promoted out of one gets its intake on top of its conjured squad like any other.
 *
 * Each club's intake is a function of the world seed (through the club's generation seed), the
 * Season, and the club alone — never of how many clubs came before it — so the same world gives the
 * same intake whatever order the rows are read in.
 *
 * Player ids derive from the full path — club generation seed, "youth-intake", Season, slot — through
 * `deriveId`, never from the 32-bit `baseSeed`: two clubs or Seasons whose `baseSeed`s collide would
 * otherwise mint the same ids and fail the `players.id` primary key on every retry of the
 * deterministic rollover. An id collision is then as unlikely as `deriveId` makes any other.
 * Attribute seeds still derive from `baseSeed`; a collision there only makes two players alike.
 */
export const grantYouthIntake = (nextSeason: number, referenceYear: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{
      clubId: ClubId;
      tier: number | null;
      nationId: string | null;
      statureTier: StatureTier;
      generationSeed: number;
    }>`SELECT cp.club_id as "clubId", c.tier, c.nation_id as "nationId",
              cl.stature_tier as "statureTier", cl.generation_seed as "generationSeed"
       FROM competition_participants cp
       JOIN competitions c ON c.id = cp.competition_id
       JOIN clubs cl ON cl.id = cp.club_id
       WHERE cp.season_number = ${nextSeason} AND c.kind <> 'cup' AND c.depth <> 'results-only'`;
    // One intake per club, even if a club ever holds two squad-competition rows in a Season: a
    // second intake would mint the same ids. Where the rows differ, the highest division (lowest
    // tier) supplies the intake's quality.
    const sorted = [...rows].sort(
      (a, b) =>
        compareCodeUnits(a.clubId, b.clubId) ||
        (a.tier ?? Number.MAX_SAFE_INTEGER) - (b.tier ?? Number.MAX_SAFE_INTEGER),
    );
    const clubs = sorted.filter((row, index) => index === 0 || sorted[index - 1]!.clubId !== row.clubId);

    const squadRows = yield* sql<{ clubId: ClubId; firstName: string; lastName: string }>`
      SELECT club_id as "clubId", first_name as "firstName", last_name as "lastName"
      FROM players WHERE club_id IS NOT NULL`;
    const squads = new Map<string, Array<string>>();
    for (const row of squadRows) {
      const names = squads.get(row.clubId);
      const name = `${row.firstName} ${row.lastName}`;
      if (names) names.push(name);
      else squads.set(row.clubId, [name]);
    }

    // Both dates of the rollover — the one the Season concluded on and the one the next opens on —
    // fall in the next Season's start year, which is what the intake's ages are drawn against.
    const year = seasonStartYear(referenceYear, nextSeason);
    const joinedOn = seasonStartDate(referenceYear, nextSeason);

    for (const club of clubs) {
      const nationCode = club.nationId === null ? null : nationCodeFromId(club.nationId);
      if (nationCode === null) continue;
      const squad = squads.get(club.clubId) ?? [];
      const baseSeed = deriveSeed(club.generationSeed, "youth-intake", nextSeason);

      const intake = generateYouthIntake(
        {
          tier: club.tier,
          nationPrior: NATION_PROFILES[nationCode].footballImportance,
          statureTier: club.statureTier,
        },
        {
          year,
          clubNation: nationCode,
          squadSize: squad.length,
          taken: new Set(squad),
          sizeRandom: createSeededRng(deriveSeed(baseSeed, "size")),
          randomForSlot: (index) => createSeededRng(deriveSeed(baseSeed, "player", index)),
        },
      );

      const idFor = youthIntakePlayerId(club.generationSeed, nextSeason);
      yield* insertGeneratedSquad(club.clubId, intake, baseSeed, idFor);

      // An ordinary Contract on the terms every signing uses: the formula wage for the player's
      // rating and age, and the default length. No Wage Budget gate, as with an AI club's signing:
      // the intake is the floor, and a floor a budget could refuse would not be one.
      const players: Array<{ playerId: PlayerId; name: string }> = [];
      for (const generated of intake) {
        const playerId = idFor(generated.slot.index);
        const wage = weeklyWage(
          overallRating(generated.attributes, generated.positions),
          ageOn(generated.dateOfBirth, joinedOn),
          generated.potentialAbility,
        );
        yield* sql`INSERT INTO contracts (player_id, wage, years_remaining, signed_season)
          VALUES (${playerId}, ${wage}, ${DEFAULT_CONTRACT_YEARS}, ${nextSeason})`;
        players.push({ playerId, name: `${generated.firstName} ${generated.lastName}` });
      }

      // The News Inbox item, for the human club only — `appendHumanClubEvents` drops the rest.
      yield* appendHumanClubEvents(club.clubId, [
        { tag: "YouthIntakeJoined", payload: { seasonNumber: nextSeason, players } },
      ]);
    }
  });

/**
 * The id of the Youth Intake player in `slotIndex` of a club's intake for `seasonNumber`, derived
 * from the whole path rather than from an intermediate 32-bit seed (see `grantYouthIntake`).
 */
export const youthIntakePlayerId =
  (clubGenerationSeed: number, seasonNumber: number) =>
  (slotIndex: number): PlayerId =>
    PlayerId.make(deriveId(clubGenerationSeed, "youth-intake", seasonNumber, "player", slotIndex));
