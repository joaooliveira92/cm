import { useEffect, useRef, type ReactNode } from "react";
import type { SaveId } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import { commandStatusLabel, type CommandStatus } from "./commandStatus.js";
import type { LiveMatchCommands, LiveMatchReady } from "./useLiveMatchCommands.js";

/**
 * The shell both live-match command screens share: the heading, the non-ready states (no match in
 * play, loading, failed with Retry), the scoreline and substitution allowance, the halftime toggle,
 * and the command status line. `children` renders only once the view is ready.
 *
 * `fill` makes the frame exactly the height its route gives it (the route needs `fitHeight`) and
 * hands the space left under the match state to `children`, for a workspace that sizes itself to
 * the window, such as Match Tactics.
 */
export const LiveCommandFrame = ({
  saveId,
  focusId,
  title,
  commands,
  fill = false,
  children,
}: {
  readonly saveId: SaveId;
  readonly focusId: string;
  readonly title: string;
  readonly commands: LiveMatchCommands;
  readonly fill?: boolean;
  readonly children: (ready: LiveMatchReady) => ReactNode;
}) => {
  const { view, status, isHalftime, setIsHalftime, retry } = commands;
  return (
    <main
      tabIndex={-1}
      data-focus-id={focusId}
      aria-label={title}
      className={`${fill ? "flex min-h-0 flex-1 flex-col p-6" : "p-8"} text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <div className={`${fill ? "mb-4 shrink-0" : "mb-6"} flex items-center justify-between gap-4`}>
        <h1 className="text-title">{title}</h1>
        <Button
          type="button"
          variant="secondary"
          className={FOCUS_RING.join(" ")}
          onClick={(event) => navigateCareer({ type: "match", saveId }, intentOfClick(event))}
        >
          Back to Match day
        </Button>
      </div>

      {view._tag === "no-live-match" && (
        <p className="text-text-secondary italic">
          No match is in play. Kick off from Match day to make live changes.
        </p>
      )}

      {view._tag === "loading" && <p className="text-text-secondary italic">Loading the match...</p>}

      {view._tag === "failed" && (
        <Alert variant="destructive">
          <p>{view.message}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={retry}>
            Retry
          </Button>
        </Alert>
      )}

      {view._tag === "ready" && (
        <div className={`${fill ? "flex min-h-0 flex-1 flex-col gap-4" : "space-y-4"} text-body`}>
          <section
            aria-label="Match state"
            className="shrink-0 rounded-panel border border-panel-border bg-panel-bg p-4"
          >
            <p className="font-semibold">
              {view.score === null
                ? `${view.match.homeClubName} v ${view.match.awayClubName}`
                : `${view.match.homeClubName} ${view.score.homeScore} - ${view.score.awayScore} ${view.match.awayClubName}`}
            </p>
            <p className="mt-1 text-data text-text-secondary">
              Substitutions used: {view.snapshot.subs.used}/{view.snapshot.subs.used + view.snapshot.subs.remaining}
              {" · "}Windows used: {view.snapshot.subs.windowsUsed}/
              {view.snapshot.subs.windowsUsed + view.snapshot.subs.windowsRemaining}
              {view.snapshot.subs.capReached && <span className="ml-2 text-destructive">Cap reached</span>}
            </p>
            <label className="mt-2 flex items-center gap-2 text-data text-text-secondary">
              <input
                type="checkbox"
                checked={isHalftime}
                disabled={!view.atHalftime}
                onChange={(event) => setIsHalftime(event.target.checked)}
                className={`accent-text-success ${FOCUS_RING.join(" ")}`}
              />
              Apply as a halftime instruction (doesn&apos;t consume a substitution window)
              {!view.atHalftime && " — available at half time"}
            </label>
          </section>

          {children(view)}

          <CommandStatusLine status={status} />
        </div>
      )}
    </main>
  );
};

const CommandStatusLine = ({ status }: { readonly status: CommandStatus | null }) => {
  const ref = useRef<HTMLParagraphElement | null>(null);
  // A settled command can re-key the form (a new tactic in play), dropping focus to the body; land
  // it on the outcome instead, and never pull focus away from a control the manager moved to.
  // Reading `status` (not a derived `settled` boolean) keeps the dependency honest: the effect
  // re-runs on every status change, which is exactly when a settled outcome can appear.
  useEffect(() => {
    if (status === null || status._tag === "pending") return;
    if (document.activeElement === null || document.activeElement === document.body) {
      ref.current?.focus();
    }
  }, [status]);
  return (
    <p
      ref={ref}
      tabIndex={-1}
      role="status"
      data-command-status={status?._tag ?? "none"}
      className={`${status?._tag === "rejected" ? "text-destructive" : "text-text-muted"} ${FOCUS_RING.join(" ")}`}
    >
      {status === null ? "" : commandStatusLabel(status)}
    </p>
  );
};
