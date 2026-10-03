import { Schema } from "effect";

import {
  ClubId,
  ClubNotFoundError,
  ClubNotScoutedError,
  OwnClubNotScoutableError,
  PlayerComparisonView,
  PlayerId,
  PlayerNotFoundError,
  PlayerSearchQuerySchema,
  PlayerSearchResultsView,
  SaveArchivedError,
  SaveId,
  SaveNotFoundError,
  ScoutingKnowledgeView,
  ScoutingView,
  StaleReportError,
  TeamScoutReadingsView,
  TeamScoutReportView,
  UnknownScoutError,
} from "./schemas/index.js";

/**
 * Scouting's whole RPC surface — the assignment board, the Team Scout Report, and the Player
 * Search — kept in its own module and spread into `AppRpcs`.
 *
 * Split out because `rpc.ts` reached the 600-line ceiling `scripts/effect-lint.ts` enforces, and the
 * honest fix there is a seam rather than another round of comment-tightening. Scouting is a good one
 * to cut on: its methods share a vocabulary (a scout, a target, accrued progress) that no other
 * method touches, so the group reads as a unit rather than as an arbitrary slice taken to save
 * lines. Later Scouting methods belong here beside these rather than back in the omnibus file.
 */
export const ScoutingRpcs = {
  /** Team Scout Report (Screen 49): what the human's club knows about another club, derived from
   * the Scouting Progress already accrued on that club's players. Immutable per calendar revision.
   * A club nobody has scouted is `ClubNotScoutedError` rather than an empty report — "we know
   * nothing" must not read as "they are nothing". No `SaveArchivedError`: like every pure read
   * here, an Archived Save is read-only rather than unreadable. */
  getTeamScoutReport: {
    payload: Schema.Struct({ saveId: SaveId, clubId: ClubId }),
    success: TeamScoutReportView,
    error: Schema.Union([SaveNotFoundError, ClubNotFoundError, ClubNotScoutedError]),
  },
  /** Scouting: point a named scout at a player. The scout's club is read from their staff row, so
   * no club is named here. Reassigning a scout who is already watching someone is legitimate —
   * the manager is redirecting a person — and progress the club has accrued stays with the club. */
  assignScout: {
    payload: Schema.Struct({ saveId: SaveId, scoutId: Schema.String, playerId: PlayerId }),
    success: ScoutingView,
    error: Schema.Union([SaveNotFoundError, UnknownScoutError, PlayerNotFoundError, SaveArchivedError]),
  },
  /** Team Scout Report (Screen 49), Previous Reports: the readings the human's club has filed about
   * a club, newest first. A pure read, so an Archived Save still answers it. */
  getTeamScoutReadings: {
    payload: Schema.Struct({ saveId: SaveId, clubId: ClubId }),
    success: TeamScoutReadingsView,
    error: Schema.Union([SaveNotFoundError, ClubNotFoundError]),
  },
  /** Scouting: point a named scout at a Club, which is shorthand for that club's squad. Occupies the
   * scout exactly as a player assignment does. `expectedReportId` is the Team Scout Report reading
   * the manager acted from; once the calendar has moved past it the command is refused with
   * `StaleReportError` and changes nothing. Assigning the same scout to the same club again is a
   * no-op, because an assignment is a state rather than an event. */
  assignScoutToClub: {
    payload: Schema.Struct({
      saveId: SaveId,
      scoutId: Schema.String,
      clubId: ClubId,
      expectedReportId: Schema.String,
    }),
    success: ScoutingView,
    error: Schema.Union([
      SaveNotFoundError,
      UnknownScoutError,
      ClubNotFoundError,
      SaveArchivedError,
      StaleReportError,
      OwnClubNotScoutableError,
    ]),
  },
  /** Frees a scout. Their accrued progress stays: knowledge is not un-learned. */
  unassignScout: {
    payload: Schema.Struct({ saveId: SaveId, scoutId: Schema.String }),
    success: ScoutingView,
    error: Schema.Union([SaveNotFoundError, UnknownScoutError, SaveArchivedError]),
  },
  /** The scouting board — every scout at the human's club and what they are watching. */
  getScouting: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: ScoutingView,
    error: Schema.Union([SaveNotFoundError]),
  },
  /** Scouting Knowledge (Screen 126): per Club with a scouted Player, the count scouted, coverage and
   * Knowledge Confidence; per scouted Player, name, Club and Scouting Progress. A save with no
   * scouting answers with two empty lists rather than an error, and own-squad Players never appear.
   * A pure read, so an Archived Save still answers it. */
  getScoutingKnowledge: {
    payload: Schema.Struct({ saveId: SaveId }),
    success: ScoutingKnowledgeView,
    error: Schema.Union([SaveNotFoundError]),
  },
  /** Player Search (Screen 119): every Player in the save that matches the query, figures read by
   * the human club's Scouting Progress on each (ranges below Fully Scouted, exact at it and for the
   * manager's own squad — ticket 11 / Agent Note 2026-09-19). A pure read, so an Archived Save
   * still answers it: nothing here writes, so nothing about it is stale. */
  getPlayerSearch: {
    payload: Schema.Struct({ saveId: SaveId, query: PlayerSearchQuerySchema }),
    success: PlayerSearchResultsView,
    error: Schema.Union([SaveNotFoundError]),
  },
  /** Transfer Target Comparison (Screen 129): each player named in `playerIds`, read by the human
   * club's Scouting Progress on him exactly as the search and profile do — exact figures for the
   * manager's own squad and Fully Scouted players, Attribute Ranges below that (Agent Note
   * 2026-09-19, ticket 12). `wage`, `contractExpiry` and `injuryStatus` are contract/fitness facts
   * rather than market readings, so they are never ranged. Rows come back in the caller's order; a
   * list naming a player the save does not hold is `PlayerNotFoundError`; an empty list answers
   * with no rows. A pure read, so an Archived Save still answers it. */
  getPlayerComparison: {
    payload: Schema.Struct({ saveId: SaveId, playerIds: Schema.Array(PlayerId) }),
    success: PlayerComparisonView,
    error: Schema.Union([SaveNotFoundError, PlayerNotFoundError]),
  },
} as const;
