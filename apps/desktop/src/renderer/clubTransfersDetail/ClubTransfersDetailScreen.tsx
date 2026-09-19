/**
 * Club Transfers (Screen 42): any club's completed transfers, newest first.
 *
 * The club-scoped sibling of `TransferHistoryScreen`, which is the manager's own. Both render
 * `TransferEntriesTable` — one table implementation, two ways in — per
 * [the club-scoped rule](../../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md).
 *
 * A club with no completed transfer is an ordinary empty state: a fresh career has played no
 * Transfer Window. An unknown club fails, so the two cannot be confused.
 */
import { type ClubId, type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";
import {
  clubTransfersAtom,
  describeRpcError,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";
import { TransferEntriesTable } from "../transferHistory/TransferEntriesTable.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** A defect-only cause carries no typed error, so it falls back to the generic line. */
const messageOf = (error: RpcClientError<"getClubTransfers"> | null): string =>
  error === null ? "Club transfers could not be loaded." : describeRpcError(error);

const ClubTransfersMessage = ({ message }: { readonly message: string }) => (
  <main tabIndex={-1} data-focus-id="clubTransfersDetail" aria-label="Club Transfers" className={PAGE_CLASS}>
    <h1 className="text-2xl font-bold">Club Transfers</h1>
    <p className="mt-4 text-text-secondary">{message}</p>
  </main>
);

export const ClubTransfersDetailScreen = ({
  saveId,
  clubId,
}: {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
}) => {
  const result = useAtomValue(clubTransfersAtom(saveId, clubId));

  if (result._tag === "Failure") return <ClubTransfersMessage message={messageOf(typedError(result))} />;
  if (result._tag !== "Success") return <ClubTransfersMessage message="Loading club transfers..." />;

  const view = result.value;

  return (
    <main tabIndex={-1} data-focus-id="clubTransfersDetail" aria-label="Club Transfers" className={PAGE_CLASS}>
      <h1 className="text-2xl font-bold">{view.club.name}</h1>
      {view.isUserClub ? null : <p className="mt-1 text-sm text-text-secondary">[Not your club]</p>}
      <p className="mt-1 text-sm text-text-secondary">
        Every completed transfer into or out of this club, newest first.
      </p>

      {view.entries.length === 0 ? (
        <p className="mt-8 text-text-secondary italic">This club has completed no transfer yet.</p>
      ) : (
        <div className="mt-8">
          <TransferEntriesTable entries={view.entries} label="Club Transfers" />
        </div>
      )}
    </main>
  );
};
