import type { RouteParamDecode } from "../../../navigation/params.js";
import {
  decodeClubId,
  decodeCompetitionId,
  decodeMatchId,
  decodePlayerId,
  decodePlayerIds,
  decodeSaveId,
} from "../../../navigation/params.js";
import type {
  CareerScreenProps,
  ClubScreenProps,
  CompetitionScreenProps,
  ComparisonScreenProps,
  MatchScreenProps,
  PlayerScreenProps,
  StaffScreenProps,
} from "../types.js";

/**
 * The boundary decode for each career child route surface: the route's own path
 * parameters in, either the screen's prop contract or the reason the address is
 * malformed.
 *
 * `:saveId` is checked first on every surface, so a bad save is reported as a
 * bad save rather than as whichever downstream segment happened to be missing
 * too. Each decoder takes the raw segments by name instead of a parameter
 * record, which keeps the set of parameters a surface depends on visible in its
 * call site rather than implied by a loose lookup.
 *
 * A well-formed id naming nothing in the save is NOT a boundary failure: it is
 * the screen's own typed RPC error (`ClubNotFoundError`, `MatchNotFoundError`,
 * …), rendered by the screen. Only a structurally undecodable segment is an
 * address error.
 */

/** Decode `:saveId` alone — the save-scoped surface, which carries no target. */
export const decodeSaveSurface = (saveId: string): RouteParamDecode<CareerScreenProps> => {
  const save = decodeSaveId(saveId);
  return save._tag === "Malformed" ? save : { _tag: "Success", success: { saveId: save.success } };
};

/** Decode `:saveId` and `:clubId`. */
export const decodeClubSurface = (
  saveId: string,
  clubId: string,
): RouteParamDecode<ClubScreenProps> => {
  const save = decodeSaveId(saveId);
  if (save._tag === "Malformed") return save;
  const club = decodeClubId(clubId);
  return club._tag === "Malformed"
    ? club
    : { _tag: "Success", success: { saveId: save.success, clubId: club.success } };
};

/** Decode `:saveId` and `:clubId`, passing the staff key through as it arrived:
 *  a key naming no one is the RPC's `StaffNotFoundError`, rendered by the
 *  screen, not an address error. */
export const decodeStaffSurface = (
  saveId: string,
  clubId: string,
  staffKey: string,
): RouteParamDecode<StaffScreenProps> => {
  const save = decodeSaveId(saveId);
  if (save._tag === "Malformed") return save;
  const club = decodeClubId(clubId);
  return club._tag === "Malformed"
    ? club
    : { _tag: "Success", success: { saveId: save.success, clubId: club.success, staffKey } };
};

/** Decode `:saveId` and `:playerId`. */
export const decodePlayerSurface = (
  saveId: string,
  playerId: string,
): RouteParamDecode<PlayerScreenProps> => {
  const save = decodeSaveId(saveId);
  if (save._tag === "Malformed") return save;
  const player = decodePlayerId(playerId);
  return player._tag === "Malformed"
    ? player
    : { _tag: "Success", success: { saveId: save.success, playerId: player.success } };
};

/** Decode `:saveId` and `:playerIds` — the comma-joined comparison key, into the
 *  branded list the screen compares. A well-formed list naming players the save
 *  does not have is the RPC's `PlayerNotFoundError`; only an undecodable segment
 *  is an address error. */
export const decodeComparisonSurface = (
  saveId: string,
  playerIds: string,
): RouteParamDecode<ComparisonScreenProps> => {
  const save = decodeSaveId(saveId);
  if (save._tag === "Malformed") return save;
  const players = decodePlayerIds(playerIds);
  return players._tag === "Malformed"
    ? players
    : { _tag: "Success", success: { saveId: save.success, playerIds: players.success } };
};

/** Decode `:saveId` and `:matchId`. */
export const decodeMatchSurface = (
  saveId: string,
  matchId: string,
): RouteParamDecode<MatchScreenProps> => {
  const save = decodeSaveId(saveId);
  if (save._tag === "Malformed") return save;
  const match = decodeMatchId(matchId);
  return match._tag === "Malformed"
    ? match
    : { _tag: "Success", success: { saveId: save.success, matchId: match.success } };
};

/** Decode `:saveId` and `:competitionId`. */
export const decodeCompetitionSurface = (
  saveId: string,
  competitionId: string,
): RouteParamDecode<CompetitionScreenProps> => {
  const save = decodeSaveId(saveId);
  if (save._tag === "Malformed") return save;
  const competition = decodeCompetitionId(competitionId);
  return competition._tag === "Malformed"
    ? competition
    : { _tag: "Success", success: { saveId: save.success, competitionId: competition.success } };
};