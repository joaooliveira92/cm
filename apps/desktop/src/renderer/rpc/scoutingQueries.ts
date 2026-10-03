/** Scouting atoms. */
import type { ClubId, SaveId } from "@cm-clone/contracts";
import { Atom } from "effect/unstable/reactivity";
import { call } from "./call.js";
import { saveKey, scoutingKey } from "./keys.js";
import { managementReadPolicy } from "./policy.js";

/**
 * getScouting — `["save", saveId]`, `["scouting", saveId]`.
 *
 * The scouting board: every scout at the human's club and what each is watching. Reactive on
 * scouting's own key, which an assignment invalidates, and on the save-wide key an advance does.
 */
export const scoutingAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getScouting", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), scoutingKey(saveId)]),
    ),
  ),
);

/**
 * getScoutingKnowledge — `["save", saveId]`, `["scouting", saveId]`.
 *
 * Scouting Knowledge (Screen 126): the Clubs and Players the club has scouted. Progress only moves on
 * an advance, which invalidates the save-wide key; the scouting key is listed too so an assignment
 * change refreshes it alongside the board.
 */
export const scoutingKnowledgeAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getScoutingKnowledge", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), scoutingKey(saveId)]),
    ),
  ),
);

/**
 * getTeamScoutReport — `["save", saveId]`, `["scouting", saveId]`.
 *
 * The first query keyed by more than the save, so it is two nested families rather than one taking
 * a pair. `Atom.family` memoises through `MutableHashMap`, which compares plain objects by
 * reference: a `{ saveId, clubId }` key would miss on every render and mint a fresh atom each
 * time, refetching forever. Strings hash structurally, so each level keys on one.
 *
 * Reactive on the save-wide key as well as scouting's own: an advance moves every assigned scout's
 * progress, which is exactly what the report reads.
 */
const reportsForSave = Atom.family((saveId: SaveId) =>
  Atom.family((clubId: ClubId) =>
    managementReadPolicy(
      Atom.make(call("getTeamScoutReport", { saveId, clubId })).pipe(
        Atom.withReactivity([saveKey(saveId), scoutingKey(saveId)]),
      ),
    ),
  ),
);

/**
 * getTeamScoutReadings — `["save", saveId]`, `["scouting", saveId]`.
 *
 * Previous Reports. Readings are filed by the scouting commands, which invalidate the scouting key,
 * so the list refreshes the moment a watch ends. Nested families for the same reason as the report.
 */
const readingsForSave = Atom.family((saveId: SaveId) =>
  Atom.family((clubId: ClubId) =>
    managementReadPolicy(
      Atom.make(call("getTeamScoutReadings", { saveId, clubId })).pipe(
        Atom.withReactivity([saveKey(saveId), scoutingKey(saveId)]),
      ),
    ),
  ),
);

export const teamScoutReadingsAtom = (saveId: SaveId, clubId: ClubId) =>
  readingsForSave(saveId)(clubId);

export const teamScoutReportAtom = (saveId: SaveId, clubId: ClubId) =>
  reportsForSave(saveId)(clubId);