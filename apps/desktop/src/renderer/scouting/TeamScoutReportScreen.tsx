import type { ClubId, SaveId } from "@cm-clone/contracts";
import { describeRpcError, teamScoutReportAtom, typedError, useAtomValue } from "../rpc.js";
import { FOCUS_RING } from "../focus.js";

/**
 * Team Scout Report (Screen 49) — what this club's scouts have learned about another.
 *
 * A drill-down: it is only reachable with a target club in hand, from a surface that already names
 * one. That is why it takes `clubId` as a prop rather than reading a selection from anywhere — the
 * route is the only thing that decides which club is being read.
 *
 * This first pass renders the header and the report's own not-yet-known states. Ticket 06 grows the
 * findings, key players, tab shell, and the fixture action onto it.
 */
export const TeamScoutReportScreen = ({
  saveId,
  clubId,
}: {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
}) => {
  const result = useAtomValue(teamScoutReportAtom(saveId, clubId));
  const error = typedError(result);

  // The RPC's own failures come first and are rendered as prose, not as a broken screen: a club
  // that does not exist and a club nobody has scouted are both ordinary answers to a fair question,
  // and neither is an error the manager did anything to cause.
  if (error) {
    return (
      <main
        tabIndex={-1}
        data-focus-id="teamScoutReport"
        aria-label="Team Scout Report"
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <h1 className="text-2xl font-bold">Team Scout Report</h1>
        <p className="mt-4 text-text-secondary">{describeRpcError(error)}</p>
      </main>
    );
  }
  if (result._tag === "Initial") {
    return (
      <main
        tabIndex={-1}
        data-focus-id="teamScoutReport"
        aria-label="Team Scout Report"
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <p className="p-8 text-text-secondary">Loading scout report...</p>
      </main>
    );
  }
  if (result._tag === "Failure") {
    return (
      <main
        tabIndex={-1}
        data-focus-id="teamScoutReport"
        aria-label="Team Scout Report"
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <p className="p-8 text-text-danger">Failed to load the scout report</p>
      </main>
    );
  }

  const report = result.value;

  return (
    <main
      tabIndex={-1}
      data-focus-id="teamScoutReport"
      aria-label="Team Scout Report"
      className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="text-2xl font-bold">{report.targetClubName}</h1>
      <p className="text-sm text-text-secondary">Team Scout Report</p>

      {result.waiting && <p className="mt-2 text-sm text-text-muted">Refreshing…</p>}

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-text-secondary">Scout</dt>
        {/* Null until a scout can be pointed at a Club rather than a Player. Named plainly rather
            than left blank: a missing byline is information, not an omission to hide. */}
        <dd>{report.scout === null ? "Compiled from player scouting" : report.scout.scoutName}</dd>

        <dt className="text-text-secondary">Updated</dt>
        <dd>{report.observedAt}</dd>

        <dt className="text-text-secondary">Knowledge</dt>
        <dd>{report.knowledgeConfidence}</dd>

        <dt className="text-text-secondary">Freshness</dt>
        <dd>{report.freshness}</dd>
      </dl>
    </main>
  );
};
