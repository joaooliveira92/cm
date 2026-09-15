import type { ClubId, SaveId, ScoutingTargetView, TeamScoutReportView } from "@cm-clone/contracts";
import { useState } from "react";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import {
  assignScoutToClubMutation,
  describeRpcError,
  scoutingAtom,
  typedError,
  useAtomSet,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";

/** Freshness past which the report offers to be renewed. `current` and `recent` readings are still
 *  worth acting on; from `aging` on, the squad has moved far enough that a new reading is the point. */
const NEEDS_RENEWAL = new Set<TeamScoutReportView["freshness"]>(["aging", "stale"]);

/** What a scout is doing, in one line, so the choice of whom to redirect is made knowingly. */
const statusOf = (scout: ScoutingTargetView): string => {
  if (scout.targetClubName !== null) return `Watching ${scout.targetClubName}`;
  if (scout.playerName !== null) return `Watching ${scout.playerName}`;
  return "Free";
};

/** The reading an assignment is issued from: a delivered report, or the not-scouted answer, which
 *  carries the id a reading taken now would have and no freshness because nothing was observed. */
export interface ReadingRef {
  readonly targetClubId: ClubId;
  readonly reportId: string;
  readonly freshness: TeamScoutReportView["freshness"] | null;
}

/**
 * The Team Scout Report's Assign Scout tab (ticket 07): point one of the club's scouts at the target
 * club, send one to a club nobody has watched, or renew a decayed report by doing so.
 *
 * Every scout is listed, not only the free ones, because redirecting a busy scout is a legitimate
 * move and the manager should see what they would be taking the scout away from. The command
 * carries the report reading it was issued from, so a reading the calendar has since moved past is
 * refused rather than acted on; the refusal is shown as the RPC's own sentence.
 *
 * The screen needs no reload afterwards: the mutation invalidates the scouting key, which both the
 * board and the report read, so the new watcher appears in the report's header on its own.
 */
export const AssignScoutPanel = ({
  saveId,
  report,
  readOnly,
}: {
  readonly saveId: SaveId;
  readonly report: ReadingRef;
  readonly readOnly: boolean;
}) => {
  const board = useAtomValue(scoutingAtom(saveId));
  const assign = useAtomSet(assignScoutToClubMutation, { mode: "promise" });
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (readOnly) {
    return (
      <p className="text-sm text-text-secondary">
        This career has ended, so no scout can be assigned.
      </p>
    );
  }

  const boardError = typedError(board);
  if (boardError !== null || board._tag === "Failure") {
    return (
      <p className="text-sm text-text-danger">
        {boardError === null ? "The scouting board could not be loaded." : describeRpcError(boardError)}
      </p>
    );
  }
  if (board._tag === "Initial") {
    return <p className="text-sm text-text-secondary">Loading your scouts...</p>;
  }

  const unscouted = report.freshness === null;
  const renewal = report.freshness !== null && NEEDS_RENEWAL.has(report.freshness);
  const onAssign = async (scoutId: string) => {
    setPending(scoutId);
    setFailure(null);
    try {
      await assign({
        saveId,
        scoutId,
        clubId: report.targetClubId,
        expectedReportId: report.reportId,
      });
    } catch (error) {
      const typed = error as RpcClientError<"assignScoutToClub"> | undefined;
      setFailure(typed?._tag === undefined ? "The scout could not be assigned." : describeRpcError(typed));
    } finally {
      setPending(null);
    }
  };

  return (
    <section aria-labelledby="assign-scout-heading">
      <h2 id="assign-scout-heading" className="text-lg font-semibold">
        {unscouted ? "Send a scout" : renewal ? "Renew this report" : "Assign a scout"}
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        {renewal
          ? "This reading has fallen behind the club. A scout watching it keeps the report current."
          : "A scout on a club watches its whole squad, and still counts as one scout."}
      </p>

      {failure !== null && (
        <p role="alert" className="mt-2 text-sm text-text-danger">
          {failure}
        </p>
      )}

      <ul className="mt-3 text-sm">
        {board.value.scouts.map((scout) => {
          const watchingThis = scout.targetClubId === report.targetClubId;
          return (
            <li key={scout.scoutId} className="flex flex-wrap items-center gap-3 py-1">
              <span className="w-40 font-medium">{scout.scoutName}</span>
              <span className="w-56 text-text-secondary">{statusOf(scout)}</span>
              {watchingThis ? (
                <span className="text-text-secondary">Watching this club</span>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={FOCUS_RING.join(" ")}
                  disabled={pending !== null}
                  aria-label={`${renewal ? "Renew with" : "Assign"} ${scout.scoutName}`}
                  onClick={() => onAssign(scout.scoutId)}
                >
                  {pending === scout.scoutId ? "Assigning…" : renewal ? "Renew" : "Assign"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
