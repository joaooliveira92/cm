/** Club info, staff and board atoms. */
import type { ClubId, SaveId } from "@cm-clone/contracts";
import { Atom } from "effect/unstable/reactivity";
import { call } from "./call.js";
import { saveKey } from "./keys.js";
import { managementReadPolicy } from "./policy.js";

/**
 * getClubInformation — `["save", saveId]`.
 *
 * Club General Information (Screen 34): a club's identity, home town, nation and ground, for any
 * club in the save. Same two-level nested family as the staff read, for the same reason — a
 * `{ saveId, clubId }` object key would miss on `MutableHashMap`'s reference comparison and refetch
 * forever.
 *
 * Reactive on the save-wide key only: every field is fixed at world generation and no command
 * changes any of them, so the read never goes stale between save-level invalidations.
 */
const clubInformationForSave = Atom.family((saveId: SaveId) =>
  Atom.family((clubId: ClubId) =>
    managementReadPolicy(
      Atom.make(call("getClubInformation", { saveId, clubId })).pipe(
        Atom.withReactivity([saveKey(saveId)]),
      ),
    ),
  ),
);

export const clubInformationAtom = (saveId: SaveId, clubId: ClubId) =>
  clubInformationForSave(saveId)(clubId);

/**
 * getClubFixtures — `["save", saveId]`.
 *
 * Club Fixtures (Screen 40): any club's matches this Season. Reactive on the save key alone,
 * matching `fixturesAtom` — a played Matchday changes a result here, and the save-wide
 * invalidation after Continue is what both reads rely on to see it.
 */
const clubFixturesForSave = Atom.family((saveId: SaveId) =>
  Atom.family((clubId: ClubId) =>
    managementReadPolicy(
      Atom.make(call("getClubFixtures", { saveId, clubId })).pipe(
        Atom.withReactivity([saveKey(saveId)]),
      ),
    ),
  ),
);

export const clubFixturesAtom = (saveId: SaveId, clubId: ClubId) =>
  clubFixturesForSave(saveId)(clubId);

/**
 * getClubStaff — `["save", saveId]`.
 *
 * Club Staff (Screen 38): who works at any club in the save, grouped by department. Keyed by save
 * then club, the same two-level nested family as the scout report (a `{ saveId, clubId }` object
 * key would miss on `MutableHashMap`'s reference comparison and refetch forever).
 *
 * Reactive on the save-wide key only: the view is a pure derivation of the world seed and the
 * club's canonical id — no later command changes it — so the read never goes stale between
 * save-level invalidations.
 */
const clubStaffForSave = Atom.family((saveId: SaveId) =>
  Atom.family((clubId: ClubId) =>
    managementReadPolicy(
      Atom.make(call("getClubStaff", { saveId, clubId })).pipe(
        Atom.withReactivity([saveKey(saveId)]),
      ),
    ),
  ),
);

export const clubStaffAtom = (saveId: SaveId, clubId: ClubId) =>
  clubStaffForSave(saveId)(clubId);