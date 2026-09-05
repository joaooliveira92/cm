import { type ClubId, type FixtureId } from "@cm-clone/contracts";
import {
  NATION_PROFILES,
  POSITIONS,
  collapseSquadStrength,
  createSeededRng,
  deriveSeed,
  generateSquadAtStrength,
  computeSquadQuality,
  nationCodeFromId,
  positionRating,
  resultsStrength,
  type PlayerAttributes,
  type StatureTier,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { insertGeneratedSquad } from "../worldGeneration.js";
import { discardSquadsForClubs } from "./matchday.js";

// ---------------------------------------------------------------------------
// The season rollover: promotion, relegation, and the world one year on
// ---------------------------------------------------------------------------

/**
 * Moves the world into the next season: exchanges clubs along every link, rebuilds membership, and
 * reconciles each club's squad with the depth it now plays at.
 *
 * One effect inside the advance's existing transaction, so a world is never half-promoted — a save
 * with the champions moved up and the relegated clubs still in place is not a state any reader
 * should have to handle.
 *
 * The world is **closed at the edge of the chosen scope**: links exist only between competitions
 * this save loaded, so nothing is relegated out of the lowest division or promoted out of the
 * highest. Buying the drop is what choosing a wider scope means.
 */
export const rolloverToNextSeason = (concludedSeason: number, referenceYear: number, worldSeed: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const nextSeason = concludedSeason + 1;

    // Every league's field as it finished, in frozen order. Cups are excluded: their field is
    // re-derived from the source competitions when next season's round 1 is drawn, so copying it
    // forward would carry last season's entrants into a world that has already changed.
    const finished = yield* sql<{ competitionId: string; clubId: ClubId; finalPosition: number }>`
      SELECT cp.competition_id as "competitionId", cp.club_id as "clubId", cp.final_position as "finalPosition"
      FROM competition_participants cp
      JOIN competitions c ON c.id = cp.competition_id
      WHERE cp.season_number = ${concludedSeason} AND c.kind <> 'cup' AND cp.final_position IS NOT NULL
      ORDER BY cp.competition_id ASC, cp.final_position ASC`;

    const fields = new Map<string, Array<ClubId>>();
    for (const row of finished) {
      const field = fields.get(row.competitionId);
      if (field) field.push(row.clubId);
      else fields.set(row.competitionId, [row.clubId]);
    }

    const links = yield* sql<{ higher: string; lower: string; slots: number }>`
      SELECT higher_competition_id as "higher", lower_competition_id as "lower", slots
      FROM competition_links ORDER BY higher_competition_id ASC, lower_competition_id ASC`;

    // Each link is one fact carrying both directions, so the same number goes down as comes up and
    // a division's size cannot drift. Where one division feeds two parallel regional ones, the
    // relegated clubs are dealt to those links in canonical order — the domain records no region on
    // a club, so there is nothing truer than a stable order to sort them by.
    const goingDown = new Map<string, Array<ClubId>>();
    const goingUp = new Map<string, Array<ClubId>>();
    const takenFromBottom = new Map<string, number>();

    for (const link of links) {
      const higherField = fields.get(link.higher);
      const lowerField = fields.get(link.lower);
      if (higherField === undefined || lowerField === undefined) continue;

      const alreadyTaken = takenFromBottom.get(link.higher) ?? 0;
      const relegated = higherField.slice(
        Math.max(0, higherField.length - alreadyTaken - link.slots),
        higherField.length - alreadyTaken,
      );
      takenFromBottom.set(link.higher, alreadyTaken + link.slots);
      const promoted = lowerField.slice(0, link.slots);

      goingDown.set(link.higher, [...(goingDown.get(link.higher) ?? []), ...relegated]);
      goingUp.set(link.lower, [...(goingUp.get(link.lower) ?? []), ...promoted]);
      // The clubs each division receives from the other end of this link.
      goingUp.set(link.higher, [...(goingUp.get(link.higher) ?? []), ...promoted]);
      goingDown.set(link.lower, [...(goingDown.get(link.lower) ?? []), ...relegated]);
    }

    for (const [competitionId, field] of fields) {
      const leaving = new Set<string>([
        ...(links.some((link) => link.higher === competitionId)
          ? (goingDown.get(competitionId) ?? []).filter((clubId) =>
              // A club leaves downward only if it was in this division to begin with.
              field.includes(clubId),
            )
          : []),
        ...(links.some((link) => link.lower === competitionId)
          ? (goingUp.get(competitionId) ?? []).filter((clubId) => field.includes(clubId))
          : []),
      ]);
      const arriving = [
        ...(goingUp.get(competitionId) ?? []),
        ...(goingDown.get(competitionId) ?? []),
      ].filter((clubId) => !field.includes(clubId));

      const nextField = [...field.filter((clubId) => !leaving.has(clubId)), ...new Set(arriving)];
      for (const clubId of nextField) {
        yield* sql`INSERT OR IGNORE INTO competition_participants (competition_id, season_number, club_id)
          VALUES (${competitionId}, ${nextSeason}, ${clubId})`;
      }
    }

    yield* reconcileSquadsWithDepth(nextSeason, concludedSeason, referenceYear, worldSeed);
    yield* pruneConcludedSeason(concludedSeason);
  });

