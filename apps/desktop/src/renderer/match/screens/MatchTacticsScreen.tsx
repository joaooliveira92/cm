import { useCallback, useState } from "react";
import type { SaveId, Tactic } from "@cm-clone/contracts";
import { LiveCommandFrame } from "../LiveCommandFrame.js";
import { useLiveMatchCommands, type LiveMatchCommands, type LiveMatchReady } from "../useLiveMatchCommands.js";
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
  // The draft lives here, not in the ready-only child, so it survives a
  // transient non-ready view the way it did before the frame gated its children.
  const [draftTactic, setDraftTactic] = useState<Tactic | null>(null);
  const [undoStack, setUndoStack] = useState<Array<Tactic>>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  return (
    <LiveCommandFrame saveId={saveId} focusId="matchMatchTactics" title="Match Tactics" commands={commands} fill>
      {(ready) => (
        <MatchTacticsReady
          saveId={saveId}
          ready={ready}
          commands={commands}
          draftTactic={draftTactic}
          setDraftTactic={setDraftTactic}
          undoStack={undoStack}
          setUndoStack={setUndoStack}
          validationError={validationError}
          setValidationError={setValidationError}
        />
      )}
    </LiveCommandFrame>
  );
};

/**
 * The command surface's body, its own component so the callbacks are hooks at
 * the top level of a function component rather than inside the frame's render
 * prop. The draft it edits is owned by the parent.
 */
const MatchTacticsReady = ({
  saveId,
  ready,
  commands,
  draftTactic,
  setDraftTactic,
  undoStack,
  setUndoStack,
  validationError,
  setValidationError,
}: {
  readonly saveId: SaveId;
  readonly ready: LiveMatchReady;
  readonly commands: LiveMatchCommands;
  readonly draftTactic: Tactic | null;
  readonly setDraftTactic: (tactic: Tactic | null) => void;
  readonly undoStack: ReadonlyArray<Tactic>;
  readonly setUndoStack: (stack: Tactic[]) => void;
  readonly validationError: string | null;
  readonly setValidationError: (error: string | null) => void;
}) => {
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
    [tactic, undoStack, setUndoStack, setDraftTactic, setValidationError],
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
};
