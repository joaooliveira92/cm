import {
  PlayerId,
  type ClubId,
  type SaveId,
  ClubNotFoundError,
  ClubNotScoutedError,
  FormationPredictionView,
  ReportFormResultView,
  ReportScoutView,
  ScoutedPlayerSummaryView,
  ScoutingFindingView,
  TeamScoutReportView,
} from "@cm-clone/contracts";
import {
  deriveTeamScoutReport,
  type TargetFormResult,
  type TargetSquadMember,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { loadSeasonRow } from "../season/currentSeason.js";
import { displayNames } from "../world/displayNames.js";
import { loadSquadPlayers } from "./squad.js";

/**
 * Team Scout Report (Screen 49): what the human's club knows about another club.
 *
 * A pure read. It compacts the *scouted* members of the target squad, the target's recent public
 * results, and the save's calendar into the shared derivation, which owns the meaning of the report
 * — this module owns only where the numbers come from. Nothing is written, and no `SaveArchivedError`
 * guard appears: an Archived Save is read-only rather than unreadable, so a report on a finished
 * career is a legitimate read like every other query in this package.
 *
 * The knowledge is read from the perspective of the **human's** club, never the target's. A club's
 * scouting progress belongs to the club that did the scouting, so the join below is keyed on the
 * reader and the target supplies only the set of players to look up.
 */

/** How many recent results the report carries. Enough to read a run of form, short enough that the
 *  report stays an orientation rather than a results screen. */
const RECENT_FORM_LENGTH = 5;

/**
 * Days of age attributed to knowledge that no scout is currently refreshing.
 *
 * Nothing on disk records *when* a club's progress last advanced — `scouting_progress` stores the
 * number and no date — so an unwatched target's true age is unknown. This resolves that in the
 * conservative direction: unwatched knowledge reads as stale, which tells a manager to go and look
 * again. The alternative, treating it as current, would let a report predating a whole transfer
 * window present itself as fresh. A truthful decay needs a `last_observed_on` column, which is
 * recorded as open work in the effort's Agent Note.
 */
const UNWATCHED_KNOWLEDGE_DAYS = 999;

/** The club the human manages, or `null` before one is chosen. */
const loadHumanClubId = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ id: ClubId }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
  return rows[0]?.id ?? null;
});

/** Whether the target club exists in this save at all. */
const clubExists = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ id: ClubId }>`SELECT id FROM clubs WHERE id = ${clubId}`;
    return rows[0] !== undefined;
  });

/** What the reading club knows about each of the target's players, sparse: a row exists only for a
 *  player who has actually been scouted, so absence is Unscouted rather than a stored zero. */
const loadProgressFor = (readerClubId: ClubId, targetClubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ playerId: PlayerId; progress: number }>`
      SELECT sp.player_id as "playerId", sp.progress
      FROM scouting_progress sp
      JOIN players p ON p.id = sp.player_id
      WHERE sp.club_id = ${readerClubId} AND p.club_id = ${targetClubId}`;
    return new Map(rows.map((row) => [row.playerId, row.progress]));
  });

/** The scout the reading club currently has pointed at someone in the target's squad, if any.
 *  Reports today are produced by per-player assignments, so a target may legitimately have none. */
const loadWatchingScout = (readerClubId: ClubId, targetClubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ scoutId: string; scoutName: string }>`
      SELECT s.id as "scoutId", s.name as "scoutName"
      FROM scouting_assignments a
      JOIN staff s ON s.id = a.scout_id
      JOIN players p ON p.id = a.player_id
      WHERE s.club_id = ${readerClubId} AND s.role = 'scout' AND p.club_id = ${targetClubId}
      ORDER BY s.id ASC LIMIT 1`;
    return rows[0] ?? null;
  });

/**
 * The target's most recent completed fixtures, newest first.
 *
 * Public information — a results list is visible to everyone — so this is not gated on scouting.
 * Scoped to the current season so the read stays bounded; a club that changed competition mid-season
 * still reads correctly, because the filter is the club and the season rather than a competition.
 */
