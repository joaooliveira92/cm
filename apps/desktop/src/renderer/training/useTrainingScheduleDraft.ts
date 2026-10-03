import { useCallback, useEffect, useRef, useState } from "react";
import { WriteRequestId, type SaveId, type TrainingScheduleView } from "@cm-clone/contracts";
import { sameTrainingSessions, type TrainingSession } from "@cm-clone/shared";
import {
  changeTrainingScheduleMutation,
  setTrainingScheduleDelegationMutation,
  trainingScheduleAtom,
  typedError,
  useAtomRefresh,
  useAtomSet,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";

/** The server's current revision when a save lost the race; `null` for any other failure. */
const conflictRevisionOf = (error: unknown): number | null => {
  const failure = error as RpcClientError<"changeTrainingSchedule" | "setTrainingScheduleDelegation"> | null;
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
  const submitDelegation = useAtomSet(setTrainingScheduleDelegationMutation, { mode: "promise" });
  // The last confirmed view — who plans, and why — updated by every accepted write, so the screen
  // never shows the read from before a write it has already seen succeed.
  const [confirmed, setConfirmed] = useState<TrainingScheduleView | null>(null);

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
    setConfirmed(view);
    if (refreshed) {
      refreshFrom.current = null;
      setConflict(null);
      setStatus(null);
    }
  }, [view, draft]);

  const sessions = draft ?? view?.sessions ?? [];
  const dirty = saved !== null && draft !== null && !sameTrainingSessions(saved, draft);

  /** Run one revisioned write and adopt its result, or surface its conflict. */
  const accept = useCallback(
    async (write: (requestId: WriteRequestId) => Promise<TrainingScheduleView>, pending: string, done: string) => {
      setStatus(pending);
      setConflict(null);
      try {
        const result = await write(WriteRequestId.make(crypto.randomUUID()));
        setDraft(result.sessions);
        setSaved(result.sessions);
        setRevision(result.revision);
        setConfirmed(result);
        setStatus(done);
      } catch (error) {
        const currentRevision = conflictRevisionOf(error);
        if (currentRevision !== null) {
          setConflict(currentRevision);
          setStatus(null);
        } else {
          setStatus("The schedule could not be saved. Please try again.");
        }
      }
    },
    [],
  );

  const save = useCallback(async (): Promise<void> => {
    if (draft === null) return;
    await accept(
      (requestId) => submit({ saveId, sessions: draft, expectedRevision: revision, requestId }),
      "Saving...",
      "Saved.",
    );
  }, [accept, draft, revision, saveId, submit]);

  /** Hand the schedule to the assistant, or take it back. */
  const setDelegated = useCallback(
    async (delegated: boolean): Promise<void> => {
      await accept(
        (requestId) => submitDelegation({ saveId, delegated, expectedRevision: revision, requestId }),
        delegated ? "Handing the schedule to your assistant..." : "Taking the schedule back...",
        delegated ? "Your assistant is planning the schedule." : "You are planning the schedule.",
      );
    },
    [accept, revision, saveId, submitDelegation],
  );

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
    /** The last confirmed state of who plans: the read, or the result of the latest write. */
    delegated: confirmed?.delegated ?? false,
    assistantName: confirmed?.assistantName ?? "",
    assistantReason: confirmed?.assistantReason ?? null,
    /** The draft sessions, in slot order. */
    sessions,
    /** True when the draft differs from the last saved sessions. */
    dirty,
    /** The server's current revision when a save lost the race, or `null`. */
    conflict,
    status,
    setSessions: setDraft,
    save,
    setDelegated,
    reset,
    refresh,
  };
};
