import { useCallback, useEffect, useRef, useState } from "react";

import type { ResearchPriorityOutcome } from "../../../../shared/research-contract.js";
import type { ResearchScreenState } from "../research-screen-state.js";
import {
  draftIsSubmittable,
  draftToPriorities,
  researchBeginLoading,
  researchBeginSubmit,
  researchLoadFailure,
  researchLoadSuccess,
  researchSubmitRejected,
  researchSubmitSuccess,
  researchTransportFailure,
  setDraftWeight,
} from "../research-screen-state.js";

export interface UseResearchScreenReturn {
  readonly state: ResearchScreenState;
  readonly setFieldWeight: (fieldId: string, weight: 1 | 2 | 4) => void;
  readonly submit: () => void;
  readonly reload: () => Promise<void>;
  readonly canSubmit: boolean;
}

let transportCounter = 0;

/** Renderer-side transport identity for the optimistic-concurrency flow
 * (`expectedRevision` / `transportRequestId` triple). Generated here, outside
 * the pure reducer; a retry of the same prepared request replays the same id. */
function createTransportRequestId(): string {
  transportCounter++;
  return `priority-${Date.now().toString(36)}-${transportCounter}`;
}

type SubmitResult =
  | {
      readonly outcome: "success";
      readonly value: ResearchPriorityOutcome;
      readonly diagnostics: readonly string[];
    }
  | {
      readonly outcome: "rejected";
      readonly reason: string;
      readonly diagnostics: readonly string[];
      readonly currentRevision?: number;
    }
  | { readonly outcome: "error"; readonly reason: string; readonly diagnostics: readonly string[] };

export function useResearchScreen(sessionId: string): UseResearchScreenReturn {
  const [state, setState] = useState<ResearchScreenState>({ kind: "idle", revision: 0 });
  const bridge = window.bluewave;
  const stateRef = useRef(state);
  stateRef.current = state;

  const reload = useCallback(async () => {
    setState((current) => researchBeginLoading(current));
    if (!bridge) {
      setState((current) => researchLoadFailure(current, "Bluewave bridge not available"));
      return;
    }
    try {
      const result = await bridge.campaign.execute("inspectResearchScreen", sessionId);
      if (result.outcome !== "success") {
        setState((current) =>
          researchLoadFailure(
            current,
            result.outcome === "rejected"
              ? `${result.reason}: ${result.diagnostics.join("; ")}`
              : result.reason,
          ),
        );
        return;
      }
      setState((current) => researchLoadSuccess(current, result.value));
    } catch (error) {
      setState((current) =>
        researchLoadFailure(
          current,
          `TRANSPORT_FAILURE: ${error instanceof Error ? error.message : "unknown transport error"}`,
        ),
      );
    }
  }, [bridge, sessionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // A stale-revision rejection (REVISION_MISMATCH with a currentRevision from
  // the engine) must refresh the projection before the player retries.
  useEffect(() => {
    if (state.kind === "rejected-with-revision") void reload();
  }, [state.kind, reload]);

  const setFieldWeight = useCallback((fieldId: string, weight: 1 | 2 | 4) => {
    setState((current) => {
      if (
        current.kind !== "loaded" &&
        current.kind !== "submitted" &&
        current.kind !== "rejected-with-revision"
      ) {
        return current;
      }
      return { ...current, draft: setDraftWeight(current.draft, fieldId, weight), notice: null };
    });
  }, []);

  const submit = useCallback(() => {
    const current = stateRef.current;
    if (
      current.kind !== "loaded" &&
      current.kind !== "submitted" &&
      current.kind !== "rejected-with-revision"
    )
      return;
    if (!bridge || !draftIsSubmittable(current.draft)) return;
    const expectedRevision = current.revision;
    const transportRequestId = createTransportRequestId();
    setState((prev) => researchBeginSubmit(prev, transportRequestId));
    void bridge.campaign
      .execute("setResearchPriorityCommand", {
        sessionId,
        expectedRevision,
        transportRequestId,
        fieldPriorities: draftToPriorities(current.draft),
      })
      .then((result) => {
        setState((prev) => applySubmitResult(prev, result));
      })
      .catch((error: unknown) => {
        setState((prev) =>
          researchTransportFailure(
            prev,
            error instanceof Error ? error.message : "unknown transport error",
          ),
        );
      });
  }, [bridge, sessionId]);

  const canSubmit = state.kind === "loaded" && draftIsSubmittable(state.draft);

  return { state, setFieldWeight, submit, reload, canSubmit };
}

function applySubmitResult(state: ResearchScreenState, result: SubmitResult): ResearchScreenState {
  if (result.outcome === "success") return researchSubmitSuccess(state, result.value);
  if (result.outcome === "rejected") {
    return researchSubmitRejected(state, {
      reason: result.reason,
      diagnostics: result.diagnostics,
      currentRevision: result.currentRevision,
    });
  }
  return researchTransportFailure(state, `${result.reason}: ${result.diagnostics.join("; ")}`);
}
