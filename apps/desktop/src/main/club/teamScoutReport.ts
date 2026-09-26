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
  TeamScoutReadingsView,
  TeamScoutReportView,
} from "@cm-clone/contracts";
import {
  deriveTeamScoutReport,
  type TargetFormResult,
  type TargetSquadMember,
} from "@cm-clone/shared";
import { Effect, Schema } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { loadSeasonRow } from "../season/currentSeason.js";
import { displayNames } from "../world/displayNames.js";
import { loadProgressOnClubPlayers } from "./scoutingProgress.js";
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

/** The id of the reading a report takes on a date. A reading is pinned to the calendar date, so the
 *  pair names it; commands that act on a report compare against this to refuse a stale one. */
export const reportIdFor = (clubId: ClubId, date: string): string => `${clubId}:${date}`;

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

/** The scout the reading club currently has watching the target, if any. A scout on the Club
 *  itself is the report's author and wins; failing that, a scout on one of its players still keeps
 *  the reading current. A target may legitimately have neither. */
const loadWatchingScout = (readerClubId: ClubId, targetClubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ scoutId: string; scoutName: string }>`
      SELECT s.id as "scoutId", s.name as "scoutName"
      FROM scouting_assignments a
      JOIN staff s ON s.id = a.scout_id
      LEFT JOIN players p ON p.id = a.player_id
      WHERE s.club_id = ${readerClubId} AND s.role = 'scout'
        AND (a.target_club_id = ${targetClubId} OR p.club_id = ${targetClubId})
      ORDER BY (a.target_club_id IS NULL) ASC, s.id ASC LIMIT 1`;
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

export const readTeamScoutReport = (clubId: ClubId) =>
  Effect.gen(function* () {
    if (!(yield* clubExists(clubId))) {
      return yield* new ClubNotFoundError({ id: clubId });
    }

    const season = yield* loadSeasonRow;
    const currentReportId = reportIdFor(clubId, season.currentDate);
    const readerClubId = yield* loadHumanClubId;
    // No human club means nobody has scouted anybody: the same not-scouted state as an unvisited
    // club, reached before any join runs.
    if (readerClubId === null) {
      return yield* new ClubNotScoutedError({ clubId, currentReportId });
    }

    // The shared loader, so the progress this report publishes is the same one a rival's Players
    // are read at on the Squad screen, the search, the comparison and the market.
    const progress = yield* loadProgressOnClubPlayers(readerClubId, clubId);
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
      return yield* new ClubNotScoutedError({ clubId, currentReportId });
    }

    const nameOf = yield* displayNames;

    return new TeamScoutReportView({
      reportId: currentReportId,
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

/**
 * Files the reading a Club watch produced, as it stands at this moment. Called by the scouting
 * commands just before an assignment on `targetClubId` ends, so the scout is still named.
 *
 * A club with nothing scouted files nothing: there is no reading to keep. A second filing for the same
 * club on the same date replaces the first, because both derive from the same knowledge.
 */
export const fileTeamScoutReading = (targetClubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const readerClubId = yield* loadHumanClubId;
    if (readerClubId === null) return;
    const report = yield* readTeamScoutReport(targetClubId).pipe(
      Effect.catchTags({
        ClubNotScoutedError: () => Effect.succeed(null),
        ClubNotFoundError: () => Effect.succeed(null),
      }),
    );
    if (report === null) return;
    const encoded = JSON.stringify(yield* Schema.encodeEffect(TeamScoutReportView)(report));
    yield* sql`INSERT INTO team_scout_readings (club_id, target_club_id, observed_on, report)
      VALUES (${readerClubId}, ${targetClubId}, ${report.observedAt}, ${encoded})
      ON CONFLICT(club_id, target_club_id, observed_on) DO UPDATE SET report = excluded.report`;
  });

/** Previous Reports: every reading the human's club has filed about `clubId`, newest first. */
export const getTeamScoutReadings = (savesDir: string, saveId: SaveId, clubId: ClubId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      if (!(yield* clubExists(clubId))) {
        return yield* new ClubNotFoundError({ id: clubId });
      }
      const readerClubId = yield* loadHumanClubId;
      if (readerClubId === null) {
        return new TeamScoutReadingsView({ targetClubId: clubId, readings: [] });
      }
      const sql = yield* SqlClient;
      // The primary key makes (club, target, date) unique, so the date alone orders the list
      // deterministically.
      const rows = yield* sql<{ report: string }>`
        SELECT report FROM team_scout_readings
        WHERE club_id = ${readerClubId} AND target_club_id = ${clubId}
        ORDER BY observed_on DESC`;
      const readings = yield* Effect.forEach(
        rows,
        (row) => Schema.decodeUnknownEffect(TeamScoutReportView)(JSON.parse(row.report) as unknown),
        { concurrency: 1 },
      );
      return new TeamScoutReadingsView({ targetClubId: clubId, readings });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );
