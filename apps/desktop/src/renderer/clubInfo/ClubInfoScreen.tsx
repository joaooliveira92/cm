/**
 * The Club section's Information destination — the manager's own club, rendered by the screen that
 * already renders any club's.
 *
 * A resolver, not a screen, exactly as `StaffOverviewScreen` is. `ClubInformationScreen` (Screen
 * 34) takes a `clubId` because it is club-scoped under
 * [the club-scoped rule](../../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md);
 * a navbar entry names only a save. Before this existed there were two placeholders for Screen 34 —
 * `clubInfo/` and `clubInformation/` — both carrying `aria-label="Club Information"`, which is the
 * duplication announcing itself.
 *
 * `getSquad` carries the own club, and is the read every own-club surface uses. Keeping one roster
 * of facts and resolving the club here is the difference between one screen and two that drift.
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
import { ClubInformationScreen } from "../clubInformation/ClubInformationScreen.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** A defect-only cause carries no typed error, so it falls back to the generic line. */
const messageOf = (error: RpcClientError<"getSquad"> | null): string =>
  error === null ? "Club information could not be loaded." : describeRpcError(error);

/**
 * The resolver's own two states, and only those. Once the club is known the screen owns every state
 * that follows, including its own loading line — a second spinner here would report on a read that
 * has not started.
 */
const ClubInfoMessage = ({ message }: { readonly message: string }) => (
  <main
    tabIndex={-1}
    data-focus-id="clubInfo"
    aria-label="Club Information"
    className={PAGE_CLASS}
  >
    <h1 className="text-2xl font-bold">Club Information</h1>
    <p className="mt-4 text-text-secondary">{message}</p>
  </main>
);

export const ClubInfoScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const squadResult = useAtomValue(squadAtom(saveId));

  if (squadResult._tag === "Failure") {
    return <ClubInfoMessage message={messageOf(typedError(squadResult))} />;
  }
  if (squadResult._tag !== "Success") {
    return <ClubInfoMessage message="Loading club information..." />;
  }

  return <ClubInformationScreen saveId={saveId} clubId={squadResult.value.club.id} />;
};
