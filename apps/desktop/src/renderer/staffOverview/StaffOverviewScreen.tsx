/**
 * The Club section's Staff destination — the manager's own club, rendered by the screen that
 * already renders any club's.
 *
 * This is a resolver, not a screen. `ClubStaffScreen` (Screen 38) is the roster, and it takes a
 * `clubId` because it is a drill-down reached from a surface that already names a club — a league
 * table row. A navbar entry names no club, only a save, which is why `destinations.ts` excludes
 * club-scoped drill-downs from save-scoped nav and why this entry pointed at a placeholder for as
 * long as it did (group-d ticket 10, group-c ticket 02).
 *
 * So the only thing missing was the own club's id. `getSquad` already carries it — it is the read
 * every own-club surface uses — and asking for it here keeps one roster implementation instead of
 * growing a second that happens to default to "mine".
 */
import { type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";
import {
  describeRpcError,
  squadAtom,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";
import { ClubStaffScreen } from "../clubStaff/ClubStaffScreen.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/**
 * The resolver's own two states, and only those. Once the club is known the roster owns every
 * state that follows, including its own loading line — a second spinner here would report on a
 * read that has not started.
 */
const StaffOverviewMessage = ({ message }: { readonly message: string }) => (
  <main
    tabIndex={-1}
    data-focus-id="staffOverview"
    aria-label="Staff"
    className={PAGE_CLASS}
  >
    <h1 className="text-2xl font-bold">Staff</h1>
    <p className="mt-4 text-text-secondary">{message}</p>
  </main>
);

/** A defect-only cause carries no typed error, so it falls back to the generic line — the same
 *  shape `ClubStaffScreen` uses for its own read. */
const messageOf = (error: RpcClientError<"getSquad"> | null): string =>
  error === null ? "Club staff could not be loaded." : describeRpcError(error);

export const StaffOverviewScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const squadResult = useAtomValue(squadAtom(saveId));

  if (squadResult._tag === "Failure") {
    return <StaffOverviewMessage message={messageOf(typedError(squadResult))} />;
  }

  if (squadResult._tag !== "Success") {
    return <StaffOverviewMessage message="Loading club staff..." />;
  }

  return <ClubStaffScreen saveId={saveId} clubId={squadResult.value.club.id} />;
};
