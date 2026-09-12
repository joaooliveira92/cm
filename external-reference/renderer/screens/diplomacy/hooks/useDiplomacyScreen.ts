import { useCallback, useEffect, useRef, useState } from "react";

import type { DiplomacyCommandOutcome } from "../../../../shared/diplomacy-contract.js";
import type { DiplomacyScreenState } from "../diplomacy-screen-state.js";
import {
  diplomacyBeginAction,
  diplomacyBeginLoading,
  diplomacyBeginPeace,
  diplomacyBeginSubmit,
  diplomacyClearDraft,
  diplomacyDraftToCommand,
  diplomacyLoadFailure,
  diplomacyLoadSuccess,
  diplomacySetBlockadeArea,
  diplomacySubmitRejected,
  diplomacySubmitSuccess,
  diplomacyTransportFailure,
  type DiplomacyActionKind,
} from "../diplomacy-screen-state.js";

export interface UseDiplomacyScreenReturn {
  readonly state: DiplomacyScreenState;
  readonly setRowAction: (partnerNationId: string, kind: DiplomacyActionKind) => void;
  readonly setPeaceAction: (warId: string) => void;
  readonly setBlockadeArea: (areaId: string) => void;
  readonly clearDraft: () => void;
  readonly submit: () => void;
  readonly reload: () => Promise<void>;
  readonly canSubmit: boolean;
}

let transportCounter = 0;

/** Renderer-side transport identity for the optimistic-concurrency flow
 * (`expectedRevision` / `transportRequestId` triple). Generated here, outside
 * the pure reducer; retries of the same prepared request replay the same id. */
function createTransportRequestId(): string {
  transportCounter++;
  return `diplo-${Date.now().toString(36)}-${transportCounter}`;
}

type SubmitResult =
  | {
      readonly outcome: "success";
      readonly value: DiplomacyCommandOutcome;
      readonly diagnostics: readonly string[];
    }
  | {
      readonly outcome: "rejected";
      readonly reason: string;
      readonly diagnostics: readonly string[];
      readonly currentRevision?: number;
    }
  | { readonly outcome: "error"; readonly reason: string; readonly diagnostics: readonly string[] };

export function useDiplomacyScreen(sessionId: string): UseDiplomacyScreenReturn {
  const [state, setState] = useState<DiplomacyScreenState>({ kind: "idle", revision: 0 });
  const bridge = window.bluewave;
  const stateRef = useRef(state);
  stateRef.current = state;

  const reload = useCallback(async () => {
    setState((current) => diplomacyBeginLoading(current));
    if (!bridge) {
      setState((current) => diplomacyLoadFailure(current, "Bluewave bridge not available"));
      return;
    }
    try {
      const result = await bridge.campaign.execute("inspectDiplomacyScreen", sessionId);
      if (result.outcome !== "success") {
        setState((current) =>
          diplomacyLoadFailure(
            current,
            result.outcome === "rejected"
              ? `${result.reason}: ${result.diagnostics.join("; ")}`
              : result.reason,
          ),
        );
        return;
      }
      setState((current) => diplomacyLoadSuccess(current, result.value));
    } catch (error) {
      setState((current) =>
        diplomacyLoadFailure(
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

  const setRowAction = useCallback((partnerNationId: string, kind: DiplomacyActionKind) => {
    setState((current) => diplomacyBeginAction(current, partnerNationId, kind));
  }, []);

  const setPeaceAction = useCallback((warId: string) => {
    setState((current) => {
      if (current.kind !== "loaded" && current.kind !== "submitted") return current;
      const war = current.projection.wars.find((w) => w.warId === warId);
      if (!war) return current;
      return diplomacyBeginPeace(current, war);
    });
  }, []);

  const setBlockadeArea = useCallback((areaId: string) => {
    setState((current) => diplomacySetBlockadeArea(current, areaId));
  }, []);

  const clearDraft = useCallback(() => {
    setState((current) => diplomacyClearDraft(current));
  }, []);

  const submit = useCallback(() => {
    const current = stateRef.current;
    if (current.kind !== "loaded" && current.kind !== "submitted") return;
    const draft = current.draftCommand;
    if (!draft || !bridge) return;
    const command = diplomacyDraftToCommand(draft);
    if (command === null) return;
    const expectedRevision = current.revision;
    const transportRequestId = createTransportRequestId();
    setState((prev) => diplomacyBeginSubmit(prev, transportRequestId));
    void bridge.campaign
      .execute("submitDiplomacyCommand", {
        sessionId,
        expectedRevision,
        transportRequestId,
        command,
      })
      .then((result) => {
        setState((prev) => applySubmitResult(prev, result));
      })
      .catch((error: unknown) => {
        setState((prev) =>
          diplomacyTransportFailure(
            prev,
            error instanceof Error ? error.message : "unknown transport error",
          ),
        );
      });
  }, [bridge, sessionId]);

  const canSubmit =
    state.kind === "loaded" &&
    state.draftCommand !== null &&
    diplomacyDraftToCommand(state.draftCommand) !== null;

  return {
    state,
    setRowAction,
    setPeaceAction,
    setBlockadeArea,
    clearDraft,
    submit,
    reload,
    canSubmit,
  };
}

function applySubmitResult(
  state: DiplomacyScreenState,
  result: SubmitResult,
): DiplomacyScreenState {
  if (result.outcome === "success") return diplomacySubmitSuccess(state, result.value);
  if (result.outcome === "rejected") {
    return diplomacySubmitRejected(state, {
      reason: result.reason,
      diagnostics: result.diagnostics,
      currentRevision: result.currentRevision,
    });
  }
  return diplomacyTransportFailure(state, `${result.reason}: ${result.diagnostics.join("; ")}`);
}
