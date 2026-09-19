/**
 * Supporter and Board Confidence (Screen 47) — the board half.
 *
 * **Save-scoped, and it must stay that way.** `board_objective` is keyed on `season_number` and
 * names the human's club, so a rival club has no Board Objective at all. That is the one exception
 * to [the club-scoped rule](../../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md),
 * and it is subject existence rather than secrecy — there is nothing withheld because there is
 * nothing there. This screen should never acquire a `club/$clubId/board-confidence` route.
 *
 * **Supporter confidence is absent, not zero.** It has no model; the Group C ledger `deferred`s it,
 * and the screen says so rather than showing a bar nobody computes.
 *
 * The objective panel carries `role="region"` explicitly: an `aria-label` on a bare `div` does not
 * make it a landmark, so without the role it is unaddressable to a screen reader and to a spec.
 */
import { type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";
import {
  boardConfidenceAtom,
  describeRpcError,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";
import { PANEL } from "../theme.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** A defect-only cause carries no typed error, so it falls back to the generic line. */
const messageOf = (error: RpcClientError<"getBoardConfidence"> | null): string =>
  error === null ? "Board confidence could not be loaded." : describeRpcError(error);

const BoardConfidenceMessage = ({ message }: { readonly message: string }) => (
  <main tabIndex={-1} data-focus-id="boardConfidence" aria-label="Board Confidence" className={PAGE_CLASS}>
    <h1 className="text-2xl font-bold">Board Confidence</h1>
    <p className="mt-4 text-text-secondary">{message}</p>
  </main>
);

/** The verdict in the board's words. `null` is not "no verdict yet" being hidden — it is a season
 *  still being played, which is the ordinary state for most of a career. */
const VERDICT_LABELS: Readonly<Record<string, string>> = {
  exceeded: "Exceeded",
  met: "Met",
  missed: "Missed",
};

export const BoardConfidenceScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const result = useAtomValue(boardConfidenceAtom(saveId));

  if (result._tag === "Failure")
    return <BoardConfidenceMessage message={messageOf(typedError(result))} />;
  if (result._tag !== "Success")
    return <BoardConfidenceMessage message="Loading board confidence..." />;

  const { clubName, season, objective } = result.value;

  return (
    <main tabIndex={-1} data-focus-id="boardConfidence" aria-label="Board Confidence" className={PAGE_CLASS}>
      <h1 className="text-2xl font-bold">Board Confidence</h1>
      <p className="mt-1 mb-6 text-sm text-text-secondary">
        What {clubName}&rsquo;s board expects of you this season.
      </p>

      {objective === null ? (
        <p className="text-text-secondary italic">
          The board has not set an objective yet.
        </p>
      ) : (
        <div role="region" aria-label="Board Objective" className={`rounded-md border p-4 ${PANEL}`}>
          <p className="text-sm text-text-secondary">
            Season {objective.seasonNumber} league objective
          </p>
          <p className="text-xl font-semibold mt-1">
            Finish between {objective.minPosition} and {objective.maxPosition}
          </p>
          <p className="mt-3 text-sm text-text-secondary">
            {objective.finalPosition === null
              ? "The season is still being played."
              : `Finished ${objective.finalPosition}.`}{" "}
            {objective.verdict === null
              ? "No verdict yet."
              : `Verdict: ${VERDICT_LABELS[objective.verdict] ?? objective.verdict}.`}
          </p>
        </div>
      )}

      {/* Named rather than omitted: a screen called "Supporter and Board Confidence" that silently
          shows only half is a screen a reader assumes is broken. */}
      <p className="mt-8 text-sm text-text-secondary italic">
        Supporter confidence is not modelled in this game.
      </p>

      <p className="mt-2 text-xs text-text-muted">Season {season.seasonNumber}</p>
    </main>
  );
};
