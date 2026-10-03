/** Training-related atoms. */
import type { SaveId } from "@cm-clone/contracts";
import { Atom } from "effect/unstable/reactivity";
import { call } from "./call.js";
import { saveKey, trainingKey } from "./keys.js";
import { managementReadPolicy } from "./policy.js";

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
 * getTrainingSchedule — `["save", saveId]`, `["training", saveId]`. The save key too, because an
 * advance moves the next Fixture the schedule plans for.
 */
export const trainingScheduleAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getTrainingSchedule", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), trainingKey(saveId)]),
    ),
  ),
);