import {
  ClubId as ClubIdSchema,
  CompetitionId as CompetitionIdSchema,
  NationId as NationIdSchema,
  PlayerId as PlayerIdSchema,
  SaveId as SaveIdSchema,
  type ClubId,
  type CompetitionId,
  type NationId,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { Schema } from "effect";

/**
 * Route parameters decoded at the boundary. Routes validate *navigation
 * structure* only — they never load domain data. A well-formed `saveId` for a
 * save that does not exist stays a typed RPC failure through the seam; only a
 * parameter that cannot decode to the parameter's schema is a route concern.
 */
export type RouteParamDecode<A> =
  | { readonly _tag: "Success"; readonly success: A }
  | { readonly _tag: "Malformed"; readonly reason: string };

const malformed = (reason: string): RouteParamDecode<never> => ({ _tag: "Malformed", reason });

/** Decode the `:saveId` path parameter into the contract's branded `SaveId`.
 *  The brand adds no runtime check (Schema.String), so the route additionally
 *  rejects the empty string — the one shape a hash can plausibly carry that a
 *  save identity never takes. Missing-save (`SaveNotFoundError`) is a separate
 *  typed RPC failure, deliberately not conflated here (AC-12). */
export const decodeSaveId = (raw: string): RouteParamDecode<SaveId> => {
  if (raw === "") return malformed("saveId parameter is empty");
  try {
    return { _tag: "Success", success: Schema.decodeUnknownSync(SaveIdSchema)(raw) };
  } catch {
    return malformed("saveId parameter is not a string");
  }
};

/** Decode the `:clubId` path parameter into the contract's branded `ClubId`.
 *  Same shape as `decodeSaveId` and for the same reason: the brand is nominal
 *  only, so the empty string is the one structurally-wrong value worth
 *  rejecting here. A well-formed id naming no club in the save is NOT a route
 *  concern — it is the report RPC's `ClubNotFoundError`, rendered by the
 *  screen. Conflating the two would turn a missing club into an "invalid
 *  address" panel, which tells the manager nothing true. */
export const decodeClubId = (raw: string): RouteParamDecode<ClubId> => {
  if (raw === "") return malformed("clubId parameter is empty");
  try {
    return { _tag: "Success", success: Schema.decodeUnknownSync(ClubIdSchema)(raw) };
  } catch {
    return malformed("clubId parameter is not a string");
  }
};

/** Decode the `:playerId` path parameter into the contract's branded `PlayerId`.
 *  Same shape as the other param decoders. */
export const decodePlayerId = (raw: string): RouteParamDecode<PlayerId> => {
  if (raw === "") return malformed("playerId parameter is empty");
  try {
    return { _tag: "Success", success: Schema.decodeUnknownSync(PlayerIdSchema)(raw) };
  } catch {
    return malformed("playerId parameter is not a string");
  }
};

/** Decode the `:nationId` path parameter into the contract's branded `NationId`. */
export const decodeNationId = (raw: string): RouteParamDecode<NationId> => {
  if (raw === "") return malformed("nationId parameter is empty");
  try {
    return { _tag: "Success", success: Schema.decodeUnknownSync(NationIdSchema)(raw) };
  } catch {
    return malformed("nationId parameter is not a string");
  }
};

/** Decode the `:competitionId` path parameter into the contract's branded `CompetitionId`. */
export const decodeCompetitionId = (raw: string): RouteParamDecode<CompetitionId> => {
  if (raw === "") return malformed("competitionId parameter is empty");
  try {
    return { _tag: "Success", success: Schema.decodeUnknownSync(CompetitionIdSchema)(raw) };
  } catch {
    return malformed("competitionId parameter is not a string");
  }
};
