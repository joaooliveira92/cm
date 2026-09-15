import { SaveId } from "@cm-clone/contracts";
import { STAFF_DEPARTMENTS } from "@cm-clone/shared";

/**
 * Training / Coaching Assignments fixtures.
 *
 * These are the *wire* shapes the preload bridge hands back as JSON, not decoded
 * `CoachingAssignmentsView` instances, so they are plain objects. `department` is the shared
 * `StaffDepartment` union, so a fixture that drifts from the contract fails the typecheck gate.
 */

type StaffDepartment = (typeof STAFF_DEPARTMENTS)[number];

interface CoachAssignmentWire {
  readonly id: string;
  readonly name: string;
  readonly quality: number;
  readonly department: StaffDepartment;
}

export interface CoachingAssignmentsViewWire {
  readonly coaches: readonly CoachAssignmentWire[];
}

/** Install a fake preload bridge; `impl` answers one RPC method call. */
export const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>): void => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

export const rid = (id: string): SaveId => SaveId.make(id);

export const coach = (
  id: string,
  name: string,
  quality: number,
  department: StaffDepartment = "coaching",
): CoachAssignmentWire => ({ id, name, quality, department });

/** A Coaching Assignments view with one coach. */
export const singleCoachView = (): CoachingAssignmentsViewWire => ({
  coaches: [coach("c1", "Diane Wax", 14)],
});

/** A Coaching Assignments view with two coaches. */
export const twoCoachView = (): CoachingAssignmentsViewWire => ({
  coaches: [
    coach("c1", "Diane Wax", 14),
    coach("c2", "Marcus Ito", 9),
  ],
});

/** An empty coaching assignments view (no staff materialised yet). */
export const emptyCoachView = (): CoachingAssignmentsViewWire => ({
  coaches: [],
});

/**
 * Answer `getCoachingAssignments` with a view, and fail anything else.
 */
export const respondWithCoaching = (view: CoachingAssignmentsViewWire): void => {
  mockPreload(async (method) => {
    if (method === "getCoachingAssignments") return { _tag: "Success", value: view } as never;
    return {
      _tag: "Failure",
      error: { _tag: "SaveNotFoundError", id: rid("s1") },
    } as never;
  });
};