const loadRecentForm = (clubId: ClubId, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const nameOf = yield* displayNames;
    const rows = yield* sql<{
      date: string;
      homeClubId: ClubId;
      awayClubId: ClubId;
      homeGoals: number;
      awayGoals: number;
    }>`SELECT scheduled_date as "date", home_club_id as "homeClubId", away_club_id as "awayClubId",
              home_goals as "homeGoals", away_goals as "awayGoals"
       FROM fixtures
       WHERE played = 1 AND season_number = ${seasonNumber}
         AND (home_club_id = ${clubId} OR away_club_id = ${clubId})
       ORDER BY scheduled_date DESC LIMIT ${RECENT_FORM_LENGTH}`;
    return rows.map((row): TargetFormResult => {
      const isHome = row.homeClubId === clubId;
      return {
        date: row.date,
        opponentClubName: nameOf(isHome ? row.awayClubId : row.homeClubId),
        isHome,
        goalsFor: isHome ? row.homeGoals : row.awayGoals,
        goalsAgainst: isHome ? row.awayGoals : row.homeGoals,
      };
    });
  });

export const getTeamScoutReport = (savesDir: string, saveId: SaveId, clubId: ClubId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    readTeamScoutReport(clubId).pipe(
      Effect.provide(SqliteClient.layer({ filename, readonly: true })),
      Effect.scoped,
    ),
  );

const readTeamScoutReport = (clubId: ClubId) =>
  Effect.gen(function* () {
    if (!(yield* clubExists(clubId))) {
      return yield* new ClubNotFoundError({ id: clubId });
    }

    const readerClubId = yield* loadHumanClubId;
    // No human club means nobody has scouted anybody: the same not-scouted state as an unvisited
    // club, reached before any join runs.
    if (readerClubId === null) {
      return yield* new ClubNotScoutedError({ clubId });
    }

    const season = yield* loadSeasonRow;
    const progress = yield* loadProgressFor(readerClubId, clubId);
    const players = yield* loadSquadPlayers(clubId);

    const squad = players.map((player): TargetSquadMember => {
      const natural = player.positions.find((p) => p.familiarity === "natural");
      return {
        playerId: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        position: natural?.position ?? player.positions[0]?.position ?? "MC",
        progress: progress.get(player.id) ?? 0,
        overallRating: player.overallRating,
      };
    });

    const watching = yield* loadWatchingScout(readerClubId, clubId);
    const recentForm = yield* loadRecentForm(clubId, season.seasonNumber);
    const derived = deriveTeamScoutReport({
      squad,
      recentForm,
      daysSinceObserved: watching === null ? UNWATCHED_KNOWLEDGE_DAYS : 0,
    });

    // The derivation returns null for a target nobody has scouted — including a `results-only` club,
    // which holds no player rows at all and so can never have been scouted.
    if (derived === null) {
      return yield* new ClubNotScoutedError({ clubId });
    }

    const nameOf = yield* displayNames;

    return new TeamScoutReportView({
      reportId: `${clubId}:${season.currentDate}`,
      targetClubId: clubId,
      targetClubName: nameOf(clubId),
      scout:
        watching === null
          ? null
          : new ReportScoutView({ scoutId: watching.scoutId, scoutName: watching.scoutName }),
      observedAt: season.currentDate,
      knowledgeConfidence: derived.knowledgeConfidence,
      freshness: derived.freshness,
      predictedFormation:
        derived.predictedFormation === null
          ? null
          : new FormationPredictionView(derived.predictedFormation),
      recentForm: recentForm.map((result) => new ReportFormResultView(result)),
      strengths: derived.strengths.map((finding) => new ScoutingFindingView(finding)),
      weaknesses: derived.weaknesses.map((finding) => new ScoutingFindingView(finding)),
      keyPlayers: derived.keyPlayers.map(
        (player) =>
          new ScoutedPlayerSummaryView({ ...player, playerId: PlayerId.make(player.playerId) }),
      ),
      setPieceFindings: derived.setPieceFindings.map(
        (finding) => new ScoutingFindingView(finding),
      ),
    });
  });
