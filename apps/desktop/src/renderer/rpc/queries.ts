import type { ClubId, PlayerId, SaveId } from "@cm-clone/contracts";
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

/**
 * getCoachingAssignments — `["save", saveId]`, `["training", saveId]`.
 *
 * Coaching Assignments (Screen 111): the manager's own club's coaches with quality ratings.
 * Reactive on the save-wide key and the training key (which `setTrainingFocusMutation` and future
 * coach-related mutations will invalidate).
 */
export const coachingAssignmentsAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getCoachingAssignments", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), trainingKey(saveId)]),
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

const playerProfileForSave = Atom.family((saveId: SaveId) =>
  Atom.family((playerId: PlayerId) =>
    managementReadPolicy(
      Atom.make(call("getPlayerProfile", { saveId, playerId })).pipe(
        Atom.withReactivity([saveKey(saveId)]),
      ),
    ),
  ),
);

export const playerProfileAtom = (saveId: SaveId, playerId: PlayerId) =>
  playerProfileForSave(saveId)(playerId);

const playerContractForSave = Atom.family((saveId: SaveId) =>
  Atom.family((playerId: PlayerId) =>
    managementReadPolicy(
      Atom.make(call("getPlayerContract", { saveId, playerId })).pipe(
        Atom.withReactivity([saveKey(saveId)]),
      ),
    ),
  ),
);

export const playerContractAtom = (saveId: SaveId, playerId: PlayerId) =>
  playerContractForSave(saveId)(playerId);
