/**
 * Player Search (Screen 119) — the manager searches every Player in the save by the fields they
 * set, and the result rows read by the human club's Scouting Progress under the shared knowledge
 * rule (Agent Note 2026-09-19, tickets 09-11): the manager's own squad always exact, a rival or a
 * Free Agent an Attribute Range below Fully Scouted.
 *
 * The pool is `loadAllPlayersEcon` — the same whole-save, club-agnostic read the market and the
 * AI clubs use — with the filters applied in the wiring layer, because the filters are UI query
 * semantics, not game rules: matching on a rival's resolved club name depends on the display-name
 * pack, which is the read's seam, and a search that never narrowed would be the whole save at
 * once. Ordering is neutral (last name, first name, id) on purpose: figures are hidden knowledge,
 * so sorting by Overall Rating or Transfer Value would leak exact figures through the order in
 * which rows appear, even though every cell is a Range.
 */
import {
  PlayerSearchResultView,
  PlayerSearchResultsView,
  type PlayerSearchQuery,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { compareCodeUnits, figureByProgress, progressForReading, transferValueFigureByProgress } from "@cm-clone/shared";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { withExistingSave } from "../season/decider.js";
import { loadSeasonRow } from "../season/currentSeason.js";
import { loadUserClub } from "../club/squad.js";
import { loadClubScoutingProgress } from "../club/scoutingProgress.js";
import { loadAllPlayersEcon, type PlayerEcon } from "./economics.js";

/** The most rows one Player Search publishes. A cap keeps a no-filter search — the whole save,
 *  thousands of players — off the wire and off one screen; `total` still carries the true count. */
export const PLAYER_SEARCH_MAX_RESULTS = 200;

export const getPlayerSearch = (savesDir: string, saveId: SaveId, query: PlayerSearchQuery) =>
  withExistingSave(savesDir, saveId, (filename) =>
    readPlayerSearch(query).pipe(
      Effect.provide(SqliteClient.layer({ filename, readonly: true })),
      Effect.scoped,
    ),
  );

const readPlayerSearch = (query: PlayerSearchQuery) =>
  Effect.gen(function* () {
    const seasonRow = yield* loadSeasonRow;
    const players = yield* loadAllPlayersEcon(seasonRow.currentDate);

    // The progress rows are loaded once for the whole search — through the shared loader, so this
    // screen cannot resolve a player's knowledge differently from the market or the Profile — rather
    // than per player: thousands of rows on one query instead of thousands of queries.
    const humanClub = yield* loadUserClub;
    const progressByPlayer = yield* loadClubScoutingProgress(humanClub.id);

    const matched = players.filter((player) => matchesSearchQuery(player, query));
    const results = [...matched]
      .sort(byLastNameFirstNameId)
      .slice(0, PLAYER_SEARCH_MAX_RESULTS)
      .map((player) => toPlayerSearchResultView(player, humanClub.id, progressByPlayer));

    return new PlayerSearchResultsView({ total: matched.length, results });
  });

/** True when the player satisfies every filter the query names. An unset filter matches everyone;
 *  free text (name, club name) matches a case-insensitive substring. A Free Agent satisfies a club
 *  name search only by not having a club to match against — a query that names a real club can
 *  never list Free Agents, because they were not shown a club to pick. */
const matchesSearchQuery = (player: PlayerEcon, query: PlayerSearchQuery): boolean => {
  const name = query.name?.trim().toLowerCase();
  if (name !== undefined && name !== "" && !`${player.firstName} ${player.lastName}`.toLowerCase().includes(name)) {
    return false;
  }
  if (query.minAge !== undefined && player.age < query.minAge) return false;
  if (query.maxAge !== undefined && player.age > query.maxAge) return false;
  if (
    query.position !== undefined &&
    !player.positions.some((p) => p.position === query.position)
  ) {
    return false;
  }
  if (query.nationality !== undefined && player.nationality !== query.nationality) return false;
  const clubName = query.clubName?.trim().toLowerCase();
  if (
    clubName !== undefined &&
    clubName !== "" &&
    (player.clubName === null || !player.clubName.toLowerCase().includes(clubName))
  ) {
    return false;
  }
  return true;
};

/** The search's neutral ordering — last name, first name, id — so the same save always returns the
 *  same rows in the same order, and ordering leaks nothing about the knowledge it confines. */
const byLastNameFirstNameId = (a: PlayerEcon, b: PlayerEcon): number =>
  compareCodeUnits(a.lastName.toLowerCase(), b.lastName.toLowerCase()) ||
  compareCodeUnits(a.firstName.toLowerCase(), b.firstName.toLowerCase()) ||
  compareCodeUnits(a.id, b.id);

/** One Player turned into a search result row. Same read as the market and the profile: exact at
 *  Fully Scouted, ranges below it. Own-squad Players are exact by rule and never read their
 *  (empty) Scouting Progress, exactly as `readClubSquad` decides — that one rule is
 *  `progressForReading`, so no two of these screens can resolve it differently. */
const toPlayerSearchResultView = (
  player: PlayerEcon,
  humanClubId: string,
  progressByPlayer: ReadonlyMap<PlayerId, number>,
): PlayerSearchResultView => {
  const progress = progressForReading(
    player.clubId,
    humanClubId,
    progressByPlayer.get(player.id) ?? 0,
  );
  return new PlayerSearchResultView({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    age: player.age,
    clubId: player.clubId,
    clubName: player.clubName,
    nationality: player.nationality,
    positions: player.positions.map((p) => ({ position: p.position, familiarity: p.familiarity })),
    overallRating: figureByProgress(player.overallRating, progress),
    transferValue: transferValueFigureByProgress(
      player.overallRating,
      player.age,
      player.potentialAbility,
      progress,
    ),
  });
};