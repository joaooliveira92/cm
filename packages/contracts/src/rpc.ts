import { Schema } from "effect";
import {
  AdvanceCalendarResult,
  ClubNotFoundError,
  ClubSummary,
  FixturesView,
  InvalidTacticError,
  LeagueTableView,
  MatchNotFoundError,
  MatchSummary,
  ResumeSimulationView,
  SaveNotFoundError,
  SaveSummary,
  SeasonCompleteError,
  SquadView,
  Tactic,
  TacticsScreenView,
} from "./schemas.js";

/**
 * Hand-rolled stand-in for `@effect/rpc`'s RpcGroup: as of this writing
 * `@effect/rpc@latest` (0.76.2) peer-depends on `effect@^3.22.1` and has no
 * `rc`/`beta` release compatible with `effect@4.0.0-rc.x`. Every other
 * package in this monorepo is pinned to the v4 `rc` line, so this module
 * covers the same ground (schema-validated, typed methods over one
 * transport) without depending on a package that doesn't support v4 yet.
 * Swap this for `@effect/rpc`'s `RpcGroup` once it ships a v4-compatible
 * release.
 */
export const AppRpcs = {
  ping: {
    payload: Schema.Void,
    success: Schema.String,
    error: Schema.Never,
  },
  listSaves: {
    payload: Schema.Void,
    success: Schema.Array(SaveSummary),
    error: Schema.Never,
  },
  createSave: {
    payload: Schema.Struct({ name: Schema.String }),
    success: SaveSummary,
    error: Schema.Never,
  },
  loadSave: {
    payload: Schema.Struct({ id: Schema.String }),
    success: SaveSummary,
    error: SaveNotFoundError,
  },
  getSquad: {
    payload: Schema.Struct({ saveId: Schema.String }),
    success: SquadView,
    error: SaveNotFoundError,
  },
  getTactics: {
    payload: Schema.Struct({ saveId: Schema.String }),
    success: TacticsScreenView,
    error: SaveNotFoundError,
  },
  changeTactics: {
    payload: Schema.Struct({ saveId: Schema.String, tactic: Tactic }),
    success: TacticsScreenView,
    error: Schema.Union([SaveNotFoundError, InvalidTacticError]),
  },
  getLeagueTable: {
    payload: Schema.Struct({ saveId: Schema.String }),
    success: LeagueTableView,
    error: SaveNotFoundError,
  },
  getFixtures: {
    payload: Schema.Struct({ saveId: Schema.String }),
    success: FixturesView,
    error: SaveNotFoundError,
  },
  advanceCalendar: {
    payload: Schema.Struct({ saveId: Schema.String }),
    success: AdvanceCalendarResult,
    error: Schema.Union([SaveNotFoundError, SeasonCompleteError]),
  },
  listOpponentClubs: {
    payload: Schema.Struct({ saveId: Schema.String }),
    success: Schema.Array(ClubSummary),
    error: SaveNotFoundError,
  },
  startMatch: {
    payload: Schema.Struct({ saveId: Schema.String, opponentClubId: Schema.String }),
    success: MatchSummary,
    error: Schema.Union([SaveNotFoundError, ClubNotFoundError]),
  },
  resumeSimulation: {
    payload: Schema.Struct({ saveId: Schema.String, matchId: Schema.String, cursor: Schema.Number }),
    success: ResumeSimulationView,
    error: Schema.Union([SaveNotFoundError, MatchNotFoundError]),
  },
} as const;

export type AppRpcMethod = keyof typeof AppRpcs;

export type RpcPayload<M extends AppRpcMethod> = Schema.Schema.Type<
  (typeof AppRpcs)[M]["payload"]
>;
export type RpcSuccess<M extends AppRpcMethod> = Schema.Schema.Type<
  (typeof AppRpcs)[M]["success"]
>;
export type RpcFailure<M extends AppRpcMethod> = Schema.Schema.Type<
  (typeof AppRpcs)[M]["error"]
>;

export const RPC_CHANNEL = "cm-clone:rpc";

export interface RpcEnvelope<M extends AppRpcMethod = AppRpcMethod> {
  readonly method: M;
  readonly payload: unknown;
}

export type RpcResult<M extends AppRpcMethod> =
  | { readonly _tag: "Success"; readonly value: RpcSuccess<M> }
  | { readonly _tag: "Failure"; readonly error: unknown };
