import { useCallback, useEffect, useRef, useState } from "react";
import { WriteRequestId, type SaveId } from "@cm-clone/contracts";
import { sameTrainingSessions, type TrainingSession } from "@cm-clone/shared";
import {
  changeTrainingScheduleMutation,
  trainingScheduleAtom,
  typedError,
  useAtomRefresh,
  useAtomSet,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";

/** The server's current revision when a save lost the race; `null` for any other failure. */
const conflictRevisionOf = (error: unknown): number | null => {
  const failure = error as RpcClientError<"changeTrainingSchedule"> | null;
  return failure?._tag === "RemoteFailure" &&
    failure.error._tag === "TrainingScheduleRevisionConflictError"
    ? failure.error.currentRevision
    : null;
};

/**
 * The Training Schedule's draft lifecycle, the Tactics editor's (`useTacticDraft`) cut down to what
 * this screen needs: the draft is seeded from the first read, edits stay local until Save, a stale
 * save surfaces as a `conflict` that keeps the draft until Refresh lands a newer revision, and Reset
 * puts the draft back to the last saved sessions.
 */
export const useTrainingScheduleDraft = (saveId: SaveId) => {
  const viewResult = useAtomValue(trainingScheduleAtom(saveId));
  const refreshView = useAtomRefresh(trainingScheduleAtom(saveId));
  const submit = useAtomSet(changeTrainingScheduleMutation, { mode: "promise" });

  const [draft, setDraft] = useState<ReadonlyArray<TrainingSession> | null>(null);
  // The last sessions the server confirmed, which Reset returns to and `dirty` compares against.
  const [saved, setSaved] = useState<ReadonlyArray<TrainingSession> | null>(null);
  const [revision, setRevision] = useState(0);
  const [conflict, setConflict] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  // The revision a Refresh waits to move past: the refetch passes the stale view through first,
  // and that view must not re-seed the draft.
  const refreshFrom = useRef<number | null>(null);

  const view = viewResult._tag === "Success" ? viewResult.value : null;

  useEffect(() => {
    if (view === null) return;
    const seeding = draft === null;
    const refreshed = refreshFrom.current !== null && view.revision !== refreshFrom.current;
    if (!seeding && !refreshed) return;
    setDraft(view.sessions);
    setSaved(view.sessions);
    setRevision(view.revision);
    if (refreshed) {
      refreshFrom.current = null;
      setConflict(null);
      setStatus(null);
    }
  }, [view, draft]);

  const sessions = draft ?? view?.sessions ?? [];
  const dirty = saved !== null && draft !== null && !sameTrainingSessions(saved, draft);

  const save = useCallback(async (): Promise<void> => {
    if (draft === null) return;
    setStatus("Saving...");
    setConflict(null);
    try {
      const result = await submit({
        saveId,
        sessions: draft,
        expectedRevision: revision,
        requestId: WriteRequestId.make(crypto.randomUUID()),
      });
      setDraft(result.sessions);
      setSaved(result.sessions);
      setRevision(result.revision);
      setStatus("Saved.");
    } catch (error) {
      const currentRevision = conflictRevisionOf(error);
      if (currentRevision !== null) {
        setConflict(currentRevision);
        setStatus(null);
      } else {
        setStatus("The schedule could not be saved. Please try again.");
      }
    }
  }, [draft, revision, saveId, submit]);

  const reset = useCallback(() => {
    if (saved === null) return;
    setDraft(saved);
    setStatus(null);
  }, [saved]);

  const refresh = useCallback(() => {
    refreshFrom.current = revision;
    setStatus("Loading the current schedule...");
    refreshView();
  }, [refreshView, revision]);

  return {
    viewResult,
    viewError: typedError(viewResult),
    /** The read, once it has arrived: the next Fixture and the saved template. */
    view,
    /** The draft sessions, in slot order. */
    sessions,
    /** True when the draft differs from the last saved sessions. */
    dirty,
    /** The server's current revision when a save lost the race, or `null`. */
    conflict,
    status,
    setSessions: setDraft,
    save,
    reset,
    refresh,
  };
};
