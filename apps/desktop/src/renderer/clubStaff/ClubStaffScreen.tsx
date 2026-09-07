import { type ClubId, type SaveId } from "@cm-clone/contracts";
import {
  STAFF_DEPARTMENTS,
  type ClubPersonRole,
  type StaffDepartment,
} from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";
import {
  clubStaffAtom,
  describeRpcError,
  squadAtom,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";
import { clubStaffViewState, isOwnClub } from "./clubStaffViewState.js";

/** The department heading the wire's `department` key becomes, in the one place a reader sees it. */
const DEPARTMENT_LABELS: Readonly<Record<StaffDepartment, string>> = {
  executive: "Executive",
  coaching: "Coaching",
  recruitment: "Recruitment",
  medical: "Medical",
};

/** The title each row shows beside the person's name, so no reader infers the role from the
 *  heading — the role is on the row that carries the person. */
const ROLE_TITLES: Readonly<Record<ClubPersonRole, string>> = {
  president: "President",
  coach: "Coach",
  scout: "Scout",
  physio: "Physio",
};

/** A club's named people, in the department order the page promises (Executive → Coaching →
 *  Recruitment → Medical), whatever order the wire happens to carry them in. A group the wire
 *  omits is skipped, not rendered out of order. */
const groupsByDepartment = <G extends { readonly department: StaffDepartment }>(
  groups: readonly G[],
): readonly G[] =>
  STAFF_DEPARTMENTS.flatMap((department) => {
    const group = groups.find((candidate) => candidate.department === department);
    return group === undefined ? [] : [group];
  });

/**
 * Club Staff (Screen 38): who works at any club in the save, grouped by department. Reached from
 * a surface that already names a club (a league-table row) — it is a drill-down, not a top-level
 * career screen, which is why it needs a `clubId` prop and no `g` binding.
 *
 * The page is a terminal, links-nowhere list in exactly three states:
 *
 * - `loading` — the read is in flight.
 * - `ready` — the four department groups under a club header that names the club and marks one
 *   that is not the user's.
 * - `error` — the RPC's own answer (an unknown club is `ClubNotFoundError`, never a redirect).
 *
 * Rows are not focusable: the closure of interaction is the entry point that brought the manager
 * here and `g b` that leaves, so keyboard arrival lands on the club header — the `<main>` region's
 * label — and reading order is the design.
 */
export const ClubStaffScreen = ({
  saveId,
  clubId,
}: {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
}) => {
  const staffResult = useAtomValue(clubStaffAtom(saveId, clubId));
  const squadResult = useAtomValue(squadAtom(saveId));

  const state = clubStaffViewState({ staff: staffResult, squad: squadResult });
  if (state === "error") {
    // `error` means at least one of the two reads failed. The club read's typed failure is the
    // primary message; a defect-only cause (typedError null) falls back to the generic line.
    const error = typedError(staffResult) ?? typedError(squadResult);
    return <ClubStaffError error={error} />;
  }
  if (state === "loading") {
    return (
      <main
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
        tabIndex={-1}
        aria-label="Club staff"
      >
        <p className="text-text-secondary">Loading club staff...</p>
      </main>
    );
  }

  // `ready` is only reached when `staff` is a Success (see `clubStaffViewState`), so the value
  // is in hand here; the discriminant is asserted for the type checker rather than re-branched.
  const view = (staffResult as Extract<typeof staffResult, { readonly _tag: "Success" }>).value;
  const own = isOwnClub(view, squadResult);
  const groups = groupsByDepartment(view.groups);

  return (
    <main
      id="club-staff-page"
      aria-labelledby="club-staff-heading"
      className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      tabIndex={-1}
    >
      <header>
        {/* The club header is the `<main>` region's label, so the first thing read is which club's
            staff this is — and the foreign marker when that club is not the user's. */}
        <h1 id="club-staff-heading" className="text-2xl font-bold">
          {view.club.name} · Club Staff{" "}
          {!own && <span className="text-sm font-semibold text-text-secondary">[Not your club]</span>}
        </h1>
      </header>

      {groups.map((group, groupIndex) => (
        <section
          key={group.department}
          aria-labelledby={`club-staff-${group.department}`}
          className="mt-6"
        >
          <h2 id={`club-staff-${group.department}`} className="text-lg font-semibold">
            {DEPARTMENT_LABELS[group.department]}
          </h2>
          <ul className="mt-1 list-inside">
            {group.members.map((member, memberIndex) => (
              <li
                key={`${groupIndex}-${memberIndex}`}
                aria-label={`${ROLE_TITLES[member.role]} ${member.firstName} ${member.lastName}`}
              >
                <span className="inline-block w-28 text-text-secondary">{ROLE_TITLES[member.role]}</span>
                <span>{member.firstName} {member.lastName}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
};

/** The error state, on the same surface every blocking failure renders on: a `<main>` region
 *  carrying the failure message. `error` is null only for a defect-only (untagged) failure, which
 *  renders the generic line — an unknown club or missing save always carries its typed sentence. */
const ClubStaffError = ({
  error,
}: {
  readonly error: RpcClientError<"getClubStaff"> | RpcClientError<"getSquad"> | null;
}) => (
  <main
    className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    tabIndex={-1}
    aria-label="Club staff"
  >
    <h1 className="text-2xl font-bold">Club Staff</h1>
    <p className="mt-4 text-text-secondary">
      {error === null ? "Club staff could not be loaded." : describeRpcError(error)}
    </p>
  </main>
);