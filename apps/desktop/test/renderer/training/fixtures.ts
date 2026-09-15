import { SaveId } from "@cm-clone/contracts";
import {
  FAMILIARITY_TIERS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  type STAFF_DEPARTMENTS,
  STATURE_TIERS,
  type Category,
} from "@cm-clone/shared";

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

/** One player row of the Workload and Recovery wire view (Screen 112). */
export interface WorkloadPlayerWire {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly condition: number;
  readonly lastInjurySeverity: "none" | "light" | "medium" | "severe";
  readonly recovery: "rest" | "active";
}

export interface WorkloadViewWire {
  readonly players: readonly WorkloadPlayerWire[];
}

export const workloadPlayer = (
  id: string,
  firstName: string,
  lastName: string,
  condition: number,
  lastInjurySeverity: WorkloadPlayerWire["lastInjurySeverity"] = "none",
): WorkloadPlayerWire => ({
  id,
  firstName,
  lastName,
  condition,
  lastInjurySeverity,
  // Mirrors main's rule so fixtures stay consistent; the rule itself is tested in main.
  recovery: condition < 75 ? "rest" : "active",
});

/** A squad with one player needing rest after a severe injury and one at full Condition. */
export const mixedWorkloadView = (): WorkloadViewWire => ({
  players: [
    workloadPlayer("p1", "Rui", "Costa", 40, "severe"),
    workloadPlayer("p2", "Ana", "Reis", 100),
  ],
});

/** Answer `getWorkload` with a view, and fail anything else. */
export const respondWithWorkload = (view: WorkloadViewWire): void => {
  mockPreload(async (method) => {
    if (method === "getWorkload") return { _tag: "Success", value: view } as never;
    return {
      _tag: "Failure",
      error: { _tag: "SaveNotFoundError", id: rid("s1") },
    } as never;
  });
};

/** One player row of the `getSquad` wire view, as the Individual Training Plan (Screen 108) reads it. */
export interface SquadPlayerWire {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly age: number;
  readonly attributes: Record<string, number>;
  readonly positions: ReadonlyArray<{ readonly position: string; readonly familiarity: string }>;
  readonly overallRating: number;
  readonly positionRatings: Record<string, number>;
  readonly condition: number;
  readonly trainingFocus: Category | null;
  readonly nationality: string;
  readonly birthplace: string | null;
}

export interface SquadViewWire {
  readonly club: { readonly id: string; readonly name: string; readonly statureTier: string };
  readonly players: readonly SquadPlayerWire[];
}

/** A squad player. `goalkeeper` decides whether goalkeeping Attributes are present at all. */
export const squadPlayer = (
  id: string,
  firstName: string,
  lastName: string,
  trainingFocus: Category | null,
  goalkeeper = false,
): SquadPlayerWire => ({
  id,
  firstName,
  lastName,
  dateOfBirth: "2000-01-01",
  age: 25,
  attributes: {
    ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, 12])),
    ...(goalkeeper ? Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((attribute) => [attribute, 14])) : {}),
    ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((attribute) => [attribute, 10])),
  },
  positions: [{ position: goalkeeper ? "GK" : "DC", familiarity: FAMILIARITY_TIERS[0] }],
  overallRating: 70,
  positionRatings: goalkeeper ? { GK: 70 } : { DC: 70 },
  condition: 100,
  trainingFocus,
  nationality: "Portugal",
  birthplace: null,
});

/** An own-club squad with an outfield player on a Technical focus and a goalkeeper on None. */
export const trainingPlanSquad = (
  players: readonly SquadPlayerWire[] = [
    squadPlayer("p1", "Rui", "Costa", "technical"),
    squadPlayer("p2", "Vitor", "Baia", null, true),
  ],
): SquadViewWire => ({
  club: { id: "me", name: "Test FC", statureTier: STATURE_TIERS[0] },
  players,
});
