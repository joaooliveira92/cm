import type { ClubId, SaveId, TeamScoutReportView } from "@cm-clone/contracts";
import { useEffect, useRef, useState } from "react";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import {
  describeRpcError,
  fixturesAtom,
  managerProfileAtom,
  squadAtom,
  teamScoutReportAtom,
  typedError,
  useAtomValue,
} from "../rpc.js";
import { AssignScoutPanel } from "./AssignScoutPanel.js";
import { PreviousReportsPanel } from "./PreviousReportsPanel.js";
import { admitReport, reportViewState, type ReportViewState } from "./reportViewState.js";
import {
  FindingList,
  KeyPlayerList,
  RecentForm,
  confidenceLabel,
  freshnessLabel,
  upcomingFixtureAgainst,
} from "./reportSections.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** The sentence each non-report state shows. `error` carries the RPC's own sentence when it has
 *  one; the other two are fixed because their cause is already known. */
const STATE_MESSAGES: Readonly<Record<"loading" | "empty" | "unavailable", string>> = {
  loading: "Loading scout report...",
  empty: "Your scouts have not watched this club yet, so there is nothing to report.",
  unavailable: "There is no such club in this save.",
};

/**
 * Team Scout Report (Screen 49) — what this club's scouts have learned about another.
 *
 * A drill-down: it is only reachable with a target club in hand, from a surface that already names
 * one. That is why it takes `clubId` as a prop rather than reading a selection from anywhere — the
 * route is the only thing that decides which club is being read.
 *
 * The screen holds the report it renders separately from the atom, so an arriving response is
 * admitted by `admitReport` (it must name the club the route is aimed at) and a recoverable refresh
 * failure keeps the last admitted report on screen instead of blanking it (spec §10).
 *
 * The tab shell carries all four of the spec's tabs: Squad and Tactical View (ticket 06), Previous
 * Reports (ticket 08), and Assign Scout (ticket 07).
 */
