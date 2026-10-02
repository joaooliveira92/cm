/** General atom queries: the simpler single-key reads. */
import type { SaveId } from "@cm-clone/contracts";
import { Atom } from "effect/unstable/reactivity";
import { call } from "./call.js";
import { saveKey, newsKey, tacticsKey } from "./keys.js";
import { managementReadPolicy } from "./policy.js";

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

/** getManagerProfileScreen — `["save", saveId]`. */
export const managerProfileAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getManagerProfileScreen", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId)]),
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
 * getBoardConfidence — `["save", saveId]`.
 *
 * Supporter and Board Confidence (Screen 47), board half. Save-scoped, because a rival club has no
 * Board Objective at all — see the club-scoped rule's one exception.
 */
export const boardConfidenceAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getBoardConfidence", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId)]),
    ),
  ),
);