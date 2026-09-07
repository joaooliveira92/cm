import type { ClubId, SaveId } from "@cm-clone/contracts";
import { Atom } from "effect/unstable/reactivity";
import { call } from "./call.js";
import { managementReadPolicy } from "./policy.js";

export const saveKey = (saveId: SaveId): readonly ["save", SaveId] => ["save", saveId];
export const squadKey = (saveId: SaveId): readonly ["squad", SaveId] => ["squad", saveId];
export const transfersKey = (saveId: SaveId): readonly ["transfers", SaveId] => ["transfers", saveId];
export const economyKey = (saveId: SaveId): readonly ["economy", SaveId] => ["economy", saveId];
export const tacticsKey = (saveId: SaveId): readonly ["tactics", SaveId] => ["tactics", saveId];
export const trainingKey = (saveId: SaveId): readonly ["training", SaveId] => ["training", saveId];
export const newsKey = (saveId: SaveId): readonly ["news", SaveId] => ["news", saveId];
export const matchKey = (saveId: SaveId, matchId: string): readonly ["match", SaveId, string] => [
  "match",
  saveId,
  matchId,
];
export const scoutingKey = (saveId: SaveId): readonly ["scouting", SaveId] => ["scouting", saveId];

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

/**
 * getTacticsOverview — `["save", saveId]`, `["tactics", saveId]`.
 *
 * The Tactics Overview's one immutable snapshot read. Reacts to the same domain keys the editor's
 * save invalidates (`tacticsKey`, `saveKey`), so an accepted save elsewhere re-reads the snapshot
 * for this screen. The screen itself decides — by declared revision, never by arrival order —
 * whether a refetched response may replace the one it renders.
 */
export const tacticsOverviewAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getTacticsOverview", { saveId })).pipe(
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
/**
 * getNewsInbox — `["save", saveId]`, `["news", saveId]`.
 *
 * Reactive on the save-wide key as well as its own: every Continue appends to the event streams the
 * inbox projects from, so an advance that invalidates the save must refresh the inbox too.
 */
export const newsInboxAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getNewsInbox", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), newsKey(saveId)]),
    ),
  ),
);

/**
 * loadSave — `["save", saveId]`. The career chrome's save-name read.
 *
 * `loadSave` is a pure read on the main side (it checks the file exists and
 * returns its summary), so using it as a query rather than a command is safe.
 * There is no narrower `getSaveSummary` method, and adding one is engine work
 * this chrome does not need.
 */
export const saveSummaryAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("loadSave", { id: saveId })).pipe(Atom.withReactivity([saveKey(saveId)])),
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

export const teamScoutReportAtom = (saveId: SaveId, clubId: ClubId) =>
  reportsForSave(saveId)(clubId);
