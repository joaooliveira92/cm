import type { SaveId } from "@cm-clone/contracts";
import { Atom } from "effect/unstable/reactivity";
import { call } from "./call.js";
import { managementReadPolicy } from "./policy.js";

export const saveKey = (saveId: SaveId): readonly ["save", SaveId] => ["save", saveId];
export const squadKey = (saveId: SaveId): readonly ["squad", SaveId] => ["squad", saveId];
export const transfersKey = (saveId: SaveId): readonly ["transfers", SaveId] => ["transfers", saveId];
export const economyKey = (saveId: SaveId): readonly ["economy", SaveId] => ["economy", saveId];
export const tacticsKey = (saveId: SaveId): readonly ["tactics", SaveId] => ["tactics", saveId];
export const trainingKey = (saveId: SaveId): readonly ["training", SaveId] => ["training", saveId];
export const matchKey = (saveId: SaveId, matchId: string): readonly ["match", SaveId, string] => [
  "match",
  saveId,
  matchId,
];

/** getSquad — `["save", saveId]`, `["squad", saveId]`. */
export const squadAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getSquad", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), squadKey(saveId)]),
    ),
  ),
);

/** getTactics — `["save", saveId]`, `["tactics", saveId]`. */
export const tacticsAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getTactics", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), tacticsKey(saveId)]),
    ),
  ),
);

/** getLeagueTable — `["save", saveId]`. */
export const leagueTableAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getLeagueTable", { saveId })).pipe(Atom.withReactivity([saveKey(saveId)])),
  ),
);

/** getFixtures — `["save", saveId]`. */
export const fixturesAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getFixtures", { saveId })).pipe(Atom.withReactivity([saveKey(saveId)])),
  ),
);

/** getSeasonSummary — `["save", saveId]`. */
export const seasonSummaryAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getSeasonSummary", { saveId })).pipe(Atom.withReactivity([saveKey(saveId)])),
  ),
);

/** getManagerProfileScreen — `["save", saveId]`. */
export const managerProfileAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getManagerProfileScreen", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId)]),
    ),
  ),
);

/** getTransfersScreen — `["save", saveId]`, `["transfers", saveId]`, `["economy", saveId]`. */
export const transfersAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getTransfersScreen", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), transfersKey(saveId), economyKey(saveId)]),
    ),
  ),
);