/**
 * Discards the world's past and keeps the player's.
 *
 * A save that kept every fixture of every competition forever would double in size roughly every
 * twenty seasons, almost all of it football nobody watched. The rule is **participation**: a
 * past season's fixtures survive only for the competitions the human's club actually played in.
 *
 * The deletion is irreversible and its consequence is worth carrying forward as a constraint rather
 * than a footnote: **no screen can ever show a rival nation's history.** What remains of every other
 * competition's season is its frozen participant rows — final position, points, goal difference,
 * goals for — which is why the freeze happens before this runs and why discarding fixtures never
 * discards a table.
 *
 * A match stream is pruned exactly when its fixture is, so the log never outlives the thing it
 * describes. Nothing else in the log is touched: there is no partitioning and no snapshotting here,
 * because the only fold in the system is one 90-minute match.
 *
 * Deleting nothing is the normal case for a first season played entirely in one's own division, and
 * is not a failure.
 */
const pruneConcludedSeason = (concludedSeason: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;

    // The competitions the human's club played in — its league and any cup it entered.
    const doomed = yield* sql<{ id: FixtureId }>`
      SELECT f.id FROM fixtures f
      WHERE f.season_number = ${concludedSeason}
        AND f.competition_id NOT IN (
          SELECT cp.competition_id FROM competition_participants cp
          JOIN clubs c ON c.id = cp.club_id
          WHERE cp.season_number = ${concludedSeason} AND c.is_user_club = 1
        )`;
    if (doomed.length === 0) return;

    // The stream before the fixture: a match stream is keyed on its fixture's id (ticket 17), so
    // the ids are the same values rendered as text.
    const streamIds = doomed.map((row) => String(row.id));
    yield* sql`DELETE FROM events WHERE stream_type = 'match' AND ${sql.in("stream_id", streamIds)}`;
    yield* sql`DELETE FROM fixtures WHERE ${sql.in("id", doomed.map((row) => row.id))}`;
  });

/**
 * Brings every club's squad into line with the depth it plays at next season.
 *
 * Crossing the boundary **discards downward and conjures upward**. A club dropping into a
 * results-only tier loses its players permanently; one climbing out of it is given a squad
 * generated to the strength it was already performing at, so its first fixture does not contradict
 * its last.
 *
 * Neither branch reads a Depth column on a club, because there is none: the question asked is
 * whether the club has player rows, and the competition it now belongs to says whether it should.
 */
const reconcileSquadsWithDepth = (
  nextSeason: number,
  concludedSeason: number,
  referenceYear: number,
  worldSeed: number,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const clubs = yield* sql<{
      clubId: ClubId;
      depth: string;
      tier: number | null;
      nationId: string | null;
      statureTier: StatureTier;
      generationSeed: number;
      squadSize: number;
    }>`SELECT cp.club_id as "clubId", c.depth, c.tier, c.nation_id as "nationId",
              cl.stature_tier as "statureTier", cl.generation_seed as "generationSeed",
              (SELECT COUNT(*) FROM players p WHERE p.club_id = cp.club_id) as "squadSize"
       FROM competition_participants cp
       JOIN competitions c ON c.id = cp.competition_id
       JOIN clubs cl ON cl.id = cp.club_id
       WHERE cp.season_number = ${nextSeason} AND c.kind <> 'cup'
       ORDER BY cp.club_id ASC`;

    const relegated = clubs.filter((club) => club.depth === "results-only" && club.squadSize > 0);
    yield* discardSquadsForClubs(relegated.map((club) => club.clubId));

    for (const club of clubs) {
      if (club.depth === "results-only" || club.squadSize > 0) continue;
      const nationCode = club.nationId === null ? null : nationCodeFromId(club.nationId);
      if (nationCode === null) continue;

      // The strength it was performing at in the division it just left.
      const target = resultsStrength({
        worldSeed,
        clubId: club.clubId,
        statureTier: club.statureTier,
        tier: club.tier,
        nationPrior: NATION_PROFILES[nationCode].footballImportance,
        seasonNumber: concludedSeason,
      });

      const squad = generateSquadAtStrength(
        {
          tier: club.tier,
          nationPrior: NATION_PROFILES[nationCode].footballImportance,
          statureTier: club.statureTier,
        },
        {
          referenceYear,
          clubNation: nationCode,
          randomForSlot: (slot) =>
            createSeededRng(
              deriveSeed(deriveSeed(club.generationSeed, "promoted", nextSeason), "player", slot.index),
            ),
        },
        target,
        (generated) =>
          collapseSquadStrength(
            computeSquadQuality(
              generated.map((player, index) => ({
                id: String(index),
                positionRatings: positionRatingsFor(player.attributes as PlayerAttributes),
              })),
            )?.meanPositionRating ?? 0,
          ),
      );

      yield* insertGeneratedSquad(
        club.clubId,
        squad,
        deriveSeed(club.generationSeed, "promoted", nextSeason),
      );
    }
  });

/** Every position's rating for one player, which is what a squad collapses over. */
const positionRatingsFor = (attributes: PlayerAttributes): Record<string, number> =>
  Object.fromEntries(POSITIONS.map((position) => [position, positionRating(attributes, position)]));
