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
 * This screen is deliberately a thin orchestrator: it owns the read state and the page layout, and
 * delegates the objective card and the read-states to their own components.
 */
import { type SaveId } from "@cm-clone/contracts";
import { BoardConfidenceFrame } from "./BoardConfidenceFrame.js";
import { BoardConfidenceMessage } from "./BoardConfidenceMessage.js";
import { BoardObjective } from "./BoardObjective.js";
import { BoardObjectiveEmptyState } from "./BoardObjectiveEmptyState.js";
import { useBoardConfidence } from "./useBoardConfidence.js";

export const BoardConfidenceScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const state = useBoardConfidence(saveId);

  if (state._tag !== "Ready")
    return <BoardConfidenceMessage message={state.message} />;

  const { clubName, season, objective } = state.value;

  return (
    <BoardConfidenceFrame>
      <p className="mt-1 mb-6 text-body text-text-secondary">
        What {clubName}&rsquo;s board expects of you this season.
      </p>

      {objective === null ? (
        <BoardObjectiveEmptyState />
      ) : (
        <BoardObjective objective={objective} />
      )}

      {/* Named rather than omitted: a screen called "Supporter and Board Confidence" that silently
          shows only half is a screen a reader assumes is broken. */}
      <p className="mt-8 text-body text-text-secondary italic">
        Supporter confidence is not modelled in this game.
      </p>

      <p className="mt-2 text-data text-text-muted">Season {season.seasonNumber}</p>
    </BoardConfidenceFrame>
  );
};