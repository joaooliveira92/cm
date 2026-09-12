import { Schema } from "effect";

import {
  ClubId,
  ClubNotFoundError,
  ClubNotScoutedError,
  PlayerId,
  PlayerNotFoundError,
  SaveArchivedError,
  SaveId,
  SaveNotFoundError,
  ScoutingView,
  TeamScoutReportView,
  UnknownScoutError,
} from "./schemas/index.js";

/**
 * Scouting's whole RPC surface — the assignment board and the Team Scout Report — kept in its own
 * module and spread into `AppRpcs`.
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
} as const;
