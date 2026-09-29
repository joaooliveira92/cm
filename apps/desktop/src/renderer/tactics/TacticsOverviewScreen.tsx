import { type SaveId, type TacticsOverviewView } from "@cm-clone/contracts";
import { useEffect, useRef, useState } from "react";
import { Alert } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import type { CareerDestination } from "../navigation/destinations.js";
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
  FamiliarityCard,
  FormationCard,
  IssuesPanel,
  SelectionCard,
  SetPiecesCard,
  TeamInstructionsCard,
} from "./overviewCards.js";
import { capitalize } from "./overviewFormat.js";
import {
  admitSnapshot,
  overviewViewState,
  type TacticsOverviewState,
} from "./overviewViewState.js";

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
        className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <h1 className="text-title">Tactics Overview</h1>
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
        className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <h1 className="text-title">Tactics Overview</h1>
        <Alert variant="destructive" className="mt-2" data-testid="tactics-overview-failed">
          <p>
            {error !== null ? describeRpcError(error) : "Failed to load the tactics overview."}
          </p>
        </Alert>
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
      className={`p-6 text-foreground ${FOCUS_RING.join(" ")}`}
      aria-busy={result.waiting}
    >
      {announcement !== null && (
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      )}

      <header className="chrome-gradient flex flex-wrap items-center justify-between gap-3 rounded-panel border border-panel-border px-4 py-2 shadow-chrome">
        <div>
          <h1 className="text-title text-text-highlight">Tactics Overview</h1>
          <p className="text-body font-semibold text-text-bright">
            {view.club.name}
            {result.waiting && <span className="ml-2 font-normal text-text-muted">Refreshing…</span>}
          </p>
        </div>
        <section aria-label="Tactics workflows" className="flex flex-wrap items-center gap-2">
          {view.issues.length === 0 && (
            <Badge variant="secondary" className="text-text-success">
              Nothing outstanding
            </Badge>
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
          {!archived && (
            <Button
              type="button"
              className={FOCUS_RING.join(" ")}
              onClick={(event) => go({ type: "tacticsEditor", saveId }, event)}
            >
              Open the tactics editor
            </Button>
          )}
          {archived && (
            <p className="text-body text-text-bright">
              This save is read-only, so the editor and match preparation are unavailable.
            </p>
          )}
        </section>
      </header>

      {state === "conflicted" && (
        <Alert className="mt-4" data-testid="tactics-overview-conflicted">
          <span className="font-semibold">This tactic changed since this overview loaded.</span>{" "}
          <span className="text-text-soft">Showing the previous one until you confirm.</span>
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

      {view.issues.length > 0 && (
        <div className="mt-4">
          <IssuesPanel view={view} saveId={saveId} onOpen={go} readOnly={archived} />
        </div>
      )}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(260px,380px)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-0">
          <FormationCard view={view} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <SelectionCard view={view} />
          <div className="grid gap-4 md:grid-cols-3">
            <TeamInstructionsCard view={view} />
            <FamiliarityCard view={view} />
            <SetPiecesCard view={view} />
          </div>
        </div>
      </div>
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
