import { type SaveId, type TacticsOverviewView } from "@cm-clone/contracts";
import { useEffect, useRef, useState } from "react";
import { Alert } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent } from "../components/ui/card.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import type {
  CareerDestination,
  SaveScopedCareerDestinationType,
} from "../navigation/destinations.js";
import {
  describeRpcError,
  leagueTableAtom,
  managerProfileAtom,
  tacticsOverviewAtom,
  typedError,
  useAtomRefresh,
  useAtomValue,
} from "../rpc.js";
import {
  admitSnapshot,
  overviewViewState,
  type TacticsOverviewState,
} from "./overviewViewState.js";

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const INSTRUCTION_KEYS = ["mentality", "tempo", "pressing"] as const;
type InstructionKey = (typeof INSTRUCTION_KEYS)[number];

/** One role: the Tactics area's read-only home (Screen 80 / ticket 03). Opening Tactics lands
 *  here, not in the editor: the overview renders the snapshot command's one immutable
 *  `TacticsOverviewView` as cards, launches the supported preparation workflows (the editor, and
 *  match preparation when a fixture is pending), and is itself the destination the editing
 *  workflow returns to.
 *
 *  View states are the spec's, restricted to the ones a read-only screen can honestly hold:
 *  `loading`, `ready`, `conflicted`, `permission-limited`, `failed`. The editor-only transcription
 *  states (modified, validating, submitting, completed) do not exist here because this screen
 *  changes nothing. `permission-limited` is the archived save's refusal mapped onto the existing
 *  saved-state guard (`managerProfileView.archived`), never a new concept.
 *
 *  Staleness is the screen's one hard rule: a snapshot that arrives behind the one already shown
 *  is discarded whole (by declared revision, never by arrival order), and a newer one is offered
 *  as a distinct conflicted state rather than swapped in underneath the player.
 */