export const TeamScoutReportScreen = ({
  saveId,
  clubId,
}: {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
}) => {
  const result = useAtomValue(teamScoutReportAtom(saveId, clubId));
  const profileResult = useAtomValue(managerProfileAtom(saveId));
  const fixturesResult = useAtomValue(fixturesAtom(saveId));
  const squadResult = useAtomValue(squadAtom(saveId));

  const [admitted, setAdmitted] = useState<TeamScoutReportView | null>(null);
  const admittedRef = useRef<TeamScoutReportView | null>(null);

  useEffect(() => {
    if (result._tag !== "Success") return;
    const admission = admitReport(admittedRef.current, result.value, clubId);
    if (!admission.admitted) return;
    admittedRef.current = admission.rendered;
    setAdmitted(admission.rendered);
  }, [result, clubId]);

  // A report admitted for the club this screen was previously aimed at is not a fallback for the
  // club it is aimed at now: rendering it would put one club's findings under another's route.
  const rendered = admitted !== null && admitted.targetClubId === clubId ? admitted : null;
  const error = typedError(result);
  // The domain failure's own tag when the method answered with one; the client-side wrapper's tag
  // (transport, decode) otherwise, and a defect with no typed error still counts as a failure.
  const failureTag =
    error === null
      ? result._tag === "Failure"
        ? "Defect"
        : null
      : error._tag === "RemoteFailure"
        ? error.error._tag
        : error._tag;
  const state: ReportViewState = reportViewState({
    rendered,
    waiting: result.waiting,
    failureTag,
    archived: profileResult._tag === "Success" ? profileResult.value.archived : false,
  });

  const archived = profileResult._tag === "Success" ? profileResult.value.archived : false;

  if (rendered === null) {
    // The not-scouted answer names the reading a scout sent now would take, which is all the
    // assignment needs: "go and look" is offered right where the manager learns nobody has.
    const unscoutedReading =
      error !== null && error._tag === "RemoteFailure" && error.error._tag === "ClubNotScoutedError"
        ? { targetClubId: clubId, reportId: error.error.currentReportId, freshness: null }
        : null;
    const message =
      state === "error"
        ? error === null
          ? "Failed to load the scout report."
          : describeRpcError(error)
        : STATE_MESSAGES[state === "empty" || state === "unavailable" ? state : "loading"];
    return (
      <main
        tabIndex={-1}
        data-focus-id="teamScoutReport"
        data-report-state={state}
        aria-label="Team Scout Report"
        aria-busy={state === "loading"}
        className={PAGE_CLASS}
      >
        <h1 className="text-2xl font-bold">Team Scout Report</h1>
        {state === "error" ? (
          <Alert variant="destructive" className="mt-4">
            <p>{message}</p>
          </Alert>
        ) : (
          <p className="mt-4 text-text-secondary">{message}</p>
        )}
        {unscoutedReading !== null && (
          <div className="mt-6">
            <AssignScoutPanel saveId={saveId} report={unscoutedReading} readOnly={archived} />
          </div>
        )}
      </main>
    );
  }

  // The human club comes from the squad read, the one renderer view that names it by id.
  const fixture =
    fixturesResult._tag === "Success" && squadResult._tag === "Success"
      ? upcomingFixtureAgainst(
          fixturesResult.value,
          squadResult.value.club.id,
          rendered.targetClubId,
        )
      : null;

  return (
    <main
      tabIndex={-1}
      data-focus-id="teamScoutReport"
      data-report-state={state}
      aria-labelledby="team-scout-report-heading"
      aria-busy={state === "refreshing"}
      className={PAGE_CLASS}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 id="team-scout-report-heading" className="text-2xl font-bold">
            {rendered.targetClubName}
          </h1>
          <p className="text-sm text-text-secondary">Team Scout Report</p>
        </div>
        {state === "refreshing" && (
          <span role="status" className="text-sm text-text-muted">
            Refreshing…
          </span>
        )}
      </header>

      {state === "permission-limited" && (
        <Alert className="mt-4">[Archived] This career has ended. The save is read-only.</Alert>
      )}

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-text-secondary">Scout</dt>
        {/* Null when no scout is watching the club right now, so the knowledge was compiled from
            earlier or per-player scouting. Named plainly rather than left blank: a missing byline
            is information, not an omission to hide. */}
        <dd>{rendered.scout === null ? "Compiled from player scouting" : rendered.scout.scoutName}</dd>

        <dt className="text-text-secondary">Updated</dt>
        <dd>{rendered.observedAt}</dd>

        <dt className="text-text-secondary">Knowledge</dt>
        <dd>{confidenceLabel(rendered.knowledgeConfidence)}</dd>

        <dt className="text-text-secondary">Freshness</dt>
        <dd>{freshnessLabel(rendered.freshness)}</dd>
      </dl>

      <section aria-label="Report actions" className="mt-4">
        {fixture === null ? (
          <p className="text-sm text-text-secondary">No upcoming fixture against this club.</p>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className={FOCUS_RING.join(" ")}
            onClick={(event) =>
              navigateCareer({ type: fixture.destination, saveId }, intentOfClick(event))
            }
          >
            {fixture.label}
          </Button>
        )}
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <RecentForm results={rendered.recentForm} />
        <FindingList title="Strengths" findings={rendered.strengths} />
        <FindingList title="Weaknesses" findings={rendered.weaknesses} />
      </div>

      <Tabs defaultValue="squad" className="mt-8">
        <TabsList aria-label="Report sections">
          <TabsTrigger value="squad">Squad</TabsTrigger>
          <TabsTrigger value="tactical">Tactical View</TabsTrigger>
          <TabsTrigger value="previous">Previous Reports</TabsTrigger>
          <TabsTrigger value="assign">Assign Scout</TabsTrigger>
        </TabsList>
        <TabsContent value="squad">
          <KeyPlayerList
            players={rendered.keyPlayers}
            onOpen={(playerId, event) =>
              navigateCareer({ type: "playerDetail", saveId, playerId }, intentOfClick(event))
            }
          />
        </TabsContent>
        <TabsContent value="tactical">
          <section aria-labelledby="report-formation-heading">
            <h2 id="report-formation-heading" className="text-lg font-semibold">
              Predicted formation
            </h2>
            <p className="mt-1 text-sm">
              {rendered.predictedFormation === null
                ? "Unknown"
                : `${rendered.predictedFormation.formation} (${confidenceLabel(
                    rendered.predictedFormation.confidence,
                  )} confidence)`}
            </p>
          </section>
          <FindingList title="Set pieces" findings={rendered.setPieceFindings} className="mt-6" />
        </TabsContent>
        <TabsContent value="previous">
          <PreviousReportsPanel saveId={saveId} clubId={clubId} current={rendered} />
        </TabsContent>
        <TabsContent value="assign">
          <AssignScoutPanel
            saveId={saveId}
            report={rendered}
            readOnly={state === "permission-limited"}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
};
