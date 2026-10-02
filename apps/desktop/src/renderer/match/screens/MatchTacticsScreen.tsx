import { useCallback, useState } from "react";
import type { SaveId, Tactic } from "@cm-clone/contracts";
import { LiveCommandFrame } from "../LiveCommandFrame.js";
import { useLiveMatchCommands, type LiveMatchReady } from "../useLiveMatchCommands.js";
import { TacticsScreen } from "../../tactics/TacticsScreen.js";

/**
 * Validate a live tactic change against the revealed pitch.
 * A player not on the pitch (sent off, injured off, red-carded) cannot be named in a tactic.
 * Returns null when valid, or an error message when refused.
 *
 * Exported for testing.
 */
export const validateLiveTactic = (tactic: Tactic, ready: LiveMatchReady): string | null => {
  const onPitchPlayerIds = new Set(ready.snapshot.pitch.onPitch.map((slot) => slot.playerId));
  for (const playerId of tactic.assignments) {
    if (playerId === "") continue; // Empty slot allowed (shorthanded)
    if (!onPitchPlayerIds.has(playerId)) {
      const player = ready.squad.find((p) => p.id === playerId);
      const name = player ? `${player.firstName} ${player.lastName}` : String(playerId);
      return `${name} is not on the pitch and cannot be assigned.`;
    }
  }
  return null;
};

/** Screen 97, tactics half: the full TacticsScreen showing, as the manager
 *  would see it pre-match, but with Confirm/Undo Last/Cancel in place of the
 *  normal save flow and validated against the revealed pitch. */
export const MatchMatchTacticsScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const commands = useLiveMatchCommands(saveId);
  const [draftTactic, setDraftTactic] = useState<Tactic | null>(null);
  const [undoStack, setUndoStack] = useState<Array<Tactic>>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  return (
    <LiveCommandFrame saveId={saveId} focusId="matchMatchTactics" title="Match Tactics" commands={commands} fill>
      {(ready) => {
        const tactic = draftTactic ?? ready.tactic;

        const onEdit = useCallback(
          (newTactic: Tactic) => {
            // Push the pre-edit tactic onto the undo stack before updating
            const currentStack = undoStack;
            const nextStack = [...currentStack, tactic];
            setUndoStack(nextStack);
            setDraftTactic(newTactic);
            setValidationError(null);
          },
          [ready.tactic, tactic, undoStack, setUndoStack, setDraftTactic, setValidationError],
        );

        const onConfirm = useCallback(
          () => {
            // Validate against the revealed pitch
            const error = validateLiveTactic(tactic, ready);
            if (error !== null) {
              setValidationError(error);
              return;
            }
            setValidationError(null);
            // Clear the undo stack — changes are now in the match
            setUndoStack([]);
            setDraftTactic(null);
            void commands.submit({ _tag: "ChangeTactics", clubId: ready.clubId, tactic });
          },
          [tactic, ready, commands, setUndoStack, setDraftTactic, setValidationError],
        );

        const onUndoLast = useCallback(
          () => {
            const stack = undoStack;
            if (stack.length === 0) return;
            const previous = stack[stack.length - 1];
            if (previous === undefined) return;
            setUndoStack(stack.slice(0, -1));
            setDraftTactic(previous);
            setValidationError(null);
          },
          [undoStack, setUndoStack, setDraftTactic, setValidationError],
        );

        const onCancel = useCallback(
          () => {
            setDraftTactic(null);
            setUndoStack([]);
            setValidationError(null);
          },
          [setDraftTactic, setUndoStack, setValidationError],
        );

        return (
          <TacticsScreen
            saveId={saveId}
            inMatch={{
              tactic,
              squad: ready.squad,
              clubName: ready.match.isHome ? ready.match.homeClubName : ready.match.awayClubName,
              setTactic: onEdit,
              onConfirm,
              onUndoLast,
              onCancel,
              pendingCount: undoStack.length,
              validationError,
              isPending: commands.status?._tag === "pending",
            }}
          />
        );
      }}
    </LiveCommandFrame>
  );
};
