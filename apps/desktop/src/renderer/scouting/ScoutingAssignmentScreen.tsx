/**
 * Scouting Assignment screen (Screen 121) — a sub-surface of Scouting.
 *
 * Lists every Scout at the manager's club with quality, current target and Scouting Progress, read
 * from `getScouting`. The manager picks a Club from the League Table read and points any Scout at
 * it, free or busy (`assignScoutToClub`), or ends a Scout's assignment (`unassignScout`). A Scout
 * already observing a Player shows that Player; a new Player target is not offered in v1.
 *
 * `assignScoutToClub` carries the Team Scout Report reading the manager acted from, so the chosen
 * Club's current reading is read first: a delivered report names it, and the not-scouted answer
 * names the id a reading taken now would carry. Neither is minted here.
 *
 * Both commands invalidate the scouting key, so the roster refreshes without a reload. A refusal is
 * shown inline as the RPC's own sentence, as the Team Scout Report's Assign Scout tab does.
 *
 * Reached from the Recruitment submenu at `/career/$saveId/scouting-assignment`, in the `scouting`
 * screen scope.
 */
import type { ClubId, SaveId, ScoutingTargetView } from "@cm-clone/contracts";
import { useState } from "react";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { FOCUS_RING } from "../focus.js";
import {
  assignScoutToClubMutation,
  describeRpcError,
  leagueTableAtom,
  managerProfileAtom,
  scoutingAtom,
  squadAtom,
  teamScoutReportAtom,
  typedError,
  unassignScoutMutation,
  useAtomSet,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";
import { ScoutRosterRow } from "./ScoutRosterRow.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

interface ClubOption {
  readonly clubId: ClubId;
  readonly clubName: string;
}

export const ScoutingAssignmentScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const board = useAtomValue(scoutingAtom(saveId));
  const table = useAtomValue(leagueTableAtom(saveId));
  const profile = useAtomValue(managerProfileAtom(saveId));
  const squad = useAtomValue(squadAtom(saveId));
  const [clubId, setClubId] = useState<ClubId | null>(null);

  const boardError = typedError(board);
  if (boardError !== null || board._tag === "Failure") {
    return (
      <AssignmentMessage
        message={boardError === null ? "The scouting board could not be loaded." : describeRpcError(boardError)}
      />
    );
  }
  if (board._tag === "Initial") {
    return <AssignmentMessage message="Loading your scouts..." />;
  }

  const readOnly = profile._tag === "Success" && profile.value.archived;
  // Own-squad Players are always read in full, so the manager's own club is never a target.
  const ownClubId = squad._tag === "Success" ? squad.value.club.id : null;
  const clubs: ReadonlyArray<ClubOption> =
    table._tag === "Success"
      ? table.value.standings
          .filter((row) => row.clubId !== ownClubId)
          .map((row) => ({ clubId: row.clubId, clubName: row.clubName }))
      : [];
  const chosen = clubs.find((club) => club.clubId === clubId) ?? null;
  const { scouts } = board.value;

  return (
    <main
      data-focus-id="scouting"
      aria-labelledby="scouting-assignment-heading"
      className={PAGE_CLASS}
      tabIndex={-1}
    >
      <header>
        <h1 id="scouting-assignment-heading" className="text-2xl font-bold">
          Scouting Assignment
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Each Scout holds one assignment. A Scout on a Club watches its whole squad.
        </p>
      </header>

      {readOnly ? (
        <p className="mt-4 text-sm text-text-secondary">
          This career has ended, so no assignment can change.
        </p>
      ) : (
        <ClubPicker clubs={clubs} clubId={chosen?.clubId ?? null} tableFailed={table._tag === "Failure"} onPick={setClubId} />
      )}

      {scouts.length === 0 ? (
        <p className="mt-6 text-text-secondary italic">Your club has no Scouts.</p>
      ) : chosen === null || readOnly ? (
        <Roster saveId={saveId} scouts={scouts} club={null} reportId={null} readOnly={readOnly} />
      ) : (
        <RosterForClub key={chosen.clubId} saveId={saveId} scouts={scouts} club={chosen} />
      )}
    </main>
  );
};

