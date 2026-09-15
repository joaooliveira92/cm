import { ClubId, SaveId } from "@cm-clone/contracts";
import { STAFF_DEPARTMENTS, STATURE_TIERS, type ClubPersonRole } from "@cm-clone/shared";

/**
 * The Club Staff fixtures, in one place because four spec files were each carrying their own copy
 * and they had already drifted — two of them typed a member's `role` as a bare string, which let a
 * fixture name a role the wire cannot carry without the test noticing.
 *
 * These are the *wire* shapes the preload bridge hands back as JSON, not decoded `ClubStaffView`
 * instances, so they are plain objects. What they are not is untyped: `role` and `department` are
 * the shared unions, so a fixture that drifts from the contract fails the typecheck gate.
 */

type StaffDepartment = (typeof STAFF_DEPARTMENTS)[number];

interface MemberWire {
  readonly role: ClubPersonRole;
  readonly firstName: string;
  readonly lastName: string;
}

interface GroupWire {
  readonly department: StaffDepartment;
  readonly members: readonly MemberWire[];
}

export interface ClubStaffViewWire {
  readonly club: { readonly id: ClubId; readonly name: string; readonly statureTier: string };
  readonly isUserClub: boolean;
  readonly groups: readonly GroupWire[];
}

/** Install a fake preload bridge; `impl` answers one RPC method call. */
export const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>): void => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

export const rid = (id: string): SaveId => SaveId.make(id);
export const cid = (id: string): ClubId => ClubId.make(id);

/** The one role each department heads, in `STAFF_DEPARTMENTS` order. */
const ROLE_OF_DEPARTMENT: Readonly<Record<StaffDepartment, ClubPersonRole>> = {
  executive: "president",
  coaching: "coach",
  recruitment: "scout",
  medical: "physio",
};

export const member = (
  role: ClubPersonRole,
  firstName: string,
  lastName: string,
): MemberWire => ({ role, firstName, lastName });

/**
 * Four groups in the derivation's fixed order, one person each. `isUserClub` defaults to the
 * manager's own club, which is the unmarked case.
 */
export const staffView = (
  options: {
    readonly clubId?: string;
    readonly clubName?: string;
    readonly isUserClub?: boolean;
  } = {},
): ClubStaffViewWire => {
  const { clubId = "club-7", clubName = "Northport Rovers", isUserClub = true } = options;
  return {
    club: { id: cid(clubId), name: clubName, statureTier: STATURE_TIERS[0] },
    isUserClub,
    groups: STAFF_DEPARTMENTS.map((department) => ({
      department,
      members: [member(ROLE_OF_DEPARTMENT[department], "Alan", "Reyes")],
    })),
  };
};

/** The five-person club the rendering specs assert names and roles against. */
export const populatedStaffView = (
  options: { readonly clubId?: string; readonly isUserClub?: boolean } = {},
): ClubStaffViewWire => {
  const { clubId = "club-7", isUserClub = true } = options;
  return {
    club: { id: cid(clubId), name: "Northport Rovers", statureTier: STATURE_TIERS[0] },
    isUserClub,
    groups: [
      { department: "executive", members: [member("president", "Alan", "Reyes")] },
      { department: "coaching", members: [member("coach", "Diane", "Wax")] },
      {
        department: "recruitment",
        members: [member("scout", "Marcus", "Ito"), member("scout", "Elena", "Suarez")],
      },
      { department: "medical", members: [member("physio", "Thomas", "Bayard")] },
    ],
  };
};

/**
 * Answer `getClubStaff` with a view, and fail anything else. A screen that reaches a second method
 * gets a failure rather than a convenient stub, because ticket 03 promised this page renders the
 * three states one read can produce — a test that quietly serves a second read cannot notice a
 * regression against that promise.
 */
export const respondWithStaff = (view: ClubStaffViewWire): void => {
  mockPreload(async (method) => {
    if (method === "getClubStaff") return { _tag: "Success", value: view } as never;
    return {
      _tag: "Failure",
      error: { _tag: "SaveNotFoundError", id: rid("s1") },
    } as never;
  });
};
