import { useCallback, useEffect, useRef, useState } from "react";
import { PlayerId, Tactic, WriteRequestId, type SaveId } from "@cm-clone/contracts";
import { FORMATION_SLOTS, POSITION_ROLES, emptyBench, type Formation } from "@cm-clone/shared";
import {
  changeTacticsMutation,
  tacticsAtom,
  typedError,
  useAtomRefresh,
  useAtomSet,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";

/** A screen-safe default Tactic (formation's slots empty, empty bench) so an editor that owns the
 *  same persist path never runs against a null Tactic while the first load is still in flight. */
export const defaultTacticFor = (formation: Formation): Tactic =>
  new Tactic({
    formation,
    slots: FORMATION_SLOTS[formation].map((position) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: PlayerId.make(""),
    })),
    bench: emptyBench(),
    mentality: "balanced",
    tempo: "normal",
    pressing: "medium",
  });

/** The server's current tactic revision, when a save failed because a newer one won the race.
 *  `null` for every other failure — a stale submit is the one case an editor offers Refresh for. */
const conflictRevisionOf = (error: unknown): number | null => {
  const failure = error as RpcClientError<"changeTactics"> | null;
  return failure?._tag === "RemoteFailure" && failure.error._tag === "TacticRevisionConflictError"
    ? failure.error.currentRevision
    : null;
};

interface UseTacticDraftOptions {
  /** The wording for a non-conflict save failure: an editor-specific hint (e.g. every slot filled). */
  readonly saveFailureMessage: string;
}

/** Everything a surface that edits the Tactic needs — see the hook's return for the shape. */
export type TacticDraft = ReturnType<typeof useTacticDraft>;

/**
 * The one draft lifecycle behind every surface that edits the persisted Tactic: load it, hold the
 * manager's edits as a draft against the revision it was read at, save with an expected revision,
 * and resolve a lost write race by offering refresh. The owned state mirrors `getTactics`'s view:
 *
 * - the draft is seeded from the view on first load and replaced whole on a successful save;
 * - a stale submit (the view advanced under the editor) is surfaced as a `conflict` with the server's
 *   current revision, keeping the draft intact, until the manager refreshes;
 * - a refresh only discards the draft once the refetched view has actually moved past the stale
 *   revision, so the still-stale view that passes through first can never re-seed it.
 */
export const useTacticDraft = (saveId: SaveId, options: UseTacticDraftOptions) => {
  const viewResult = useAtomValue(tacticsAtom(saveId));
  const refreshTactics = useAtomRefresh(tacticsAtom(saveId));
  const [draft, setDraft] = useState<Tactic | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  // The revision the current draft was read at — the `expectedRevision` every submit carries. It
  // only moves when a save succeeds, so a stale submit is detected server-side as a conflict.
  const [revision, setRevision] = useState<number>(0);
  // The server's current revision when a save lost the race; while set, an editor shows a distinct
  // conflicted state and offers Refresh instead of a bare failure line.
  const [conflict, setConflict] = useState<number | null>(null);
  // The revision a refresh is waiting to move past. The refetch passes a still-stale view through
  // before the fresh one lands, so a refresh only discards the draft once the view's revision has
  // actually advanced — the stale view can never re-seed it.
  const refreshFrom = useRef<number | null>(null);
  const tacticRef = useRef(defaultTacticFor("4-4-2"));
  const revisionRef = useRef(revision);

  const saveTactic = useAtomSet(changeTacticsMutation, { mode: "promise" });

  useEffect(() => {
    if (draft === null && viewResult._tag === "Success") {
      setDraft(viewResult.value.tactic ?? defaultTacticFor("4-4-2"));
      setRevision(viewResult.value.revision);
    }
  }, [draft, viewResult]);

  // A refresh discards the draft and the conflict once the refetched view moves past the stale
  // revision — not before, when the view still carries the old value.
  useEffect(() => {
    if (viewResult._tag !== "Success" || refreshFrom.current === null) return;
    if (viewResult.value.revision === refreshFrom.current) return;
    setDraft(viewResult.value.tactic ?? defaultTacticFor("4-4-2"));
    setRevision(viewResult.value.revision);
    refreshFrom.current = null;
    setConflict(null);
    setStatus(null);
  }, [viewResult]);

  const viewError = typedError(viewResult);

  // A screen-safe tactic that also holds pre-load / error states, so editors never sit behind a
  // conditional early return.
  const pendingView = viewResult._tag === "Success" ? viewResult.value : null;
  const tactic = draft ?? pendingView?.tactic ?? defaultTacticFor("4-4-2");
  tacticRef.current = tactic;
  revisionRef.current = revision;

  const save = useCallback(async () => {
    setStatus("Saving...");
    setConflict(null);
    try {
      // A fresh request id per submit: replaying this exact submit later is a server-side no-op.
      const saved = await saveTactic({
        saveId,
        tactic: tacticRef.current,
        expectedRevision: revisionRef.current,
        requestId: WriteRequestId.make(crypto.randomUUID()),
      });
      setDraft(saved.tactic ?? tacticRef.current);
      setRevision(saved.revision);
      setStatus("Saved.");
    } catch (error) {
      const currentRevision = conflictRevisionOf(error);
      if (currentRevision !== null) {
        // The draft keeps what the manager typed; only the save itself is refused. An editor shows
        // the conflict state it owns — not this status.
        setConflict(currentRevision);
        setStatus(null);
      } else {
        setStatus(options.saveFailureMessage);
      }
    }
  }, [saveId, saveTactic, options.saveFailureMessage]);

  const refresh = useCallback(() => {
    refreshFrom.current = revisionRef.current;
    setStatus("Loading the current tactic...");
    refreshTactics();
  }, [refreshTactics]);

  return {
    /** The `getTactics` view state, for the loading/error branches and any squad list it supplies. */
    viewResult,
    /** The typed RPC error to word when the view itself failed to load. */
    viewError,
    /** The current draft (or defaults/loaded tactic before a draft exists). */
    tactic,
    /** The revision the draft was read at — also the value a successful save lands on. */
    revision,
    /** The server's current revision when a save lost the race, or `null`. */
    conflict,
    /** The transient save/refresh status line, or `null`. */
    status,
    /** Replace the draft (only while a save or refresh has not superseded it). */
    setTactic: setDraft,
    /** Save the draft against the revision it was read at. Rejects with a conflict rather than
     *  clobbering when a newer revision won. */
    save,
    /** Refetch the persisted Tactic and reload the draft once the newer revision lands. */
    refresh,
  };
};