export const TacticsOverviewScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const result = useAtomValue(tacticsOverviewAtom(saveId));
  const profileResult = useAtomValue(managerProfileAtom(saveId));
  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const refresh = useAtomRefresh(tacticsOverviewAtom(saveId));

  // The snapshot the screen is rendering. Held separately from the atom so that an arriving
  // response is admitted by revision — the pure `admitSnapshot` rule — and a superseding one
  // waits on the player's explicit refresh instead of silently replacing what is on screen.
  const [rendered, setRendered] = useState<TacticsOverviewView | null>(null);
  const renderedRef = useRef<TacticsOverviewView | null>(null);

  useEffect(() => {
    if (result._tag !== "Success") return;
    const admission = admitSnapshot(renderedRef.current, result.value);
    if (!admission.admitted) return;
    renderedRef.current = admission.rendered;
    setRendered(admission.rendered);
  }, [result]);

  const failed = typedError(result) !== null;
  const latest = result._tag === "Success" ? result.value : null;
  const archived = profileResult._tag === "Success" ? profileResult.value.archived : false;
  const state: TacticsOverviewState = overviewViewState({ rendered, latest, failed, archived });

  // The one polite announcer: meaningful state transitions and the totals, announced without
  // reading every change. Slots stay silently readable — the lists carry them.
  const [announcement, setAnnouncement] = useState<string | null>(null);
  useEffect(() => {
    if (state === "ready" && rendered !== null) {
      setAnnouncement(headline(rendered));
    } else if (state === "conflicted") {
      setAnnouncement("A newer tactic exists. Showing the previous one until you refresh.");
    } else if (state === "failed") {
      setAnnouncement("Failed to load the tactics overview.");
    } else if (state === "permission-limited") {
      setAnnouncement("This career has ended. The tactics overview is read-only.");
    }
  }, [state, rendered]);

  const adoptCurrent = () => {
    if (latest === null || rendered === null) return;
    if (latest.revision > rendered.revision) {
      renderedRef.current = latest;
      setRendered(latest);
    }
  };

  const go = (destination: CareerDestination, event: { readonly detail: number }) =>
    navigateCareer(destination, intentOfClick(event));

  if (state === "loading") {
    return (
      <main
        data-overview-state="loading"
        aria-busy="true"
        tabIndex={-1}
        data-focus-id="tactics"
        aria-label="Tactics Overview"
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <h1 className="text-2xl font-bold">Tactics Overview</h1>
        <p className="mt-2 text-text-secondary">Loading your tactical preparation...</p>
      </main>
    );
  }

  if (state === "failed") {
    const error = typedError(result);
    return (
      <main
        data-overview-state="failed"
        tabIndex={-1}
        data-focus-id="tactics"
        aria-label="Tactics Overview"
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <h1 className="text-2xl font-bold">Tactics Overview</h1>
        <p className="mt-2 text-text-danger" data-testid="tactics-overview-failed">
          {error !== null ? describeRpcError(error) : "Failed to load the tactics overview."}
        </p>
        <Button type="button" variant="secondary" className="mt-4" onClick={() => refresh()}>
          Retry
        </Button>
      </main>
    );
  }

  const view = rendered;
  // The state machine above guarantees a snapshot past `loading`/`failed`; the guard keeps the
  // cards' props non-nullable without widening every one.
  if (view === null) return null;
  const awaitingFixture =
    tableResult._tag === "Success" ? tableResult.value.season.awaitingFixture !== null : false;

  return (
    <main
      data-overview-state={state}
      tabIndex={-1}
      data-focus-id="tactics"
      aria-label="Tactics Overview"
      className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      aria-busy={result.waiting}
    >
      {announcement !== null && (
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Tactics Overview</h1>
          <p className="text-sm text-text-secondary">
            Read-only — review your tactical preparation before editing.
          </p>
        </div>
        {result.waiting && <span className="text-sm text-text-muted">Refreshing…</span>}
      </div>

      {state === "conflicted" && (
        <Alert className="mt-4" data-testid="tactics-overview-conflicted">
          <span className="font-semibold">This tactic changed since this overview loaded.</span>{" "}
          <span className="text-text-body">Showing the previous one until you confirm.</span>
          <div className="mt-3 flex gap-2">
            <Button type="button" className={FOCUS_RING.join(" ")} onClick={adoptCurrent}>
              Show the current tactic
            </Button>
          </div>
        </Alert>
      )}
      {state === "permission-limited" && (
        <Alert className="mt-4" data-testid="tactics-overview-readonly">
          [Archived] This career has ended. The save is read-only.
        </Alert>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FormationCard view={view} />
        <TeamInstructionsCard view={view} />
        <FamiliarityCard view={view} />
        <SelectionCard view={view} />
        <SetPiecesCard view={view} />
        <IssuesCard view={view} saveId={saveId} onOpen={go} readOnly={archived} />
      </div>

      <section aria-label="Tactics workflows" className="mt-6 flex flex-wrap items-center gap-3">
        {!archived && (
          <Button
            type="button"
            className={FOCUS_RING.join(" ")}
            onClick={(event) => go({ type: "tacticsEditor", saveId }, event)}
          >
            Open the tactics editor
          </Button>
        )}
        {!archived && awaitingFixture && (
          <Button
            type="button"
            variant="secondary"
            className={FOCUS_RING.join(" ")}
            onClick={(event) => go({ type: "match", saveId }, event)}
          >
            Match preparation
          </Button>
        )}
        {archived && (
          <p className="text-sm text-text-secondary">
            This save is read-only, so the editor and match preparation are unavailable.
          </p>
        )}
      </section>
    </main>
  );
};

/** The one line the polite announcer reads on `ready`: the totals, never the per-slot detail. */
const headline = (view: TacticsOverviewView): string => {
  const formation = view.formation === null ? "No tactic saved" : view.formation.formation;
  const instructions =
    view.instructions === null
      ? ""
      : `. ${capitalize(view.instructions.mentality)} mentality, ${capitalize(
        view.instructions.tempo,
      )} tempo, ${capitalize(view.instructions.pressing)} pressing`;
  return `Tactics overview. ${formation}${instructions}. ${view.selection.starters.length} starters, ${view.selection.substitutes.length} substitutes.`;
};

const FormationCard = ({ view }: { readonly view: TacticsOverviewView }) => (
  <Card>
    <CardContent className="pt-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Formation
      </h2>
      {view.formation === null ? (
        <p className="mt-1 text-text-body">No tactic saved — set one to prepare.</p>
      ) : (
        <>
          <p className="mt-1 text-base font-semibold">{view.formation.formation}</p>
          {/* Slots exposed through a list, never drag-only: the preview is read-only, and each
              slot is named positionally without any pointer-only interaction. */}
          <ul aria-label="Formation slots" className="mt-1 list-inside list-disc text-sm">
            {view.formation.slots.map((slot, index) => (
              <li key={`${slot.position}-${index}`}>{slot.position}</li>
            ))}
          </ul>
        </>
      )}
    </CardContent>
  </Card>
);

const TeamInstructionsCard = ({ view }: { readonly view: TacticsOverviewView }) => {
  const instructions = view.instructions;
  return (
    <Card>
      <CardContent className="pt-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Team instructions
        </h2>
        {instructions === null ? (
          <p className="mt-1 text-text-body">Set a tactic to choose instructions.</p>
        ) : (
          <dl className="mt-1 space-y-0.5 text-sm">
            {INSTRUCTION_KEYS.map((key: InstructionKey) => (
              <div key={key} className="flex justify-between">
                <dt className="text-text-secondary">{capitalize(key)}</dt>
                <dd className="font-semibold">{capitalize(instructions[key])}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
};

const FamiliarityCard = ({ view }: { readonly view: TacticsOverviewView }) => (
  <Card>
    <CardContent className="pt-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Familiarity
      </h2>
      {view.familiarity === null ? (
        <p className="mt-1 text-text-body">Familiarity is derived from the starters' positions.</p>
      ) : (
        <dl className="mt-1 space-y-0.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Natural</dt>
            <dd className="font-semibold tabular-nums">{view.familiarity.natural}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Competent</dt>
            <dd className="font-semibold tabular-nums">{view.familiarity.competent}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Unfamiliar</dt>
            <dd className="font-semibold tabular-nums">{view.familiarity.unfamiliar}</dd>
          </div>
        </dl>
      )}
    </CardContent>
  </Card>
);

const SelectionCard = ({ view }: { readonly view: TacticsOverviewView }) => (
  <Card>
    <CardContent className="pt-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Selection
      </h2>
      <p className="mt-1 text-base font-semibold tabular-nums">
        {view.selection.starters.length} starters · {view.selection.substitutes.length} substitutes
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Starters</h3>
          {view.selection.starters.length === 0 ? (
            <p className="text-sm text-text-secondary">No starters selected.</p>
          ) : (
            <ol className="mt-1 list-inside list-decimal text-sm">
              {view.selection.starters.map((player) => (
                <li key={player.id}>
                  {player.firstName} {player.lastName}
                </li>
              ))}
            </ol>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold">Substitutes</h3>
          {view.selection.substitutes.length === 0 ? (
            <p className="text-sm text-text-secondary">Everyone is a starter.</p>
          ) : (
            <ul className="mt-1 list-inside list-disc text-sm">
              {view.selection.substitutes.map((player) => (
                <li key={player.id}>
                  {player.firstName} {player.lastName}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const SetPiecesCard = ({ view }: { readonly view: TacticsOverviewView }) => (
  <Card>
    <CardContent className="pt-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Set pieces
      </h2>
      {view.setPieces.status === "none" ? (
        <p className="mt-1 text-text-body">No set pieces configured.</p>
      ) : (
        <p className="mt-1 text-text-body">{view.setPieces.status}</p>
      )}
    </CardContent>
  </Card>
);

/** Where an issue's owning screen lives, from the overview's point of view. */
const ISSUE_DESTINATION: Readonly<Record<string, SaveScopedCareerDestinationType>> = {
  // From the overview, a "tactics"-owned fix means opening the editor — the overview itself is
  // already the Tactics home, so pointing an issue back at it would be a no-op.
  tactics: "tacticsEditor",
  match: "match",
  transfers: "transfers",
  seasonSummary: "seasonSummary",
  league: "league",
  manager: "manager",
  news: "news",
  squad: "squad",
  fixtures: "fixtures",
};

const ISSUE_DESTINATION_LABELS: Readonly<Record<string, string>> = {
  tactics: "Open the editor",
  match: "Match day",
  transfers: "Transfers",
  seasonSummary: "Season summary",
  league: "League table",
  manager: "Manager profile",
  news: "News",
  squad: "Squad",
  fixtures: "Fixtures",
};

const IssuesCard = ({
  view,
  saveId,
  onOpen,
  readOnly,
}: {
  readonly view: TacticsOverviewView;
  readonly saveId: SaveId;
  readonly onOpen: (destination: CareerDestination, event: { readonly detail: number }) => void;
  readonly readOnly: boolean;
}) => (
  <Card>
    <CardContent className="pt-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Outstanding issues
      </h2>
      {view.issues.length === 0 ? (
        <p className="mt-1 text-text-body">Nothing outstanding.</p>
      ) : (
        <ul className="mt-1 space-y-2 text-sm">
          {view.issues.map((issue) => {
            const route = ISSUE_DESTINATION[issue.destination ?? ""];
            const issueId = `overview-issue-${issue.id}`;
            return (
              <li
                key={issue.id}
                id={issueId}
                className="rounded-panel border border-border-subtle px-2 py-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span>
                    <span className="font-semibold">{issue.title}.</span>{" "}
                    <span className="text-text-secondary">{issue.detail}</span>
                  </span>
                  {/* State never by color alone: the badge's tint is decoration; the word says it. */}
                  <Badge
                    variant={issue.severity === "blocking" ? "destructive" : "secondary"}
                    className="shrink-0"
                  >
                    {issue.severity === "blocking" ? "Requires action" : "Notice"}
                  </Badge>
                </div>
                {route !== undefined && !readOnly && (
                  <div className="mt-1.5">
                    {/* The warning is associated with the control that resolves it. */}
                    <button
                      type="button"
                      aria-describedby={issueId}
                      className={`text-sm underline underline-offset-2 hover:text-text-primary ${FOCUS_RING.join(" ")}`}
                      onClick={(event) => onOpen({ type: route, saveId }, event)}
                    >
                      {ISSUE_DESTINATION_LABELS[issue.destination ?? ""] ?? "Fix"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </CardContent>
  </Card>
);