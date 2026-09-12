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
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";
import { clubStaffViewState } from "./clubStaffViewState.js";

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

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

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
 * One read answers all three: `getClubStaff` carries whose club it is, so there is no second read
 * whose failure could render an error over staff that loaded perfectly well.
 *
 * Rows are not focusable: the closure of interaction is the entry point that brought the manager
 * here and `g b` that leaves, so reading order is the design.
 */
export const ClubStaffScreen = ({
  saveId,
  clubId,
}: {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
}) => {
  const staffResult = useAtomValue(clubStaffAtom(saveId, clubId));
  const state = clubStaffViewState(staffResult);

  if (state === "error") {
    return <ClubStaffMessage message={messageOf(typedError(staffResult))} />;
  }
  // The `_tag` check narrows for the type checker; `clubStaffViewState` has already decided, so it
  // never changes the branch taken at runtime.
  if (state === "loading" || staffResult._tag !== "Success") {
    return <ClubStaffMessage message="Loading club staff..." />;
  }

  const view = staffResult.value;

  return (
    <main
      id="club-staff-page"
      data-focus-id="clubStaff"
      aria-labelledby="club-staff-heading"
      className={PAGE_CLASS}
      tabIndex={-1}
    >
      <header>
        {/* The club header is the `<main>` region's label, so the first thing read is which club's
            staff this is — and the foreign marker when that club is not the user's. */}
        <h1 id="club-staff-heading" className="text-2xl font-bold">
          {view.club.name} · Club Staff{" "}
          {!view.isUserClub && (
            <span className="text-sm font-semibold text-text-secondary">[Not your club]</span>
          )}
        </h1>
      </header>

      {/* Driven by `STAFF_DEPARTMENTS`, not by the wire's order: the page promises four headings in
          a fixed order, so it renders four whatever order — or shortfall — a view arrives with. A
          department the derivation somehow omitted shows as an empty list rather than vanishing,
          because a missing heading reads as "this club has no medical staff" when what it means is
          "the read is broken". */}
      {STAFF_DEPARTMENTS.map((department) => {
        const members = view.groups.find((group) => group.department === department)?.members ?? [];
        const headingId = `club-staff-${department}`;
        return (
          <section key={department} className="mt-6">
            <h2 id={headingId} className="text-lg font-semibold">
              {DEPARTMENT_LABELS[department]}
            </h2>
            <ul aria-labelledby={headingId} className="mt-1 list-inside">
              {members.map((member) => (
                <li
                  key={`${member.role}-${member.firstName}-${member.lastName}`}
                  aria-label={`${ROLE_TITLES[member.role]} ${member.firstName} ${member.lastName}`}
                >
                  <span className="inline-block w-28 text-text-secondary">
                    {ROLE_TITLES[member.role]}
                  </span>
                  <span>
                    {member.firstName} {member.lastName}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
};

/** The sentence a failed read shows. A defect-only cause carries no typed error, so it falls back
 *  to the generic line; an unknown club or missing save always carries its own sentence. */
const messageOf = (error: RpcClientError<"getClubStaff"> | null): string =>
  error === null ? "Club staff could not be loaded." : describeRpcError(error);

/** The non-`ready` states, on the surface every one of them renders on: a labelled `<main>` region
 *  carrying one line. Labelled rather than heading-labelled because neither state knows the club's
 *  name — that arrives with the view. */
const ClubStaffMessage = ({ message }: { readonly message: string }) => (
  <main
    className={PAGE_CLASS}
    tabIndex={-1}
    data-focus-id="clubStaff"
    aria-label="Club staff"
  >
    <h1 className="text-2xl font-bold">Club Staff</h1>
    <p className="mt-4 text-text-secondary">{message}</p>
  </main>
);