/** The Club a Scout would be sent to, chosen from the League Table read. */
const ClubPicker = ({
  clubs,
  clubId,
  tableFailed,
  onPick,
}: {
  readonly clubs: ReadonlyArray<ClubOption>;
  readonly clubId: ClubId | null;
  readonly tableFailed: boolean;
  readonly onPick: (clubId: ClubId | null) => void;
}) => {
  if (tableFailed) {
    return <p className="mt-4 text-sm text-text-danger">The clubs could not be loaded.</p>;
  }
  const items = [
    { label: "Choose a club", value: "" },
    ...clubs.map((club) => ({ label: club.clubName, value: club.clubId as string })),
  ];
  return (
    <div className="mt-4 flex items-center gap-3 text-sm text-text-body">
      <span>Club to scout</span>
      <Select
        value={clubId ?? ""}
        items={items}
        onValueChange={(value) => {
          const next = clubs.find((club) => club.clubId === value);
          onPick(next === undefined ? null : next.clubId);
        }}
      >
        <SelectTrigger aria-label="Club to scout" className={`min-w-56 ${FOCUS_RING.join(" ")}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

/** Reads the chosen Club's current reading, whose id the assignment command must carry. */
const RosterForClub = ({
  saveId,
  scouts,
  club,
}: {
  readonly saveId: SaveId;
  readonly scouts: ReadonlyArray<ScoutingTargetView>;
  readonly club: ClubOption;
}) => {
  const reading = useAtomValue(teamScoutReportAtom(saveId, club.clubId));
  const error = typedError(reading);
  const reportId =
    reading._tag === "Success"
      ? reading.value.reportId
      : error !== null && error._tag === "RemoteFailure" && error.error._tag === "ClubNotScoutedError"
        ? error.error.currentReportId
        : null;
  const readingFailed = reading._tag === "Failure" && reportId === null;
  return (
    <>
      {readingFailed && (
        <p role="alert" className="mt-2 text-sm text-text-danger">
          {error === null ? "That club's reading could not be loaded." : describeRpcError(error)}
        </p>
      )}
      <Roster saveId={saveId} scouts={scouts} club={club} reportId={reportId} readOnly={false} />
    </>
  );
};

/** The roster with each row's actions: send to the chosen Club, and end the current assignment. */
const Roster = ({
  saveId,
  scouts,
  club,
  reportId,
  readOnly,
}: {
  readonly saveId: SaveId;
  readonly scouts: ReadonlyArray<ScoutingTargetView>;
  readonly club: ClubOption | null;
  readonly reportId: string | null;
  readonly readOnly: boolean;
}) => {
  const assign = useAtomSet(assignScoutToClubMutation, { mode: "promise" });
  const unassign = useAtomSet(unassignScoutMutation, { mode: "promise" });
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const run = async (scoutId: string, command: () => Promise<unknown>, fallback: string) => {
    setPending(scoutId);
    setFailure(null);
    try {
      await command();
    } catch (error) {
      const typed = error as RpcClientError<"assignScoutToClub" | "unassignScout"> | undefined;
      setFailure(typed?._tag === undefined ? fallback : describeRpcError(typed));
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      {failure !== null && (
        <Alert variant="destructive" className="mt-4">
          <p>{failure}</p>
        </Alert>
      )}
      <ul className="mt-6 space-y-3" aria-label="Scouts">
        {scouts.map((scout) => (
          <ScoutRosterRow key={scout.scoutId} scout={scout}>
            {readOnly ? undefined : (
              <>
                {club !== null &&
                  (scout.targetClubId === club.clubId ? (
                    <span className="text-text-secondary">Watching this club</span>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className={FOCUS_RING.join(" ")}
                      disabled={pending !== null || reportId === null}
                      aria-label={`Assign ${scout.scoutName} to ${club.clubName}`}
                      onClick={() =>
                        reportId !== null &&
                        run(
                          scout.scoutId,
                          () =>
                            assign({ saveId, scoutId: scout.scoutId, clubId: club.clubId, expectedReportId: reportId }),
                          "The scout could not be assigned.",
                        )
                      }
                    >
                      {pending === scout.scoutId ? "Assigning…" : "Assign"}
                    </Button>
                  ))}
                {(scout.targetClubId !== null || scout.playerId !== null) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={FOCUS_RING.join(" ")}
                    disabled={pending !== null}
                    aria-label={`End ${scout.scoutName}'s assignment`}
                    onClick={() =>
                      run(scout.scoutId, () => unassign({ saveId, scoutId: scout.scoutId }), "The assignment could not be ended.")
                    }
                  >
                    End assignment
                  </Button>
                )}
              </>
            )}
          </ScoutRosterRow>
        ))}
      </ul>
    </>
  );
};

/** The non-`ready` states, rendered as a labelled `<main>` region carrying one line. */
const AssignmentMessage = ({ message }: { readonly message: string }) => (
  <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="scouting" aria-label="Scouting Assignment">
    <h1 className="text-2xl font-bold">Scouting Assignment</h1>
    <p className="mt-4 text-text-secondary italic">{message}</p>
  </main>
);
