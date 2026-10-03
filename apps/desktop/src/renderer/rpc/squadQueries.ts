/** Squad and player atoms. */
import type { ClubId, PlayerId, SaveId } from "@cm-clone/contracts";
import { Atom } from "effect/unstable/reactivity";
import { call } from "./call.js";
import { saveKey, squadKey, contractExpiryKey } from "./keys.js";
import { managementReadPolicy } from "./policy.js";

/** getSquad — `["save", saveId]`, `["squad", saveId]`. */
export const squadAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getSquad", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), squadKey(saveId)]),
    ),
  ),
);

/**
 * getClubSquad — `["save", saveId]`, `["squad", saveId]`.
 *
 * Club Squad (Screen 35): any club's squad, its Players read by the human club's Scouting
 * Progress. Same two-level nested family as the staff read, for the same reason — a
 * `{ saveId, clubId }` object key would miss on `MutableHashMap`'s reference comparison and
 * refetch forever.
 *
 * Reactive on the squad key beside the save key, matching `squadAtom`: a completed transfer moves
 * a player in or out of a squad, so the `completeTransfer` mutation's squad invalidation must
 * reach this read too.
 */
const clubSquadForSave = Atom.family((saveId: SaveId) =>
  Atom.family((clubId: ClubId) =>
    managementReadPolicy(
      Atom.make(call("getClubSquad", { saveId, clubId })).pipe(
        Atom.withReactivity([saveKey(saveId), squadKey(saveId)]),
      ),
    ),
  ),
);

export const clubSquadAtom = (saveId: SaveId, clubId: ClubId) => clubSquadForSave(saveId)(clubId);

/**
 * getPlayerProfile — `["save", saveId]`, `["squad", saveId]`.
 *
 * Reactive on the squad key as well as the save-wide one: a contract renewal rewrites the wage and
 * length the profile's contract-expiry line and the navbar band read, so the read must follow it.
 */
const playerProfileForSave = Atom.family((saveId: SaveId) =>
  Atom.family((playerId: PlayerId) =>
    managementReadPolicy(
      Atom.make(call("getPlayerProfile", { saveId, playerId })).pipe(
        Atom.withReactivity([saveKey(saveId), squadKey(saveId)]),
      ),
    ),
  ),
);

export const playerProfileAtom = (saveId: SaveId, playerId: PlayerId) =>
  playerProfileForSave(saveId)(playerId);

/**
 * getPlayerContract — `["save", saveId]`, `["squad", saveId]`.
 *
 * Reactive on the squad key as well as the save-wide one: `renewContract` invalidates the squad key
 * (the renewal rewrites one own-club contract), which is what makes the Player Contract screen's
 * shown contract refresh to its new length and wage after a successful renewal.
 */
const playerContractForSave = Atom.family((saveId: SaveId) =>
  Atom.family((playerId: PlayerId) =>
    managementReadPolicy(
      Atom.make(call("getPlayerContract", { saveId, playerId })).pipe(
        Atom.withReactivity([saveKey(saveId), squadKey(saveId)]),
      ),
    ),
  ),
);

export const playerContractAtom = (saveId: SaveId, playerId: PlayerId) =>
  playerContractForSave(saveId)(playerId);

/** Contract Expiry (Screen 141, without Bosman): the manager's own-club Players in their last
 *  contracted year, and the squad size beside them. Reactive on the squad key as well as the
 *  save-wide one: `renewContract` invalidates the squad key, and a renewed player leaves this list,
 *  which is what clears the short-squad Continue advisory the career chrome derives from it. */
export const contractExpiryAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getContractExpiryScreen", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), squadKey(saveId), contractExpiryKey(saveId)]),
    ),
  ),
);

/**
 * getPlayerDevelopmentHistory — `["save", saveId]`, `["squad", saveId]`.
 *
 * Performance Report (Screen 113): one own-club player's recorded Attribute changes per concluded
 * Season. Reactive on the squad key too, because the Season conclusion that appends a
 * `PlayerDeveloped` event is the same write that changes the squad's Attributes.
 */
const playerDevelopmentHistoryForSave = Atom.family((saveId: SaveId) =>
  Atom.family((playerId: PlayerId) =>
    managementReadPolicy(
      Atom.make(call("getPlayerDevelopmentHistory", { saveId, playerId })).pipe(
        Atom.withReactivity([saveKey(saveId), squadKey(saveId)]),
      ),
    ),
  ),
);

export const playerDevelopmentHistoryAtom = (saveId: SaveId, playerId: PlayerId) =>
  playerDevelopmentHistoryForSave(saveId)(playerId);

/**
 * getSquadDevelopment — `["save", saveId]`, `["squad", saveId]`.
 *
 * Player Development Centre (Screen 114): every own-club player's Training Focus and newest recorded
 * Season of Player Development. Reactive on the squad key, like `playerDevelopmentHistoryAtom`: the
 * Season conclusion that records development and a Training Focus change both invalidate it.
 */
export const squadDevelopmentAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getSquadDevelopment", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), squadKey(saveId)]),
    ),
  ),
);

/**
 * getWorkload — `["save", saveId]`, `["squad", saveId]`.
 *
 * Workload and Recovery (Screen 112): every own-club player's Condition and last injury Severity
 * from the fitness ledger. Reactive on the same keys as `squadAtom`, because the ledger it reads is
 * the one the squad read carries Condition from.
 */
export const workloadAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getWorkload", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), squadKey(saveId)]),
    ),
  ),
);

/**
 * getStaffProfile — `["save", saveId]`, `["squad", saveId]`.
 *
 * Staff Profile: one person in any club's backroom. Keyed save → club → staff key, the same nested
 * family shape as the staff list. The profile itself is a pure derivation, but a coach's rankings
 * read the squad's Condition, so the read also follows the squad key.
 */
const staffProfileForSave = Atom.family((saveId: SaveId) =>
  Atom.family((clubId: ClubId) =>
    Atom.family((key: string) =>
      managementReadPolicy(
        Atom.make(call("getStaffProfile", { saveId, clubId, key })).pipe(
          Atom.withReactivity([saveKey(saveId), squadKey(saveId)]),
        ),
      ),
    ),
  ),
);

export const staffProfileAtom = (saveId: SaveId, clubId: ClubId, key: string) =>
  staffProfileForSave(saveId)(clubId)(key);